import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const missingVars = [];

if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
if (!supabaseServiceRoleKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');

export const supabaseServiceConfigError = missingVars.length
    ? `Missing required environment variable(s): ${missingVars.join(', ')}`
    : null;

function createErrorClient(message) {
    const result = { data: null, error: { message } };
    let proxy = null;
    const callable = function () {
        return proxy;
    };

    proxy = new Proxy(callable, {
        get(_target, prop) {
            if (prop === 'then') {
                return (resolve) => resolve(result);
            }
            if (prop === 'catch') {
                return (reject) => Promise.resolve(result).catch(reject);
            }
            if (prop === 'finally') {
                return (onFinally) => Promise.resolve(result).finally(onFinally);
            }
            return proxy;
        },
        apply() {
            return proxy;
        },
    });

    return proxy;
}

export const supabaseService = supabaseServiceConfigError
    ? createErrorClient(supabaseServiceConfigError)
    : createClient(
          supabaseUrl,
          supabaseServiceRoleKey,
          { auth: { autoRefreshToken: false, persistSession: false } }
      );
