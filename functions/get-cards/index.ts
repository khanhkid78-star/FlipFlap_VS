import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const setId = url.searchParams.get("setId");
    const deckId = url.searchParams.get("deckId");
    const userId = url.searchParams.get("userId");
    const status = url.searchParams.get("status");

    let query = supabaseAdmin
      .from("cards")
      .select("*")
      .order("created_at", { ascending: true });

    if (setId) query = query.eq("set_id", setId);
    if (deckId) query = query.eq("deck_id", deckId);
    if (userId) query = query.eq("user_id", userId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({ cards: data, total: data?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});