FROM node:20-alpine

WORKDIR /app

# Install Chromium and dependencies for Puppeteer, and qpdf for PDF encryption
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    qpdf \
    python3 \
    make \
    g++

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./
RUN npm install --production

COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server.js"]
