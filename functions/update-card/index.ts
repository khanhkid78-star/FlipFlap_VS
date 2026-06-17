import "@supabase/functions-js/edge-runtime.d.ts"
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

    const { cardId, isCorrect } = await req.json();

    if (!cardId) {
      return new Response(
        JSON.stringify({ error: "Card ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();

    const { data: card, error: fetchError } = await supabaseAdmin
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (fetchError || !card) {
      return new Response(
        JSON.stringify({ error: "Card not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let newStatus = card.status;
    const newReviewCount = (card.review_count || 0) + 1;
    const newCorrectCount = isCorrect ? (card.correct_count || 0) + 1 : (card.correct_count || 0);
    const newIncorrectCount = isCorrect ? (card.incorrect_count || 0) : (card.incorrect_count || 0) + 1;
    let nextReviewAt = now;

    if (isCorrect) {
      const intervals = [1, 3, 7, 14, 30];
      const currentInterval = Math.min(newCorrectCount - 1, intervals.length - 1);
      const daysToAdd = intervals[currentInterval];
      nextReviewAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      if (newCorrectCount >= 3) {
        newStatus = "mastered";
      }
    } else {
      nextReviewAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
      newStatus = "learning";
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("cards")
      .update({
        status: newStatus,
        review_count: newReviewCount,
        correct_count: newCorrectCount,
        incorrect_count: newIncorrectCount,
        last_reviewed_at: now,
        next_review_at: nextReviewAt,
        mastered_at: newStatus === "mastered"
          ? (card.mastered_at ?? now)
          : null,
      })
      .eq("id", cardId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ card: updated, message: "Card updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});