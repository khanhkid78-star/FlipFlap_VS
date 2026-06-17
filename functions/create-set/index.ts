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

    const { userId, folderId, deckId, name, description, color, icon } = await req.json();

    if (!userId || !folderId || !deckId) {
      return new Response(
        JSON.stringify({ error: "User ID, Folder ID, and Deck ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!name || name.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Set name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("sets")
      .insert({
        user_id: userId,
        folder_id: folderId,
        deck_id: deckId,
        name: name.trim(),
        description: description || "",
        color: color || "#994700",
        icon: icon || "style",
        status: "learning",
        card_count: 0,
        mastery_percentage: 0,
        sort_order: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ id: data.id, set: data, message: "Set created successfully" }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});