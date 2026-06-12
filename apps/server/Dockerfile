# Production image for @sitetwo/server.
#
# IMPORTANT: build with the REPO ROOT as context (the compose file does this),
# because the server lives in an npm-workspaces monorepo and dependency
# resolution needs the root package.json + lockfile:
#
#   docker build -f apps/server/Dockerfile .
#
# Two stages: "build" compiles TypeScript with dev dependencies installed;
# "runtime" carries only production dependencies, the compiled dist/, and the
# OpenAPI spec.

# ---------------------------------------------------------------- build ----
FROM node:24-alpine AS build
WORKDIR /repo

# Install with only the package manifests present so this layer is cached
# until a dependency actually changes. Every workspace manifest must be
# present for `npm ci` to validate the lockfile.
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/design-system/package.json packages/design-system/
RUN npm ci --workspace @sitetwo/server --include-workspace-root

COPY tsconfig.base.json ./
COPY apps/server/tsconfig.json apps/server/
COPY apps/server/src apps/server/src
RUN npm run build --workspace @sitetwo/server

# -------------------------------------------------------------- runtime ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/design-system/package.json packages/design-system/
RUN npm ci --workspace @sitetwo/server --omit=dev

COPY --from=build /repo/apps/server/dist apps/server/dist
# The spec is read at runtime and served at /docs; it lives next to dist/
# at the same relative depth as in the source tree (see plugins/openapi.ts).
COPY apps/server/openapi apps/server/openapi

# Inside a container the server must bind to all interfaces, not loopback.
ENV HOST=0.0.0.0
ENV PORT=3001
EXPOSE 3001

USER node
CMD ["node", "apps/server/dist/server.js"]
