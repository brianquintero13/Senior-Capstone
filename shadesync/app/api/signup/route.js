import { supabaseService } from "@/lib/supabaseService";
import { saveUserSettings } from "@/lib/databaseSettingsStore";

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

        // Create user settings in database
        try {
            const userId = data.user.id;
            await saveUserSettings(userId, {
                profile: { name: fullName },
                system: { serialNumber: "", zipCode: "" }
            });
            console.log("User settings created in database for:", userId);
        } catch (settingsError) {
            console.error("Failed to create user settings:", settingsError);
            // Don't fail signup if settings creation fails, but log it
        }

        return new Response(JSON.stringify({ ok: true, userId: data.user.id }), { status: 200 });
    } catch (err) {
        console.error("Signup error:", err);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
}
