-- Create shade_states table for tracking shade position state
CREATE TABLE IF NOT EXISTS shade_states (
  id INTEGER PRIMARY KEY DEFAULT 1,
  state TEXT NOT NULL CHECK (state IN ('open', 'closed', 'unknown')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default state (closed) if table is empty
INSERT INTO shade_states (id, state) 
SELECT 1, 'closed' 
WHERE NOT EXISTS (SELECT 1 FROM shade_states WHERE id = 1);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shade_states_id ON shade_states(id);
