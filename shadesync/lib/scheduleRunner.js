import { supabaseService } from "./supabaseService";
import { motorController } from "./motorController";
import { getResolvedDeviceMode, saveDeviceMode } from "./deviceModeStore";
import { shadeStateManager, SHADE_STATES } from "./shadeStateManager";

const RUN_INTERVAL_MS = 15000;
const EXECUTION_KEY_TTL_MS = 48 * 60 * 60 * 1000;

const DAY_ALIASES = {
  mon: "Mon",
  monday: "Mon",
  tue: "Tue",
  tues: "Tue",
  tuesday: "Tue",
  wed: "Wed",
  wednesday: "Wed",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  thursday: "Thu",
  fri: "Fri",
  friday: "Fri",
  sat: "Sat",
  saturday: "Sat",
  sun: "Sun",
  sunday: "Sun",
};

const globalKey = "__shadeSyncScheduleRunner";
if (!global[globalKey]) {
  global[globalKey] = {
    inFlight: false,
    lastTickAt: 0,
    recentExecutionKeys: new Map(),
    recentEvents: [],
    eventSeq: 0,
    daemonTimer: null,
  };
}

const state = global[globalKey];
const MAX_RECENT_EVENTS = 300;

function normalizeDay(day) {
  return DAY_ALIASES[String(day || "").trim().toLowerCase()] || null;
}

function formatNowInTimezone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "UTC",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value;
  return {
    weekday: normalizeDay(part("weekday")),
    hhmm: `${part("hour")}:${part("minute")}`,
    dateKey: `${part("year")}-${part("month")}-${part("day")}`,
  };
}

function getEntryClock(entry, now) {
  const timeZone = entry?.timezone || "UTC";
  try {
    return { ...formatNowInTimezone(now, timeZone), timeZone };
  } catch {
    return { ...formatNowInTimezone(now, "UTC"), timeZone: "UTC" };
  }
}

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseStartHhmm(startTime) {
  return String(startTime || "").slice(0, 5);
}

function buildExecutionKey(deviceId, scheduleId, action, startTime, timeZone, dateKey) {
  return `${deviceId}|${scheduleId}|${action}|${startTime}|${timeZone}|${dateKey}`;
}

function cleanupRecentKeys(nowMs) {
  for (const [key, timestamp] of state.recentExecutionKeys.entries()) {
    if (nowMs - timestamp > EXECUTION_KEY_TTL_MS) {
      state.recentExecutionKeys.delete(key);
    }
  }
}

function wasRecentlyHandled(key) {
  return state.recentExecutionKeys.has(key);
}

function markHandled(key) {
  state.recentExecutionKeys.set(key, Date.now());
}

function log(msg) {
  console.log(`[scheduler] ${msg}`);
}

function appendScheduleEvent(event) {
  state.eventSeq += 1;
  state.recentEvents.push({
    seq: state.eventSeq,
    at: new Date().toISOString(),
    ...event,
  });
  if (state.recentEvents.length > MAX_RECENT_EVENTS) {
    state.recentEvents.splice(0, state.recentEvents.length - MAX_RECENT_EVENTS);
  }
}

function emitScheduleEvent(event) {
  appendScheduleEvent(event);
}

async function resolveEffectiveMode(deviceRow) {
  const deviceId = deviceRow?.id;
  let mode = deviceRow?.mode || null;
  let manualExpiresAt = deviceRow?.manual_expires_at || null;

  const storedMode = getResolvedDeviceMode(deviceId);
  if (mode) {
    saveDeviceMode(deviceId, mode, manualExpiresAt);
  } else if (storedMode?.mode) {
    mode = storedMode.mode;
    manualExpiresAt = storedMode.manual_expires_at || null;
  }

  const expiresAt = manualExpiresAt || storedMode?.manual_expires_at;
  const hasExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
  const baseMode = mode || storedMode?.mode || "auto";
  const effectiveMode =
    !hasExpired && baseMode === "manual" && Boolean(expiresAt)
      ? "manual"
      : "auto";
  if (hasExpired) {
    saveDeviceMode(deviceId, "auto", null);
  }
  return effectiveMode;
}

async function executeScheduledAction({ device, scheduleId, entry, now, trigger }) {
  const action = String(entry?.action || "").toLowerCase();
  if (!["open", "close"].includes(action)) {
    return;
  }

  const { weekday, hhmm, dateKey, timeZone } = getEntryClock(entry, now);
  const scheduledDay = normalizeDay(entry?.day_of_week);
  const scheduledHhmm = parseStartHhmm(entry?.start_time);
  if (!weekday || !scheduledDay || weekday !== scheduledDay || hhmm !== scheduledHhmm) {
    return;
  }

  const key = buildExecutionKey(device.id, scheduleId, action, scheduledHhmm, timeZone, dateKey);
  if (wasRecentlyHandled(key)) {
    return;
  }

  markHandled(key);

  try {
    // Force a fresh read before safety checks so we don't skip due to stale cache.
    shadeStateManager.clearCache();
    const currentState = await shadeStateManager.getCurrentState();
    if (currentState === SHADE_STATES.UNKNOWN) {
      const reason = "Shade state unknown (safety skip)";
      log(`SKIP device=${device.id} action=${action} reason="${reason}"`);
      emitScheduleEvent({ ownerId: device.owner_id, deviceId: device.id, outcome: "skip", action, reason, trigger });
      return;
    }
    if (action === "open" && currentState === SHADE_STATES.OPEN) {
      const reason = "Shades already open (scheduler pre-check)";
      log(`SKIP device=${device.id} action=${action} reason="${reason}"`);
      emitScheduleEvent({ ownerId: device.owner_id, deviceId: device.id, outcome: "skip", action, reason, trigger });
      return;
    }
    if (action === "close" && currentState === SHADE_STATES.CLOSED) {
      const reason = "Shades already closed (scheduler pre-check)";
      log(`SKIP device=${device.id} action=${action} reason="${reason}"`);
      emitScheduleEvent({ ownerId: device.owner_id, deviceId: device.id, outcome: "skip", action, reason, trigger });
      return;
    }

    log(
      `EXECUTE device=${device.id} action=${action} at=${scheduledDay} ${scheduledHhmm} tz=${timeZone} triggerDate=${dateKey}`
    );
    emitScheduleEvent({
      ownerId: device.owner_id,
      deviceId: device.id,
      outcome: "execute",
      action,
      scheduledDay,
      scheduledTime: scheduledHhmm,
      timeZone,
      trigger,
    });
    await motorController.sendCommand(action);

    const nowIso = new Date().toISOString();
    await supabaseService.from("device_commands").insert({
      device_id: device.id,
      action,
      created_at: nowIso,
    });
    await supabaseService.from("manual_commands").insert({
      device_id: device.id,
      user_id: device.owner_id,
      command: action,
      status: "sent",
      metadata: { source: "schedule", modeAtCommand: "auto" },
    });
  } catch (err) {
    const code = err?.code || "UNKNOWN";
    const message = err?.message || "Unknown scheduler error";
    if (code === "REDUNDANT_OPERATION") {
      log(`SKIP device=${device.id} action=${action} reason="${message}"`);
      emitScheduleEvent({ ownerId: device.owner_id, deviceId: device.id, outcome: "skip", action, reason: message, trigger });
      return;
    }
    if (code === "BUSY") {
      const reason = "Motor busy";
      log(`SKIP device=${device.id} action=${action} reason="${reason}"`);
      emitScheduleEvent({ ownerId: device.owner_id, deviceId: device.id, outcome: "skip", action, reason, trigger });
      return;
    }
    log(`ERROR device=${device.id} action=${action} code=${code} message="${message}"`);
    emitScheduleEvent({
      ownerId: device.owner_id,
      deviceId: device.id,
      outcome: "skip",
      action,
      reason: `Error: ${message}`,
      trigger,
    });
  }
}

function isEntryDueNow(entry, now) {
  const action = String(entry?.action || "").toLowerCase();
  if (!["open", "close"].includes(action)) {
    return false;
  }
  const { weekday, hhmm } = getEntryClock(entry, now);
  const scheduledDay = normalizeDay(entry?.day_of_week);
  const scheduledHhmm = parseStartHhmm(entry?.start_time);
  return Boolean(weekday && scheduledDay && weekday === scheduledDay && hhmm === scheduledHhmm);
}

async function runScheduleTick(trigger = "unknown") {
  const now = new Date();
  const nowMs = now.getTime();
  cleanupRecentKeys(nowMs);

  let devices = null;
  let devicesErr = null;

  const primaryDevicesResult = await supabaseService
    .from("devices")
    .select('id, owner_id, "mode", manual_expires_at');

  devices = primaryDevicesResult?.data || null;
  devicesErr = primaryDevicesResult?.error || null;

  if (devicesErr) {
    const errMsg = String(devicesErr.message || "").toLowerCase();
    const schemaMissing =
      errMsg.includes("'mode' column") ||
      errMsg.includes("manual_expires_at") ||
      errMsg.includes("within group is required for ordered-set aggregate mode");

    if (schemaMissing) {
      const fallbackDevicesResult = await supabaseService
        .from("devices")
        .select("id, owner_id");
      devices = fallbackDevicesResult?.data || null;
      devicesErr = fallbackDevicesResult?.error || null;
    }
  }

  if (devicesErr) {
    log(`ERROR loading devices: ${devicesErr.message}`);
    return;
  }
  if (!devices?.length) {
    return;
  }

  for (const device of devices) {
    const { data: schedule, error: scheduleErr } = await supabaseService
      .from("schedules")
      .select("id, enabled")
      .eq("device_id", device.id)
      .maybeSingle();

    if (scheduleErr) {
      log(`ERROR device=${device.id} loading schedule: ${scheduleErr.message}`);
      continue;
    }
    if (!schedule?.id || !schedule.enabled) {
      continue;
    }

    const todayUtc = getTodayUtcDate();
    const { data: override, error: overrideErr } = await supabaseService
      .from("schedule_overrides")
      .select("type, expires_at")
      .eq("device_id", device.id)
      .eq("date", todayUtc)
      .maybeSingle();

    if (overrideErr) {
      log(`ERROR device=${device.id} loading overrides: ${overrideErr.message}`);
      continue;
    }
    if (override?.type === "skip") {
      const expiresAtMs = override.expires_at ? new Date(override.expires_at).getTime() : Number.POSITIVE_INFINITY;
      if (Date.now() <= expiresAtMs) {
        log(`SKIP device=${device.id} reason="Schedule override skip for ${todayUtc}"`);
        continue;
      }
    }

    const { data: entries, error: entriesErr } = await supabaseService
      .from("schedule_entries")
      .select("day_of_week, start_time, timezone, action, enabled")
      .eq("schedule_id", schedule.id)
      .eq("enabled", true);

    if (entriesErr) {
      log(`ERROR device=${device.id} loading schedule entries: ${entriesErr.message}`);
      continue;
    }

    const dueEntries = (entries || []).filter((entry) => isEntryDueNow(entry, now));
    if (!dueEntries.length) {
      continue;
    }

    const effectiveMode = await resolveEffectiveMode(device);
    if (effectiveMode === "manual") {
      const dueActions = dueEntries.map((entry) => entry.action).join(",");
      log(`SKIP device=${device.id} reason="Manual mode active" trigger=${trigger} dueActions=${dueActions}`);
      for (const entry of dueEntries) {
        const action = String(entry?.action || "").toLowerCase();
        if (["open", "close"].includes(action)) {
          emitScheduleEvent({
            ownerId: device.owner_id,
            deviceId: device.id,
            outcome: "skip",
            action,
            reason: "Manual mode active",
            trigger,
          });
        }
      }
      continue;
    }

    for (const entry of dueEntries) {
      await executeScheduledAction({ device, scheduleId: schedule.id, entry, now, trigger });
    }
  }
}

export async function maybeRunScheduleTick({ trigger = "manual" } = {}) {
  const now = Date.now();
  if (state.inFlight) return false;
  if (now - state.lastTickAt < RUN_INTERVAL_MS - 1000) return false;

  state.inFlight = true;
  state.lastTickAt = now;
  try {
    await runScheduleTick(trigger);
    return true;
  } finally {
    state.inFlight = false;
  }
}

export function ensureScheduleDaemonStarted() {
  if (state.daemonTimer) {
    return;
  }
  state.daemonTimer = setInterval(() => {
    maybeRunScheduleTick({ trigger: "daemon" }).catch((err) => {
      log(`ERROR daemon tick failed: ${err?.message || String(err)}`);
    });
  }, RUN_INTERVAL_MS);
  if (typeof state.daemonTimer.unref === "function") {
    state.daemonTimer.unref();
  }
  log(`Daemon started (interval=${RUN_INTERVAL_MS}ms)`);
}

export function getLatestScheduleEventSeq() {
  return state.eventSeq || 0;
}

export function getScheduleEventsSince(seq = 0, { ownerId } = {}) {
  const minSeq = Number(seq) || 0;
  return state.recentEvents.filter((event) => event.seq > minSeq && (!ownerId || event.ownerId === ownerId));
}
