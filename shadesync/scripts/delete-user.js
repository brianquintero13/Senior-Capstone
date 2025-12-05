/**
 * Delete a Supabase auth user by ID using the service role key.
 * Usage:
 * SUPABASE_URL="https://your-project.supabase.co" \
 * SUPABASE_SERVICE_ROLE_KEY="service-key" \
 * USER_ID="user-uuid" \
 * node scripts/delete-user.js
 */
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.USER_ID;

if (!supabaseUrl || !serviceRoleKey || !userId) {
    console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or USER_ID env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const run = async () => {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
    console.log("Deleted user:", userId);
};

run().catch((err) => {
    console.error("Failed to delete user:", err.message);
    process.exit(1);
});
