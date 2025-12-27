FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache python3 make g++
RUN npm install --production

COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "server.js"]
