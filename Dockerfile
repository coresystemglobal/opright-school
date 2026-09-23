FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=staging

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]