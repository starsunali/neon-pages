# ---------- Stage 1: build ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Install argon2 native build deps on Alpine
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY . .

RUN npx prisma generate
RUN npm run build

# ---------- Stage 2: production ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p uploads/qr && chown -R app:app /app

USER app

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]