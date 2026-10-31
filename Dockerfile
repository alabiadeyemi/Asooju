# Coolify: one container = SPA (dist/) + /api (platform AI, Stripe, admin)
# Build pack = Dockerfile · Port = 3000 (Coolify sets PORT)
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite bakes VITE_* at build time — set these as Coolify build-time env/args
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_APP_URL
ARG VITE_PREVIEW_V2
ARG VITE_BUILD_VERIFY_BUNDLER
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_APP_URL=$VITE_APP_URL \
    VITE_PREVIEW_V2=$VITE_PREVIEW_V2 \
    VITE_BUILD_VERIFY_BUNDLER=$VITE_BUILD_VERIFY_BUNDLER

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    SERVE_STATIC=1 \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/api ./api
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/tsconfig.app.json ./tsconfig.app.json

EXPOSE 3000
# Coolify may set PORT=80; listen uses process.env.PORT.
CMD ["node", "--import", "tsx", "scripts/api-server.ts", "--static"]
