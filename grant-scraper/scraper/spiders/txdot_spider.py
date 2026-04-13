import scrapy
from bs4 import BeautifulSoup
from scraper.items import GrantItem

class TxdotSpider(scrapy.Spider):
    name = "txdot_grants"
    allowed_domains = ["txdot.gov"]
    start_urls = ["https://www.txdot.gov/business/grants-and-funding.html"]

    def parse(self, response):
        """
        Parses the main index page to find links to specific grants.
        """
        self.logger.info(f"🕷️ Crawling main page: {response.url}")

        # The TxDOT site structure varies, so we look for links that seem to point to grants
        # or inside main content blocks representing funding programs.
        
        # Get all links in the main content area (heuristically looking for "grant" or "funding" keywords)
        links = response.css('a::attr(href)').getall()
        grant_links = []
        
        for link in links:
            lower_link = link.lower()
            # Filter criteria: must be an internal link or explicitly contain target words
            if 'grant' in lower_link or 'funding' in lower_link or '/business/' in lower_link:
                if link.endswith('.pdf'):
                    continue # handled inside details pages
                full_url = response.urljoin(link)
                if full_url not in grant_links and full_url != response.url:
                    grant_links.append(full_url)

        self.logger.info(f"🔗 Found {len(grant_links)} potential grant links to crawl.")

        for grant_url in grant_links:
            yield scrapy.Request(url=grant_url, callback=self.parse_grant_detail)
            
    def parse_grant_detail(self, response):
        """
        Extracts raw content from individual grant pages for the NLP pipeline.
        """
        self.logger.info(f"📄 Scraping details: {response.url}")
        
        # Extract the page title
        title_raw = response.css('title::text').get(default='').strip()
        if not title_raw:
            title_raw = response.css('h1::text').get(default='').strip()

        # Extract all text content using BeautifulSoup to strip script/style tags cleanly
        soup = BeautifulSoup(response.body, 'html.parser')
        
        # Remove unwanted elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        # Get remaining text
        html_content = soup.get_text(separator=' ', strip=True)
        
        # Find PDF links (often containing NOFA, application guidelines, or previous recipients)
        pdf_links = []
        for a_tag in response.css('a::attr(href)').getall():
            if a_tag.lower().endswith('.pdf'):
                pdf_links.append(response.urljoin(a_tag))
                
        # Yield the raw item to the Pipeline where AI extraction happens
        item = GrantItem()
        item['url'] = response.url
        item['spider_name'] = self.name
        item['title_raw'] = title_raw
        item['html_content'] = html_content
        item['pdf_links'] = pdf_links
        
        yield item
