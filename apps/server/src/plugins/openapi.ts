import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyPluginAsync } from 'fastify';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the hand-written OpenAPI spec.
 *
 * Resolved relative to this module so it works both when running the
 * TypeScript source (`src/plugins/` via tsx) and the compiled output
 * (`dist/plugins/`) — both sit exactly two levels below the package root,
 * where `openapi/openapi.yaml` lives.
 */
const SPEC_PATH = fileURLToPath(new URL('../../openapi/openapi.yaml', import.meta.url));

/**
 * Serves the API documentation.
 *
 * `openapi/openapi.yaml` is the source of truth for the API contract; this
 * plugin loads it in *static* mode (nothing is generated from code) and
 * exposes:
 *
 * - `GET /docs`      — interactive Swagger UI
 * - `GET /docs/yaml` — the raw spec, for codegen or import into API clients
 * - `GET /docs/json` — the spec converted to JSON
 */
export const openapiPlugin: FastifyPluginAsync = async (app) => {
  await app.register(swagger, {
    mode: 'static',
    specification: {
      path: SPEC_PATH,
      baseDir: dirname(SPEC_PATH),
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
};
