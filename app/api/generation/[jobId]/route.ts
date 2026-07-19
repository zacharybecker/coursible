// Generation-job status polling. The wizard polls this every couple of
// seconds; as a plain route handler it rides its own HTTP request instead of
// queueing behind the client's other Server Actions (Next dispatches those
// sequentially per client), so polling never blocks real navigation/writes.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGenerationJobView } from "@/lib/generation/jobs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const { jobId } = await params;
  const view = await getGenerationJobView(db, session.user.id, jobId);
  if (!view) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(view);
}
