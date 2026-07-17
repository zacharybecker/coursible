// Neon Postgres via the serverless driver. The Pool (WebSocket) variant is
// used because completeActivity needs interactive transactions, which the
// stateless HTTP driver doesn't support. Node 22+ and Vercel both provide a
// global WebSocket, so no ws polyfill is needed.

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });

/** Structural type both the Neon client and the PGlite test client satisfy. */
export type Db = Pick<typeof db, "select" | "insert" | "update" | "delete" | "query" | "transaction">;
