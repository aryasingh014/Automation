const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
  console.log("Starting stream request...");
  try {
    const stream = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Say hello in 5 words' }],
      model: 'llama-3.3-70b-versatile',
      stream: true,
    });
    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content || '');
    }
    console.log("\nFinished successfully.");
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
