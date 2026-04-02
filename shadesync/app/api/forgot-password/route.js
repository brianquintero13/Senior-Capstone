import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(req) {
  const { email } = await req.json().catch(() => ({}));

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const origin = process.env.NEXTAUTH_URL || req.nextUrl.origin;
  const redirectTo = `${origin}/reset-password`;
  
  console.log("Sending password reset email to:", email);
  console.log("Redirect URL:", redirectTo);
  
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    
    if (error) {
      console.error("Supabase password reset error:", error);
      return NextResponse.json({ 
        error: error.message || "Failed to send password reset email" 
      }, { status: 400 });
    }
    
    console.log("Password reset email sent successfully:", data);
    return NextResponse.json({ ok: true, message: "Password reset email sent" }, { status: 200 });
    
  } catch (err) {
    console.error("Password reset error:", err);
    return NextResponse.json({ 
      error: "Failed to send password reset email" 
    }, { status: 500 });
  }
}
