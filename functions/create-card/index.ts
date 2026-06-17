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

    const { userId, setId, folderId, deckId, question, answer, image_url, difficulty_level } = await req.json();

    if (!userId || !setId || !folderId || !deckId) {
      return new Response(
        JSON.stringify({ error: "User ID, Set ID, Folder ID, and Deck ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!question || question.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!answer || answer.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Answer is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("cards")
      .insert({
        user_id: userId,
        set_id: setId,
        folder_id: folderId,
        deck_id: deckId,
        question: question.trim(),
        answer: answer.trim(),
        image_url: image_url || null,
        difficulty_level: difficulty_level || 1,
        status: "learning",
        review_count: 0,
        correct_count: 0,
        incorrect_count: 0,
        is_starred: false,
        sort_order: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ id: data.id, card: data, message: "Card created successfully" }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});