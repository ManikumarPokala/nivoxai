# ======================
# Build stage
# ======================
FROM node:22-alpine AS builder
WORKDIR /app

# ---- Build-time args (from docker-compose) ----
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_ANALYTICS_URL

# ---- Expose them to Next.js build ----
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_ANALYTICS_URL=${NEXT_PUBLIC_ANALYTICS_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ======================
# Runtime stage
# ======================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

RUN npm install --omit=dev

EXPOSE 3000
CMD ["npm", "run", "start"]
