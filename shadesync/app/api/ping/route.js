import { NextResponse } from "next/server";
import { supabaseService, supabaseServiceConfigError } from "@/lib/supabaseService";

export async function GET() {
    if (supabaseServiceConfigError) {
        return NextResponse.json({ ok: false, error: supabaseServiceConfigError }, { status: 503 });
    }

    const { data, error } = await supabaseService.from("user_settings").select("*").limit(1);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rowCount: data.length }, { status: 200 });
}
