import { supabaseService } from "./supabaseService.js";

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
    manualOperationCount: 0,
    lastManualOperationAt: null,
  },
  system: {
    serialNumber: "",
    zipCode: "",
  },
};

export async function getUserSettings(userId) {
  try {
    const { data, error } = await supabaseService
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // No settings exist, return defaults
      return defaultSettings;
    }

    if (error) {
      console.error("Error fetching user settings:", error);
      return defaultSettings;
    }

    // Merge with defaults to ensure all fields exist
    return {
      profile: { ...defaultSettings.profile, ...data.profile },
      notifications: { ...defaultSettings.notifications, ...data.notifications },
      automation: { ...defaultSettings.automation, ...data.automation },
      appearance: { ...defaultSettings.appearance, ...data.appearance },
      meta: { ...defaultSettings.meta, ...data.meta },
      system: { ...defaultSettings.system, ...data.system },
    };
  } catch (err) {
    console.error("Database error fetching user settings:", err);
    return defaultSettings;
  }
}

export async function saveUserSettings(userId, partial) {
  try {
    // Get current settings first
    const current = await getUserSettings(userId);
    
    // Merge with partial updates
    const merged = {
      profile: { ...current.profile, ...partial.profile },
      notifications: { ...current.notifications, ...partial.notifications },
      automation: { ...current.automation, ...partial.automation },
      appearance: { ...current.appearance, ...partial.appearance },
      meta: { ...current.meta, ...partial.meta },
      system: { ...current.system, ...partial.system },
    };

    const { data, error } = await supabaseService
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          ...merged,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving user settings:", error);
      throw error;
    }

    return merged;
  } catch (err) {
    console.error("Database error saving user settings:", err);
    throw err;
  }
}

export async function getUserProfile(userId) {
  const settings = await getUserSettings(userId);
  return settings.profile;
}

export async function saveUserProfile(userId, partial) {
  return await saveUserSettings(userId, { profile: partial });
}

export async function setPasswordResetMeta(userId) {
  try {
    const current = await getUserSettings(userId);
    const meta = { 
      ...current.meta, 
      lastPasswordResetAt: new Date().toISOString() 
    };
    
    await saveUserSettings(userId, { meta });
    return meta;
  } catch (err) {
    console.error("Error setting password reset meta:", err);
    throw err;
  }
}

export async function incrementManualOperationCount(userId) {
  try {
    const current = await getUserSettings(userId);
    const currentCount = Number(current?.meta?.manualOperationCount || 0);
    const meta = {
      ...current.meta,
      manualOperationCount: Number.isFinite(currentCount) ? currentCount + 1 : 1,
      lastManualOperationAt: new Date().toISOString(),
    };

    await saveUserSettings(userId, { meta });
    return meta;
  } catch (err) {
    console.error("Error incrementing manual operation count:", err);
    throw err;
  }
}
