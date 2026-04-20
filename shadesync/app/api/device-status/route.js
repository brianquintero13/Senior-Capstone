import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { motorController } from "@/lib/motorController";
import {
  ensureScheduleDaemonStarted,
  maybeRunScheduleTick,
  getLatestScheduleEventSeq,
  getScheduleEventsSince,
} from "@/lib/scheduleRunner";

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
  let schedulerFlush = null;
  let lastScheduleEventSeq = getLatestScheduleEventSeq();

  const stream = new ReadableStream({
    start(controller) {
      const sendStatus = (snapshot) => {
        controller.enqueue(encoder.encode(toSseEvent("status", snapshot)));
      };
      const sendSchedulerEvents = () => {
        const events = getScheduleEventsSince(lastScheduleEventSeq, { ownerId: session.user.id });
        for (const event of events) {
          controller.enqueue(encoder.encode(toSseEvent("scheduler", event)));
        }
        if (events.length > 0) {
          lastScheduleEventSeq = events[events.length - 1].seq;
        }
      };

      sendStatus(motorController.getSnapshot());
      sendSchedulerEvents();
      const onStatus = (snapshot) => sendStatus(snapshot);
      motorController.on("status", onStatus);
      unsubscribe = () => {
        motorController.off("status", onStatus);
      };

      schedulerFlush = setInterval(() => {
        sendSchedulerEvents();
      }, 2000);

      heartbeat = setInterval(async () => {
        controller.enqueue(encoder.encode(": ping\n\n"));
        try {
          await maybeRunScheduleTick({ trigger: "device-status-heartbeat" });
        } catch (err) {
          console.error(`[scheduler] ERROR heartbeat tick failed: ${err?.message || String(err)}`);
        }
        sendSchedulerEvents();
      }, 15000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (heartbeat) clearInterval(heartbeat);
      if (schedulerFlush) clearInterval(schedulerFlush);
    },
  });

  req.signal.addEventListener("abort", () => {
    if (unsubscribe) unsubscribe();
    if (heartbeat) clearInterval(heartbeat);
    if (schedulerFlush) clearInterval(schedulerFlush);
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
