/**
 * Schemas shared across route groups.
 *
 * `errorSchema` is registered once on the Fastify instance (see `buildApp`)
 * via `app.addSchema`, which both wires it into AJV/serialization and lets
 * `@fastify/swagger` emit it as a single reusable `components/schemas`
 * entry. Routes reference it with {@link errorRef} so every documented error
 * response points at the same definition instead of inlining a copy.
 */

/** The standard error envelope returned by every non-2xx response. */
export const errorSchema = {
  $id: 'ErrorResponse',
  type: 'object',
  required: ['statusCode', 'error', 'message'],
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
} as const;

/** `$ref` to {@link errorSchema} for use in route `response` maps. */
export const errorRef = { $ref: 'ErrorResponse#' } as const;
