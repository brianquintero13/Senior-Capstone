import fs from "fs";
import path from "path";

const dataPath = path.join(process.cwd(), "data", "settings.json");

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

const defaultSettings = {
  profile: {
    name: "",
  },
  notifications: {
    deviceAlerts: false,
    scheduleNotifications: false,
    automationUpdates: false,
    systemAnnouncements: false,
  },
  automation: {
    openingPosition: 75,
    sunlightSensitivity: "Medium",
  },
  appearance: {
    theme: "Light",
  },
  meta: {
    lastPasswordResetAt: null,
  },
  system: {
    serialNumber: "",
    zipCode: "",
  },
};

export function getUserSettings(email) {
  const all = readAll();
  return all[email] ?? defaultSettings;
}

export function saveUserSettings(email, partial) {
  const all = readAll();
  const current = all[email] ?? defaultSettings;
  const merged = {
    profile: { ...current.profile },
    notifications: { ...current.notifications, ...partial.notifications },
    automation: { ...current.automation, ...partial.automation },
    appearance: { ...current.appearance, ...partial.appearance },
    meta: { ...current.meta },
    system: { ...current.system, ...partial.system },
  };
  all[email] = merged;
  writeAll(all);
  return merged;
}

export function getUserProfile(email) {
  const all = readAll();
  const { profile } = all[email] ?? defaultSettings;
  return profile;
}

export function saveUserProfile(email, partial) {
  const all = readAll();
  const current = all[email] ?? defaultSettings;
  const profile = { ...current.profile, ...partial };
  all[email] = { ...current, profile };
  writeAll(all);
  return profile;
}

export function setPasswordResetMeta(email) {
  const all = readAll();
  const current = all[email] ?? defaultSettings;
  const meta = { ...current.meta, lastPasswordResetAt: new Date().toISOString() };
  all[email] = { ...current, meta };
  writeAll(all);
  return meta;
}
