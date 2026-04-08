import os
import pymongo
from datetime import datetime
from dotenv import load_dotenv
import uuid
import json
import google.generativeai as genai

# Load environment variables
load_dotenv()

class NLPDatabasePipeline:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self.client = None
        self.db = None
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        if self.gemini_key:
            genai.configure(api_key=self.gemini_key)
            self.model = genai.GenerativeModel('gemini-1.5-pro-latest')
        else:
            self.model = None

    def open_spider(self, spider):
        # Connect to MongoDB
        try:
            self.client = pymongo.MongoClient(self.db_url)
            # Extract database name from URL if possible, or fallback
            # mongodb://localhost:27017/grantfund
            db_name = self.db_url.split('/')[-1].split('?')[0] or 'grantfund'
            self.db = self.client[db_name]
            spider.logger.info(f"Connected to MongoDB database: {db_name}")
        except Exception as e:
            spider.logger.error(f"Database connection failed: {e}")

    def close_spider(self, spider):
        if self.client:
            self.client.close()

    def process_item(self, item, spider):
        # 1. AI Parsing Step 
        parsed_data = self._ai_parse_grant(item.get('title_raw', ''), item.get('html_content', ''), item.get('pdf_links', []), spider)
        
        # Inject the original URL
        if parsed_data:
            parsed_data['sourceUrl'] = item.get('url', '')

        spider.logger.info(f"🧠 AI Parsed Data for: {parsed_data.get('title', item.get('title_raw', 'Unknown'))}")

        # 2. Database Sync Step
        if parsed_data:
            self._upsert_grant(spider, parsed_data)

        return item

    def _ai_parse_grant(self, title_raw, html_content, pdf_links, spider):
        """
        Sends HTML content to Gemini API to extract structured fields based on the Data Presentation Prompt.
        """
        if not self.model:
            spider.logger.warning("No GEMINI_API_KEY found, using heuristic regex fallback data extraction")
            return self._heuristic_parse_grant(title_raw, html_content)

        prompt = f"""
You are a data presentation assistant for a grants dashboard.

You will receive already structured grant data or raw HTML context. Your job is to enhance it for UI display without changing factual meaning.

RAW DATA / CONTEXT:
Title: {title_raw}
Content: {html_content[:3500]}

Return ONLY JSON in this format:
{{
  "title": "Clean readable title",
  "agency": "Agency name",
  "amount": {{
    "raw": 100000,
    "currency": "USD",
    "formatted": "$100,000"
  }},
  "timeline": {{
    "start": "2026-06-01",
    "end": "2027-06-01",
    "daysLeft": 365,
    "status": "Active"
  }},
  "summary": "Short 2-line summary of the grant",
  "highlights": [
    "Key benefit or feature",
    "Funding opportunity detail"
  ],
  "eligibilityShort": [
    "Concise bullet points"
  ],
  "previousRecipientsFormatted": [
    "Recipient Name (Year if known)"
  ],
  "uiMeta": {{
    "priority": "high",
    "badgeColor": "green",
    "category": "Transportation"
  }}
}}

Rules:
- Do NOT hallucinate unknown data
- Infer status from dates
- Keep text concise and UI-friendly
- Ensure output is strictly JSON and parsable
"""
        try:
            response = self.model.generate_content(prompt)
            # Find JSON block
            text = response.text
            start = text.find('{')
            end = text.rfind('}') + 1
            if start != -1 and end != -1:
                return json.loads(text[start:end])
            else:
                spider.logger.error("Failed to parse JSON from AI response")
                return self._heuristic_parse_grant(title_raw, html_content)
        except Exception as e:
            spider.logger.error(f"AI Parsing Error: {e}")
            return self._heuristic_parse_grant(title_raw, html_content)

    def _heuristic_parse_grant(self, title_raw, html_content):
        import re
        
        title = title_raw.replace(" | TxDOT", "").replace("TxDOT ", "").strip()
        amount_raw = 0
        formatted_amount = "Varies"
        
        money_matches = re.findall(r'\$\s*([\d,]+(?:\.\d{2})?(?:\s*[mM]illion|\s*[bB]illion|\s*[kK])?)', html_content)
        if money_matches:
            match_str = money_matches[0]
            formatted_amount = f"${match_str}"
            clean_str = match_str.lower().replace(',', '').replace(' ', '')
            try:
                base_num = float(re.sub(r'[^\d.]', '', clean_str))
                if 'm' in clean_str:
                    amount_raw = base_num * 1000000
                elif 'b' in clean_str:
                    amount_raw = base_num * 1000000000
                elif 'k' in clean_str:
                    amount_raw = base_num * 1000
                else:
                    amount_raw = base_num
            except Exception:
                pass

        summary_raw = re.sub(r'\s+', ' ', html_content).strip()
        summary = (summary_raw[:200] + "...") if len(summary_raw) > 200 else (summary_raw or f"TxDOT Grant/Funding Opportunity for {title}")

        return {
            "title": f"TxDOT {title}",
            "agency": "Texas Department of Transportation",
            "amount": {"raw": amount_raw, "currency": "USD", "formatted": formatted_amount},
            "timeline": {"start": "2025-01-01", "end": "2028-01-01", "daysLeft": 365, "status": "Active"},
            "summary": summary,
            "highlights": ["Extracted from TxDOT Website"],
            "eligibilityShort": ["Please view full details on TxDOT portal"],
            "previousRecipientsFormatted": [],
            "uiMeta": {"priority": "medium", "badgeColor": "blue", "category": "General Transportation"}
        }

    def _upsert_grant(self, spider, data):
        try:
            now = datetime.now()

            # Date fallback parsing
            try:
                start_str = data.get('timeline', {}).get('start', '')[:10]
                end_str = data.get('timeline', {}).get('end', '')[:10]
                start_date = datetime.strptime(start_str, '%Y-%m-%d') if len(start_str) == 10 else now
                end_date = datetime.strptime(end_str, '%Y-%m-%d') if len(end_str) == 10 else now
            except:
                start_date, end_date = now, now

            amt_raw = data.get('amount', {}).get('raw')
            amt_raw = amt_raw if amt_raw is not None else 0

            # Find or create admin user ID for createdBy
            admin = self.db.users.find_one({"role": "admin"})
            admin_id = admin['id'] if admin else str(uuid.uuid4())

            grant_doc = {
                "title": data['title'],
                "agency": data['agency'],
                "amount": amt_raw,
                "currency": data['amount']['currency'],
                "startDate": start_date,
                "endDate": end_date,
                "purpose": data['summary'],
                "status": data['timeline']['status'],
                "summary": data['summary'],
                "highlights": data.get('highlights', []),
                "eligibilityShort": data.get('eligibilityShort', []),
                "previousRecipientsFormatted": data.get('previousRecipientsFormatted', []),
                "uiMeta": data.get('uiMeta', {}),
                "sourceUrl": data.get('sourceUrl', ''),
                "updatedAt": now
            }

            # Upsert by title
            existing = self.db.grants.find_one({"title": data['title']})
            if existing:
                self.db.grants.update_one(
                    {"id": existing['id']},
                    {"$set": grant_doc}
                )
                spider.logger.info(f"🔄 Updated grant: {data['title']}")
            else:
                grant_doc["id"] = str(uuid.uuid4())
                grant_doc["createdBy"] = admin_id
                grant_doc["createdAt"] = now
                self.db.grants.insert_one(grant_doc)
                spider.logger.info(f"➕ Inserted grant: {data['title']}")
                
        except Exception as e:
             spider.logger.error(f"❌ DB Sync Error: {e}")
