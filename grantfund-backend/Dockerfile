FROM node:20-alpine

WORKDIR /app

# Install Python and required packages for scraper
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --break-system-packages scrapy pymongo python-dotenv beautifulsoup4 requests google-generativeai

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]