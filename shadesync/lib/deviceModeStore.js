import fs from "fs";
import path from "path";

const dataPath = path.join(process.cwd(), "data", "deviceModes.json");

function ensureFile() {
  const dir = path.dirname(dataPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dataPath)) fs.writeFileSync(dataPath, JSON.stringify({}), "utf8");
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

function writeAll(all) {
  ensureFile();
  fs.writeFileSync(dataPath, JSON.stringify(all, null, 2), "utf8");
}

export function saveDeviceMode(deviceId, mode, manualExpiresAt = null) {
  if (!deviceId) return { mode: mode || "auto", manual_expires_at: manualExpiresAt || null };
  const all = readAll();
  all[deviceId] = {
    mode: mode || "auto",
    manual_expires_at: manualExpiresAt || null,
  };
  writeAll(all);
  return all[deviceId];
}

export function getDeviceMode(deviceId) {
  if (!deviceId) return { mode: "auto", manual_expires_at: null };
  const all = readAll();
  return all[deviceId];
}

export function getResolvedDeviceMode(deviceId) {
  const stored = getDeviceMode(deviceId);
  if (!stored) return { mode: "auto", manual_expires_at: null };

  if (stored.manual_expires_at) {
    const expires = new Date(stored.manual_expires_at);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) {
      return saveDeviceMode(deviceId, "auto", null);
    }
  }

  return stored;
}
