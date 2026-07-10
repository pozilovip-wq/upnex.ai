FROM node:22-alpine
WORKDIR /app
COPY bot/package*.json ./
RUN npm install
COPY bot/ .
CMD ["npx", "tsx", "src/index.ts"]
