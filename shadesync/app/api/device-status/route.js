import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { motorController } from "@/lib/motorController";
import { ensureScheduleDaemonStarted, maybeRunScheduleTick } from "@/lib/scheduleRunner";

export const runtime = "nodejs";

function toSseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  ensureScheduleDaemonStarted();
  maybeRunScheduleTick({ trigger: "device-status-connect" }).catch((err) => {
    console.error(`[scheduler] ERROR initial tick failed: ${err?.message || String(err)}`);
  });

  const encoder = new TextEncoder();
  let unsubscribe = null;
  let heartbeat = null;

  const stream = new ReadableStream({
    start(controller) {
      const sendStatus = (snapshot) => {
        controller.enqueue(encoder.encode(toSseEvent("status", snapshot)));
      };

      sendStatus(motorController.getSnapshot());
      const onStatus = (snapshot) => sendStatus(snapshot);
      motorController.on("status", onStatus);
      unsubscribe = () => {
        motorController.off("status", onStatus);
      };

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
        maybeRunScheduleTick({ trigger: "device-status-heartbeat" }).catch((err) => {
          console.error(`[scheduler] ERROR heartbeat tick failed: ${err?.message || String(err)}`);
        });
      }, 15000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  req.signal.addEventListener("abort", () => {
    if (unsubscribe) unsubscribe();
    if (heartbeat) clearInterval(heartbeat);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
