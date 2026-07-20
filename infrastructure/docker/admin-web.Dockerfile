# syntax=docker/dockerfile:1.7
FROM node:22.17.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/config/package.json packages/config/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM dependencies AS build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WEBSOCKET_URL
ARG NEXT_PUBLIC_APP_NAME="Tournament Platform"
ARG NEXT_PUBLIC_PRIMARY_COLOR="#174A7E"
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WEBSOCKET_URL=$NEXT_PUBLIC_WEBSOCKET_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_PRIMARY_COLOR=$NEXT_PUBLIC_PRIMARY_COLOR
COPY tsconfig.base.json eslint.config.mjs ./
COPY packages packages
COPY apps/admin-web apps/admin-web
RUN pnpm --filter @tournament/admin-web... build

FROM node:22.17.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 10001 nextjs && useradd --system --uid 10001 --gid nextjs nextjs
COPY --from=build --chown=nextjs:nextjs /workspace/apps/admin-web/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /workspace/apps/admin-web/.next/static ./apps/admin-web/.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/admin-web/server.js"]
