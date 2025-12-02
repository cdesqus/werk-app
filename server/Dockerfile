FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server.js"]
