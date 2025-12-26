FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_PUBLIC_AI_BASE_URL=/ai

RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_PUBLIC_AI_BASE_URL=/ai


COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]
