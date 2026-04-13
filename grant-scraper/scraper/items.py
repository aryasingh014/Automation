import scrapy

class GrantItem(scrapy.Item):
    # Raw extracted data
    url = scrapy.Field()
    spider_name = scrapy.Field()
    title_raw = scrapy.Field()
    html_content = scrapy.Field()
    pdf_links = scrapy.Field()

    # Processed fields (Done in pipeline by AI)
    title = scrapy.Field()
    agency = scrapy.Field()
    amount = scrapy.Field()
    startDate = scrapy.Field()
    endDate = scrapy.Field()
    purpose = scrapy.Field()
    status = scrapy.Field()
