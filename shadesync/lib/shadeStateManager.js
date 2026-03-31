import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SHADE_STATES = {
  OPEN: 'open',
  CLOSED: 'closed',
  UNKNOWN: 'unknown'
};

class ShadeStateManager {
  constructor() {
    this.cachedState = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 30000; // 30 seconds
  }

  async getCurrentState() {
    // Check cache first
    if (this.cachedState && this.cacheExpiry && Date.now() < this.cacheExpiry) {
      return this.cachedState;
    }

    try {
      const { data, error } = await supabase
        .from('shade_states')
        .select('state')
        .eq('id', 1)
        .single();

      if (error && error.code === 'PGRST116') {
        // No record exists, create default state (closed)
        await this.setState(SHADE_STATES.CLOSED);
        return SHADE_STATES.CLOSED;
      }

      if (error) {
        console.error('Error fetching shade state:', error);
        return SHADE_STATES.UNKNOWN;
      }

      this.cachedState = data.state;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      return data.state;

    } catch (err) {
      console.error('Database error:', err);
      return SHADE_STATES.UNKNOWN;
    }
  }

  async setState(newState) {
    try {
      const { error } = await supabase
        .from('shade_states')
        .upsert(
          { 
            id: 1, 
            state: newState, 
            updated_at: new Date().toISOString() 
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Error setting shade state:', error);
        return false;
      }

      // Update cache
      this.cachedState = newState;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      return true;

    } catch (err) {
      console.error('Database error:', err);
      return false;
    }
  }

  async canPerformOperation(operation) {
    const currentState = await this.getCurrentState();
    
    if (currentState === SHADE_STATES.UNKNOWN) {
      return { canPerform: true, reason: null };
    }

    if (operation === 'open' && currentState === SHADE_STATES.OPEN) {
      return { 
        canPerform: false, 
        reason: 'Shades are already open' 
      };
    }

    if (operation === 'close' && currentState === SHADE_STATES.CLOSED) {
      return { 
        canPerform: false, 
        reason: 'Shades are already closed' 
      };
    }

    return { canPerform: true, reason: null };
  }

  clearCache() {
    this.cachedState = null;
    this.cacheExpiry = null;
  }
}

export const shadeStateManager = new ShadeStateManager();
export { SHADE_STATES };
