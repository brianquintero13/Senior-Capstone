import { supabaseService } from "@/lib/supabaseService";

export async function POST(req) {
    try {
        const { email, password, fullName } = await req.json();
        console.log("Signup request:", { email, fullName });
        
        const { data, error } = await supabaseService.auth.admin.createUser({
            email,
            password,
            user_metadata: { fullName },
            email_confirm: true,
        });
        
        console.log("Supabase response:", { data, error });
        
        if (error) {
            console.error("Supabase error:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
        }

    // Temporarily skip user_settings for testing
    // const userId = data.user.id;
    // const { error: settingsError } = await supabaseService
    //     .from("user_settings")
    //     .upsert({ user_id: userId, profile_name: fullName });

    // if (settingsError) {
    //     return new Response(
    //         JSON.stringify({ error: settingsError.message || "Failed to save settings" }),
    //         { status: 400 },
    //     );
    // }

    return new Response(JSON.stringify({ ok: true, userId: data.user.id }), { status: 200 });
    } catch (err) {
        console.error("Signup error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}
