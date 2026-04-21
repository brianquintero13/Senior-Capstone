-- Add missing columns to existing user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS profile JSONB DEFAULT '{"name":""}'::jsonb;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{"deviceAlerts":false,"scheduleNotifications":false,"automationUpdates":false,"systemAnnouncements":false}'::jsonb;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS automation JSONB DEFAULT '{"openingPosition":75,"sunlightSensitivity":"Medium"}'::jsonb;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{"lastPasswordResetAt":null,"manualOperationCount":0,"lastManualOperationAt":null}'::jsonb;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS system JSONB DEFAULT '{"serialNumber":"","zipCode":""}'::jsonb;

-- Add missing timestamp columns if they don't exist
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

-- Create policy to allow users to read their own settings
CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own settings
CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);
