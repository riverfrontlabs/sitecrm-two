# Intelligence API — uses Microsoft's official Playwright image so Chromium and
# all its OS-level dependencies are pre-installed.
#
# Build with the REPO ROOT as context (the compose file does this):
#
#   docker build -f apps/intelligence/Dockerfile .

# ---------------------------------------------------------------- build ----
FROM mcr.microsoft.com/playwright:v1.49.1-noble AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/intelligence/package.json apps/intelligence/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/builder/package.json apps/builder/
COPY packages/types/package.json packages/types/
COPY packages/design-system/package.json packages/design-system/
COPY packages/site-templates/package.json packages/site-templates/
RUN npm ci --workspace @sitecrm/intelligence --include-workspace-root

COPY tsconfig.base.json ./
COPY apps/intelligence/tsconfig.json apps/intelligence/
COPY apps/intelligence/src apps/intelligence/src
COPY packages/types/src packages/types/src
RUN npm run build --workspace @sitecrm/intelligence

# -------------------------------------------------------------- runtime ----
FROM mcr.microsoft.com/playwright:v1.49.1-noble AS runtime
ENV NODE_ENV=production
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/intelligence/package.json apps/intelligence/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/builder/package.json apps/builder/
COPY packages/types/package.json packages/types/
COPY packages/design-system/package.json packages/design-system/
COPY packages/site-templates/package.json packages/site-templates/
RUN npm ci --workspace @sitecrm/intelligence --omit=dev

COPY --from=build /repo/apps/intelligence/dist apps/intelligence/dist
COPY apps/intelligence/openapi apps/intelligence/openapi

ENV HOST=0.0.0.0
ENV PORT=3001
EXPOSE 3001

CMD ["node", "apps/intelligence/dist/server.js"]
