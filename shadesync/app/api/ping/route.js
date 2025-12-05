import { supabaseService } from '@/lib/supabaseService';

export async function GET() {
    const {data, error} = await supabaseService.from("user_settings").select("*").limit(1);
    if (error) return new Response(JSON.stringify({ ok: false, error: error.message}), { status: 500});
    return new Response(JSON.stringify({ ok: true, rowCount: data.length}), { status: 200});
}