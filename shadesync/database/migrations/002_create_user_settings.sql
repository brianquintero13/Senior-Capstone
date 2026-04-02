-- Create user_settings table for storing user preferences and settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile JSONB DEFAULT '{"name": ""}',
  notifications JSONB DEFAULT '{"deviceAlerts": false, "scheduleNotifications": false, "automationUpdates": false, "systemAnnouncements": false}',
  automation JSONB DEFAULT '{"openingPosition": 75, "sunlightSensitivity": "Medium"}',
  appearance JSONB DEFAULT '{"theme": "Light"}',
  meta JSONB DEFAULT '{"lastPasswordResetAt": null}',
  system JSONB DEFAULT '{"serialNumber": "", "zipCode": ""}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to update their own settings
CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own settings
CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow service role to manage all settings
CREATE POLICY "Service role can manage all settings" ON user_settings
  FOR ALL USING (auth.role() = 'service_role');
