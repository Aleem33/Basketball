# syntax=docker/dockerfile:1.7
FROM node:22.17.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
WORKDIR /workspace

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/admin-web/package.json apps/admin-web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/config/package.json packages/config/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM dependencies AS build
COPY tsconfig.base.json eslint.config.mjs ./
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter @tournament/api prisma:generate && pnpm --filter @tournament/api... build

FROM node:22.17.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 10001 app && useradd --system --uid 10001 --gid app app
COPY --from=build --chown=app:app /workspace/node_modules ./node_modules
COPY --from=build --chown=app:app /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=app:app /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=app:app /workspace/apps/api/prisma ./apps/api/prisma
COPY --from=build --chown=app:app /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=app:app /workspace/packages ./packages
USER app
EXPOSE 4000
WORKDIR /app/apps/api
CMD ["node", "dist/src/main.js"]
