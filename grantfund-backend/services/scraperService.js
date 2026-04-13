// ============================================
// Scraper Service — Triggers the Python DB Sync
// ============================================

const { exec } = require('child_process');
const path = require('path');

const runPythonScraper = () => {
  return new Promise((resolve, reject) => {
    const scraperPath = path.join(__dirname, '../../grant-scraper');
    
    const command = `python3 sync_pipeline.py`;
    
    const dbUrl = process.env.DATABASE_URL || 'mongodb://mongodb:27017/grantfund';
    
    console.log(`[Scraper Service] Starting Python Scrapy Sync: ${command}`);
    console.log(`[Scraper Service] Using DATABASE_URL: ${dbUrl}`);
    console.log(`[Scraper Service] Scraper path: ${scraperPath}`);

    const childProcess = exec(command, { 
      cwd: scraperPath,
      env: { 
        ...process.env, 
        DATABASE_URL: dbUrl 
      }
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Scraper Service] Execution error: ${error.message}`);
        return reject(error);
      }
      
      console.log(`[Scraper Service] Output: \n${stdout}`);
      
      if (stderr) {
        console.warn(`[Scraper Service] Warnings/Logs: \n${stderr}`);
      }
      
      resolve(stdout);
    });
  });
};

module.exports = { runPythonScraper };
