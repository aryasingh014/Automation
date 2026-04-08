require('dotenv').config();
const connectDB = require('./config/database');
const { Grant, ComplianceCheckpoint } = require('./models');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Groq = require('groq-sdk');

async function test() {
  await connectDB();
  const grant = await Grant.findOne();
  if(!grant) {
    console.log("No grants found");
    process.exit(1);
  }
  const grantId = grant.id;
  console.log("Found Grant:", grant.title);
  
  const systemMsg = `You are a Grant Compliance Expert. Extract a checklist of EXACTLY what documents, milestones, or vendor checkpoints are required based on this grant's eligibility and purpose text.
    Return ONLY a JSON object with a "checkpoints" array. Structure:
    {
      "checkpoints": [
        { "title": "Short Document/Milestone Title", "description": "Specific details", "dueDate": "2026-06-01" }
      ]
    }
    Use dates around 1-3 months from now.
    
    Grant Purpose: ${grant.purpose}
    Grant Eligibility: ${grant.eligibilityShort?.join(', ') || 'Standard entity documents required'}`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    console.log("Requesting Groq...");
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: systemMsg }],
        model: 'llama-3.3-70b-versatile',
        response_format: { type: "json_object" }
      });

      console.log("Groq Response received.");
      const content = chatCompletion.choices[0]?.message?.content || '{"checkpoints":[]}';
      console.log("Raw JSON:", content);

      const parsed = JSON.parse(content);
      const items = parsed.checkpoints || [];

      const checkpoints = items.map(cp => {
         let finalDate = new Date(Date.now() + 30*24*60*60*1000);
         if (cp.dueDate) {
             const parsedDate = new Date(cp.dueDate);
             if (!isNaN(parsedDate.getTime())) {
                 finalDate = parsedDate;
             }
         }
         return {
          id: crypto.randomUUID(),
          grantId,
          title: cp.title || 'Required Document',
          description: cp.description || 'Provide necessary documentation.',
          dueDate: finalDate,
          status: 'Open'
        };
      });

      console.log("Parsed checkpoints:", checkpoints);
      
      if (checkpoints.length > 0) {
        await ComplianceCheckpoint.insertMany(checkpoints);
        console.log("Successfully inserted Checkpoints to DB.");
      } else {
        console.log("No checkpoints parsed.");
      }
    } catch(e) {
      console.error("Test Error:", e);
    }
    process.exit(0);
}
test();
