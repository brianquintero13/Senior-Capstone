import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = process.env.USER_ID; // set this in your shell

const run = async () => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
  console.log("Deleted", userId);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
