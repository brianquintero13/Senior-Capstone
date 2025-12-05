import { supabaseService } from "@/lib/supabaseService";

export async function POST(req) {
    const { email, password, fullName } = await req.json();
    const { data, error } = await supabaseService.auth.admin.createUser({
        email,
        password,
        user_metadata: { fullName },
        email_confirm: true, // can change to false
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

    const userId = data.user.id;
    const { error: settingsError } = await supabaseService
        .from("user_settings")
        .upsert({ user_id: userId, profile_name: fullName });

    if (settingsError) {
        return new Response(
            JSON.stringify({ error: settingsError.message || "Failed to save settings" }),
            { status: 400 },
        );
    }

    return new Response(JSON.stringify({ ok: true, userId }), { status: 200 });
}
