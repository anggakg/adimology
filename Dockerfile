# ── Stage 1: Install ALL dependencies (including devDeps for build) ───────────
FROM node:20-alpine AS deps-all
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Install only production dependencies ─────────────────────────────
FROM node:20-alpine AS deps-prod
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 3: Build Next.js ────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all deps (including devDeps) for build
COPY --from=deps-all /app/node_modules ./node_modules
COPY . .

# Build the app (standalone mode for smaller image)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 4: Production runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
