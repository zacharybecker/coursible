// Seeds the starter-course catalog into course_content. Idempotent: safe to
// re-run against dev or prod. Run with: npm run db:seed

import "dotenv/config";
import { eq } from "drizzle-orm";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/lib/db/schema";
import { seedStarterCourses } from "@/lib/data/seed-content";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env or the environment.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  await seedStarterCourses(db);

  const starters = await db
    .select({ contentId: schema.courseContent.contentId, title: schema.courseContent.title })
    .from(schema.courseContent)
    .where(eq(schema.courseContent.isStarter, true));
  console.log(`Starter catalog seeded (${starters.length} courses):`);
  for (const c of starters) console.log(`  - ${c.title} (${c.contentId})`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
