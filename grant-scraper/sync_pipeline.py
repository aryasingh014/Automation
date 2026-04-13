import os
import sys
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from scraper.spiders.txdot_spider import TxdotSpider

def run_scraper():
    print("Starting TxDOT Scraper to Postgres Sync Pipeline...")
    
    # Check if DATABASE_URL is set in environment (used by pipeline)
    from dotenv import load_dotenv
    load_dotenv()
    if not os.getenv("DATABASE_URL"):
        print("Error: DATABASE_URL is missing from .env file.")
        sys.exit(1)

    # Setup Scrapy crawler settings
    os.environ['SCRAPY_SETTINGS_MODULE'] = 'scraper.settings'
    settings = get_project_settings()
    
    # Initialize and start the crawling process
    process = CrawlerProcess(settings)
    process.crawl(TxdotSpider)
    process.start()

    print("Sync Pipeline Completed.")

if __name__ == "__main__":
    run_scraper()
