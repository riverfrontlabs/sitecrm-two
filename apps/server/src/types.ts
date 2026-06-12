/**
 * Domain types for the API.
 *
 * These mirror `components/schemas` in `openapi/openapi.yaml` — that file is
 * the source of truth for the wire format. If a shape changes here, update
 * the spec (and the web client's types) in the same commit.
 */

/** Client-supplied fields for creating a project. Mirrors `NewProject` in the spec. */
export interface NewProject {
  /** Short display name. 1–120 characters. */
  title: string;
  /** What the project is and why it exists. 1–2000 characters. */
  description: string;
  /** Optional link to the live project or repository. */
  url?: string;
  /** Optional free-form labels (e.g. tech stack). At most 10. */
  tags?: string[];
}

/** A stored project. Mirrors `Project` in the spec. */
export interface Project extends NewProject {
  /** Server-assigned UUID. */
  id: string;
  /** Creation timestamp, ISO 8601 in UTC. */
  createdAt: string;
}
