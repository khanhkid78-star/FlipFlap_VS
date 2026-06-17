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

    const { userId, deckId, name, description, color, icon } = await req.json();

    if (!userId || !deckId) {
      return new Response(
        JSON.stringify({ error: "User ID and Deck ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!name || name.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Folder name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("folders")
      .insert({
        user_id: userId,
        deck_id: deckId,
        name: name.trim(),
        description: description || "",
        color: color || "#994700",
        icon: icon || "folder",
        sort_order: 0,
        set_count: 0,
        card_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ id: data.id, folder: data, message: "Folder created successfully" }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});