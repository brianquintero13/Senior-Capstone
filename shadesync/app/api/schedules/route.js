import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseService } from "@/lib/supabaseService";

const DAY_MAP = {
    M: "Mon",
    T: "Tue",
    W: "Wed",
    Th: "Thu",
    F: "Fri",
    Sa: "Sat",
    Su: "Sun",
};

const DAY_MAP_REVERSE = Object.fromEntries(Object.entries(DAY_MAP).map(([abbr, full]) => [full, abbr]));

async function getDeviceForUser(userId) {
    const { data: device, error } = await supabaseService
        .from("devices")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    if (!device) throw new Error("No device found for this user");
    return device;
}

async function getOrCreateSchedule(deviceId) {
    const { data: existingSchedule, error: scheduleError } = await supabaseService
        .from("schedules")
        .select("id, enabled")
        .eq("device_id", deviceId)
        .maybeSingle();

    if (scheduleError) throw new Error(scheduleError.message);

    if (existingSchedule?.id) {
        return existingSchedule;
    }

    const { data: inserted, error: insertError } = await supabaseService
        .from("schedules")
        .insert({ device_id: deviceId, name: "Default", enabled: true })
        .select("id, enabled")
        .single();
    if (insertError) throw new Error(insertError.message);
    return inserted;
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const device = await getDeviceForUser(session.user.id);
        const { data: scheduleRow, error: scheduleErr } = await supabaseService
            .from("schedules")
            .select("id, enabled, name")
            .eq("device_id", device.id)
            .maybeSingle();

        if (scheduleErr) {
            return Response.json({ error: scheduleErr.message }, { status: 400 });
        }
        if (!scheduleRow) {
            return Response.json({ schedule: null, entries: [] });
        }

        const { data: entries, error: entriesErr } = await supabaseService
            .from("schedule_entries")
            .select("day_of_week, start_time, timezone, action, enabled")
            .eq("schedule_id", scheduleRow.id);

        if (entriesErr) {
            return Response.json({ error: entriesErr.message }, { status: 400 });
        }

        const grouped = {};
        entries.forEach((row) => {
            const abbr = DAY_MAP_REVERSE[row.day_of_week];
            if (!abbr) return;
            grouped[abbr] = grouped[abbr] || {};
            if (row.action === "open") grouped[abbr].open = row.start_time;
            if (row.action === "close") grouped[abbr].close = row.start_time;
        });

        return Response.json({
            schedule: { id: scheduleRow.id, enabled: scheduleRow.enabled, name: scheduleRow.name },
            entries: grouped,
        });
    } catch (e) {
        return Response.json({ error: e.message || "Failed to load schedule" }, { status: 400 });
    }
}

export async function POST(req) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const schedule = body?.schedule;
    const timezone = body?.timezone || "UTC";

    if (!schedule || typeof schedule !== "object") {
        return Response.json({ error: "Missing schedule" }, { status: 400 });
    }

    try {
        const device = await getDeviceForUser(userId);
        const { id: scheduleId } = await getOrCreateSchedule(device.id);

        const entries = [];
        Object.entries(schedule || {}).forEach(([abbr, times]) => {
            const day = DAY_MAP[abbr];
            if (!day) return;
            if (times?.open) {
                entries.push({
                    schedule_id: scheduleId,
                    day_of_week: day,
                    start_time: times.open,
                    timezone,
                    action: "open",
                    enabled: true,
                });
            }
            if (times?.close) {
                entries.push({
                    schedule_id: scheduleId,
                    day_of_week: day,
                    start_time: times.close,
                    timezone,
                    action: "close",
                    enabled: true,
                });
            }
        });

        const { error: deleteError } = await supabaseService
            .from("schedule_entries")
            .delete()
            .eq("schedule_id", scheduleId);
        if (deleteError) {
            return Response.json({ error: deleteError.message }, { status: 400 });
        }

        if (entries.length) {
            const { error: insertEntriesError } = await supabaseService
                .from("schedule_entries")
                .insert(entries);
            if (insertEntriesError) {
                return Response.json({ error: insertEntriesError.message }, { status: 400 });
            }
        }

        return Response.json({ ok: true, scheduleId, entries: entries.length }, { status: 200 });
    } catch (e) {
        return Response.json({ error: e.message || "Failed to save schedule" }, { status: 400 });
    }
}

export async function PATCH(req) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { scope } = await req.json().catch(() => ({}));
    if (!["today", "all", "enable"].includes(scope)) {
        return Response.json({ error: "Invalid scope" }, { status: 400 });
    }

    try {
        const device = await getDeviceForUser(session.user.id);
        const schedule = await getOrCreateSchedule(device.id);

        if (scope === "all") {
            const { error } = await supabaseService
                .from("schedules")
                .update({ enabled: false })
                .eq("id", schedule.id);
            if (error) throw new Error(error.message);
            return Response.json({ ok: true, enabled: false });
        }

        if (scope === "enable") {
            const { error } = await supabaseService
                .from("schedules")
                .update({ enabled: true })
                .eq("id", schedule.id);
            if (error) throw new Error(error.message);
            await supabaseService
                .from("schedule_overrides")
                .delete()
                .eq("device_id", device.id)
                .gte("date", new Date().toISOString().slice(0, 10));
            return Response.json({ ok: true, enabled: true });
        }

        // scope === "today"
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
        const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59));

        const { error } = await supabaseService
            .from("schedule_overrides")
            .upsert({
                device_id: device.id,
                date: dateStr,
                type: "skip",
                expires_at: endOfDay.toISOString(),
            });
        if (error) throw new Error(error.message);

        return Response.json({ ok: true, scope: "today" });
    } catch (e) {
        return Response.json({ error: e.message || "Failed to update schedule state" }, { status: 400 });
    }
}
