FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN node db/seed.js
EXPOSE 3000
CMD ["node", "server.js"]
