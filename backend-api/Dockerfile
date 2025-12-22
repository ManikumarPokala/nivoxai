FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

ENV PORT=4000
ENV AI_SERVICE_URL=http://backend-ai:8000

EXPOSE 4000

CMD ["npm", "run", "start"]
