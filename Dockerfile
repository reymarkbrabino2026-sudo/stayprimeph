FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=postgresql://unused:unused@localhost:5432/unused?schema=public
ENV DIRECT_URL=postgresql://unused:unused@localhost:5432/unused?schema=public
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV AUTH_SECRET=build-time-placeholder-with-32-plus-characters
ENV PERSISTENCE_DRIVER=json
ENV STAYPRIMEPH_BUILD_PHASE=1
ENV PAYMENT_LAUNCH_MODE=disabled
ENV NEXT_PUBLIC_VERCEL_ANALYTICS=disabled
ENV STRIPE_SECRET_KEY=
ENV STRIPE_WEBHOOK_SECRET=
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RUN npx prisma generate && npm run build
ENV STAYPRIMEPH_BUILD_PHASE=

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
