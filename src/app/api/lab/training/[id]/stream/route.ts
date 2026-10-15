import { getTraining } from "@/lib/lab/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let closed = false;

      const send = async () => {
        const run = await getTraining(id);
        if (!run) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify({ error: "not_found" })}\n\n`));
          controller.close();
          closed = true;
          return true;
        }
        controller.enqueue(enc.encode(`data: ${JSON.stringify(run)}\n\n`));
        if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
          controller.close();
          closed = true;
          return true;
        }
        return false;
      };

      await send();
      const timer = setInterval(async () => {
        if (closed) {
          clearInterval(timer);
          return;
        }
        try {
          const done = await send();
          if (done) clearInterval(timer);
        } catch {
          clearInterval(timer);
          try {
            controller.close();
          } catch {
            /* ignore */
          }
        }
      }, 800);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
