import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const action = body.action;
    const userId = user.id;

    if (!action) {
      return json({ error: "Missing action" }, 400);
    }

    // ========================================================
    // USERS
    // ========================================================

    if (action === "ensureProfile") {
      const email = body.email || user.email;

      const username =
        body.username ||
        user.user_metadata?.username ||
        user.email?.split("@")[0] ||
        "Scholar";

      if (!email) {
        return json({ error: "Email is required" }, 400);
      }

      const { data: existingUser, error: selectError } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existingUser) {
        const { data, error } = await supabaseAdmin
          .from("users")
          .update({
            email,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId)
          .select()
          .single();

        if (error) throw error;

        return json({ user: data });
      }

      const { data, error } = await supabaseAdmin
        .from("users")
        .insert({
          id: userId,
          username,
          email,
          level: 1,
          xp: 0,
          study_streak: 0,
          total_cards_mastered: 0,
          total_study_hours: 0,
        })
        .select()
        .single();

      if (error) throw error;

      return json({ user: data });
  }

    if (action === "updateProfile") {
      const { username, avatar_url } = body;

      if (!username?.trim()) {
        return json({ error: "Username is required" }, 400);
      }

      const { data, error } = await supabaseAdmin
        .from("users")
        .update({
          username: username.trim(),
          avatar_url: avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) throw error;

      return json({ user: data });
    }

    // ========================================================
    // DECKS
    // ========================================================

    if (action === "listDecks") {
      const { data, error } = await supabaseAdmin
        .from("decks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return json({ decks: data || [] });
    }

    if (action === "createDeck") {
      const { name, description, color, icon, is_public } = body;

      if (!name?.trim()) {
        return json({ error: "Deck name is required" }, 400);
      }

      const { data, error } = await supabaseAdmin
        .from("decks")
        .insert({
          user_id: userId,
          name: name.trim(),
          description: description || "",
          color: color || "#994700",
          icon: icon || "menu_book",
          is_public: Boolean(is_public),
          is_favorite: false,
          folder_count: 0,
          set_count: 0,
          card_count: 0,
          mastery_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;

      await syncAchievements(supabaseAdmin, userId);

      return json({ deck: data }, 201);
    }

    if (action === "updateDeck") {
      const { deckId, name, description, color, icon, is_public, is_favorite } = body;

      if (!deckId) {
        return json({ error: "deckId is required" }, 400);
      }

      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) patch.name = String(name).trim();
      if (description !== undefined) patch.description = description || "";
      if (color !== undefined) patch.color = color || "#994700";
      if (icon !== undefined) patch.icon = icon || "menu_book";
      if (is_public !== undefined) patch.is_public = Boolean(is_public);
      if (is_favorite !== undefined) patch.is_favorite = Boolean(is_favorite);

      const { data, error } = await supabaseAdmin
        .from("decks")
        .update(patch)
        .eq("id", deckId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return json({ deck: data });
    }

    if (action === "deleteDeck") {
      const { deckId } = body;

      if (!deckId) {
        return json({ error: "deckId is required" }, 400);
      }

      await supabaseAdmin
        .from("cards")
        .delete()
        .eq("deck_id", deckId)
        .eq("user_id", userId);

      await supabaseAdmin
        .from("sets")
        .delete()
        .eq("deck_id", deckId)
        .eq("user_id", userId);

      await supabaseAdmin
        .from("folders")
        .delete()
        .eq("deck_id", deckId)
        .eq("user_id", userId);

      const { error } = await supabaseAdmin
        .from("decks")
        .delete()
        .eq("id", deckId)
        .eq("user_id", userId);

      if (error) throw error;

      await syncAchievements(supabaseAdmin, userId);

      return json({ message: "Deck deleted" });
    }

    if (action === "getDeckBundle") {
      const { deckId } = body;

      if (!deckId) {
        return json({ error: "deckId is required" }, 400);
      }

      const { data: deck, error: deckError } = await supabaseAdmin
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .eq("user_id", userId)
        .single();

      if (deckError) throw deckError;

      const { data: folders, error: folderError } = await supabaseAdmin
        .from("folders")
        .select("*")
        .eq("deck_id", deckId)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });

      if (folderError) throw folderError;

      const { data: sets, error: setError } = await supabaseAdmin
        .from("sets")
        .select("*")
        .eq("deck_id", deckId)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });

      if (setError) throw setError;

      return json({
        deck,
        folders: folders || [],
        sets: sets || [],
      });
    }

    // ========================================================
    // FOLDERS
    // ========================================================

    if (action === "createFolder") {
      const { deckId, name, description, color, icon } = body;

      if (!deckId) {
        return json({ error: "deckId is required" }, 400);
      }

      if (!name?.trim()) {
        return json({ error: "Folder name is required" }, 400);
      }

      await assertDeckOwner(supabaseAdmin, userId, deckId);

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

      await refreshDeckCounts(supabaseAdmin, userId, deckId);

      return json({ folder: data }, 201);
    }

    // ========================================================
    // SETS
    // ========================================================

    if (action === "createSet") {
      const { deckId, folderId, name, description, color, icon } = body;

      if (!deckId || !folderId) {
        return json({ error: "deckId and folderId are required" }, 400);
      }

      if (!name?.trim()) {
        return json({ error: "Set name is required" }, 400);
      }

      await assertDeckOwner(supabaseAdmin, userId, deckId);
      await assertFolderOwner(supabaseAdmin, userId, folderId, deckId);

      const { data, error } = await supabaseAdmin
        .from("sets")
        .insert({
          user_id: userId,
          deck_id: deckId,
          folder_id: folderId,
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

      await refreshDeckCounts(supabaseAdmin, userId, deckId);
      await refreshFolderCounts(supabaseAdmin, userId, folderId);

      return json({ set: data }, 201);
    }

    // ========================================================
    // CARDS
    // ========================================================

    if (action === "listCards") {
      const { setId } = body;

      if (!setId) {
        return json({ error: "setId is required" }, 400);
      }

      const { data, error } = await supabaseAdmin
        .from("cards")
        .select("*")
        .eq("set_id", setId)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      return json({
        cards: data || [],
        total: data?.length || 0,
      });
    }

    if (action === "createCard") {
      const {
        deckId,
        folderId,
        setId,
        question,
        answer,
        image_url,
        difficulty_level,
      } = body;

      if (!deckId || !folderId || !setId) {
        return json({ error: "deckId, folderId and setId are required" }, 400);
      }

      if (!question?.trim()) {
        return json({ error: "Question is required" }, 400);
      }

      if (!answer?.trim()) {
        return json({ error: "Answer is required" }, 400);
      }

      await assertDeckOwner(supabaseAdmin, userId, deckId);
      await assertFolderOwner(supabaseAdmin, userId, folderId, deckId);
      await assertSetOwner(supabaseAdmin, userId, setId, deckId, folderId);

      const { data, error } = await supabaseAdmin
        .from("cards")
        .insert({
          user_id: userId,
          deck_id: deckId,
          folder_id: folderId,
          set_id: setId,
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

      await refreshAllCounts(supabaseAdmin, userId, deckId, folderId, setId);
      await syncAchievements(supabaseAdmin, userId);

      return json({ card: data }, 201);
    }

    if (action === "updateCard") {
      const {
        cardId,
        question,
        answer,
        image_url,
        difficulty_level,
        is_starred,
      } = body;

      if (!cardId) {
        return json({ error: "cardId is required" }, 400);
      }

      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (question !== undefined) patch.question = String(question).trim();
      if (answer !== undefined) patch.answer = String(answer).trim();
      if (image_url !== undefined) patch.image_url = image_url || null;
      if (difficulty_level !== undefined) patch.difficulty_level = difficulty_level || 1;
      if (is_starred !== undefined) patch.is_starred = Boolean(is_starred);

      const { data, error } = await supabaseAdmin
        .from("cards")
        .update(patch)
        .eq("id", cardId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return json({ card: data });
    }

    if (action === "deleteCard") {
      const { cardId } = body;

      if (!cardId) {
        return json({ error: "cardId is required" }, 400);
      }

      const { data: card, error: cardError } = await supabaseAdmin
        .from("cards")
        .select("*")
        .eq("id", cardId)
        .eq("user_id", userId)
        .single();

      if (cardError) throw cardError;

      const { error } = await supabaseAdmin
        .from("cards")
        .delete()
        .eq("id", cardId)
        .eq("user_id", userId);

      if (error) throw error;

      await refreshAllCounts(
        supabaseAdmin,
        userId,
        card.deck_id,
        card.folder_id,
        card.set_id
      );

      await syncAchievements(supabaseAdmin, userId);

      return json({ message: "Card deleted" });
    }

    // ========================================================
    // STUDY
    // ========================================================

    if (action === "startStudy") {
    const { deckId, setId, folderId } = body;

    if (!deckId) {
      return json({ error: "deckId is required" }, 400);
    }

    await assertDeckOwner(supabaseAdmin, userId, deckId);

    let cardQuery = supabaseAdmin
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .eq("user_id", userId)
      .order("next_review_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });

    if (setId) {
      cardQuery = cardQuery.eq("set_id", setId);
    } else if (folderId) {
      await assertFolderOwner(supabaseAdmin, userId, folderId, deckId);
      cardQuery = cardQuery.eq("folder_id", folderId);
    }

    const { data: cards, error: cardError } = await cardQuery;

    if (cardError) throw cardError;

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("study_sessions")
      .insert({
        user_id: userId,
        deck_id: deckId,
        set_id: setId || null,
        cards_studied: 0,
        cards_correct: 0,
        cards_incorrect: 0,
        duration_seconds: 0,
        xp_earned: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    return json({
      session,
      cards: cards || [],
      });
    }

    if (action === "reviewCard") {
      const { cardId, isCorrect } = body;

      if (!cardId) {
        return json({ error: "cardId is required" }, 400);
      }

      const { data: card, error: fetchError } = await supabaseAdmin
        .from("cards")
        .select("*")
        .eq("id", cardId)
        .eq("user_id", userId)
        .single();

      if (fetchError) throw fetchError;

      const now = new Date();
      const currentCorrect = Number(card.correct_count || 0);
      const currentIncorrect = Number(card.incorrect_count || 0);
      const currentReview = Number(card.review_count || 0);

      const correctCount = isCorrect ? currentCorrect + 1 : currentCorrect;
      const incorrectCount = isCorrect ? currentIncorrect : currentIncorrect + 1;
      const reviewCount = currentReview + 1;

      let status = "learning";
      let nextDays = 1;

      if (isCorrect) {
        const intervals = [1, 3, 7, 14, 30];
        nextDays = intervals[Math.min(correctCount - 1, intervals.length - 1)];

        if (correctCount >= 3) {
          status = "mastered";
        } else {
          status = "reviewing";
        }
      }

      const nextReviewAt = new Date(
        now.getTime() + nextDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data, error } = await supabaseAdmin
        .from("cards")
        .update({
          status,
          review_count: reviewCount,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          last_reviewed_at: now.toISOString(),
          next_review_at: nextReviewAt,
          mastered_at: status === "mastered" ? now.toISOString() : card.mastered_at,
          updated_at: now.toISOString(),
        })
        .eq("id", cardId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      await refreshAllCounts(
        supabaseAdmin,
        userId,
        card.deck_id,
        card.folder_id,
        card.set_id
      );

      await syncAchievements(supabaseAdmin, userId);

      return json({ card: data });
    }

    if (action === "finishStudy") {
      const {
        sessionId,
        cardsStudied,
        cardsCorrect,
        cardsIncorrect,
        durationSeconds,
      } = body;

      if (!sessionId) {
        return json({ error: "sessionId is required" }, 400);
      }

      const xpEarned = Number(cardsCorrect || 0) * 10 + Number(cardsIncorrect || 0) * 2;

      const { data, error } = await supabaseAdmin
        .from("study_sessions")
        .update({
          cards_studied: cardsStudied || 0,
          cards_correct: cardsCorrect || 0,
          cards_incorrect: cardsIncorrect || 0,
          duration_seconds: durationSeconds || 0,
          xp_earned: xpEarned,
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (profile) {
        const newXp = Number(profile.xp || 0) + xpEarned;
        const newLevel = Math.floor(newXp / 500) + 1;

        await supabaseAdmin
          .from("users")
          .update({
            xp: newXp,
            level: newLevel,
            total_study_hours:
              Number(profile.total_study_hours || 0) + Number(durationSeconds || 0) / 3600,
            last_study_date: new Date().toISOString().slice(0, 10),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }

      await touchStudyTargets(supabaseAdmin, userId, data.deck_id, data.set_id);
      await syncAchievements(supabaseAdmin, userId);

      return json({
        session: data,
        xpEarned,
      });
    }

    if (action === "listRecent") {
      const { data, error } = await supabaseAdmin
        .from("study_sessions")
        .select("*, decks(name), sets(name)")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      return json({ sessions: data || [] });
    }

    // ========================================================
    // ACHIEVEMENTS
    // ========================================================

    if (action === "listAchievements") {
      const achievements = await syncAchievements(supabaseAdmin, userId);
      return json({ achievements });
    }

    // ========================================================
    // FOLDER UPDATE / DELETE
    // ========================================================

    if (action === "updateFolder") {
    const { folderId, name, description, color, icon } = body;

    if (!folderId) {
        return json({ error: "folderId is required" }, 400);
    }

    const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (name !== undefined) patch.name = String(name).trim();
    if (description !== undefined) patch.description = description || "";
    if (color !== undefined) patch.color = color || "#994700";
    if (icon !== undefined) patch.icon = icon || "folder";

    const { data, error } = await supabaseAdmin
        .from("folders")
        .update(patch)
        .eq("id", folderId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) throw error;

    await refreshDeckCounts(supabaseAdmin, userId, data.deck_id);

    return json({ folder: data });
    }

    if (action === "deleteFolder") {
    const { folderId } = body;

    if (!folderId) {
        return json({ error: "folderId is required" }, 400);
    }

    const { data: folder, error: folderError } = await supabaseAdmin
        .from("folders")
        .select("*")
        .eq("id", folderId)
        .eq("user_id", userId)
        .single();

    if (folderError) throw folderError;

    await supabaseAdmin
        .from("cards")
        .delete()
        .eq("folder_id", folderId)
        .eq("user_id", userId);

    await supabaseAdmin
        .from("sets")
        .delete()
        .eq("folder_id", folderId)
        .eq("user_id", userId);

    const { error } = await supabaseAdmin
        .from("folders")
        .delete()
        .eq("id", folderId)
        .eq("user_id", userId);

    if (error) throw error;

    await refreshDeckCounts(supabaseAdmin, userId, folder.deck_id);
    await syncAchievements(supabaseAdmin, userId);

    return json({ message: "Folder deleted" });
    }

    // ========================================================
    // SET UPDATE / DELETE
    // ========================================================

    if (action === "updateSet") {
    const { setId, name, description, color, icon } = body;

    if (!setId) {
        return json({ error: "setId is required" }, 400);
    }

    const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (name !== undefined) patch.name = String(name).trim();
    if (description !== undefined) patch.description = description || "";
    if (color !== undefined) patch.color = color || "#994700";
    if (icon !== undefined) patch.icon = icon || "style";

    const { data, error } = await supabaseAdmin
        .from("sets")
        .update(patch)
        .eq("id", setId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) throw error;

    await refreshDeckCounts(supabaseAdmin, userId, data.deck_id);
    await refreshFolderCounts(supabaseAdmin, userId, data.folder_id);

    return json({ set: data });
    }

    if (action === "deleteSet") {
    const { setId } = body;

    if (!setId) {
        return json({ error: "setId is required" }, 400);
    }

    const { data: set, error: setError } = await supabaseAdmin
        .from("sets")
        .select("*")
        .eq("id", setId)
        .eq("user_id", userId)
        .single();

    if (setError) throw setError;

    await supabaseAdmin
        .from("cards")
        .delete()
        .eq("set_id", setId)
        .eq("user_id", userId);

    const { error } = await supabaseAdmin
        .from("sets")
        .delete()
        .eq("id", setId)
        .eq("user_id", userId);

    if (error) throw error;

    await refreshDeckCounts(supabaseAdmin, userId, set.deck_id);
    await refreshFolderCounts(supabaseAdmin, userId, set.folder_id);
    await syncAchievements(supabaseAdmin, userId);

    return json({ message: "Set deleted" });
    }

    // ========================================================
    // CARD IMAGE UPLOAD
    // ========================================================

    if (action === "uploadCardImage") {
    const { fileName, contentType, base64 } = body;

    if (!base64) {
        return json({ error: "base64 image is required" }, 400);
    }

    const bucket = "card-images";

    const cleanName = String(fileName || "card-image")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .slice(0, 80);

    const ext = cleanName.includes(".")
        ? cleanName.split(".").pop()
        : "png";

    const path = `${userId}/${crypto.randomUUID()}.${ext}`;

    const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

    const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, binary, {
        contentType: contentType || "image/png",
        upsert: false,
        });

    if (uploadError) throw uploadError;

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);

    return json({
        path,
        url: data.publicUrl,
    });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error(error);
    return json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      500
    );
  }
});

// ============================================================
// OWNERSHIP HELPERS
// ============================================================

async function assertDeckOwner(supabaseAdmin: any, userId: string, deckId: string) {
  const { data, error } = await supabaseAdmin
    .from("decks")
    .select("id")
    .eq("id", deckId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Deck not found or access denied");
  }
}

async function assertFolderOwner(
  supabaseAdmin: any,
  userId: string,
  folderId: string,
  deckId?: string
) {
  let query = supabaseAdmin
    .from("folders")
    .select("id")
    .eq("id", folderId)
    .eq("user_id", userId);

  if (deckId) {
    query = query.eq("deck_id", deckId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new Error("Folder not found or access denied");
  }
}

async function assertSetOwner(
  supabaseAdmin: any,
  userId: string,
  setId: string,
  deckId?: string,
  folderId?: string
) {
  let query = supabaseAdmin
    .from("sets")
    .select("id")
    .eq("id", setId)
    .eq("user_id", userId);

  if (deckId) query = query.eq("deck_id", deckId);
  if (folderId) query = query.eq("folder_id", folderId);

  const { data, error } = await query.single();

  if (error || !data) {
    throw new Error("Set not found or access denied");
  }
}

// ============================================================
// COUNT HELPERS
// ============================================================

async function refreshAllCounts(
  supabaseAdmin: any,
  userId: string,
  deckId: string,
  folderId: string,
  setId: string
) {
  await refreshSetCounts(supabaseAdmin, userId, setId);
  await refreshFolderCounts(supabaseAdmin, userId, folderId);
  await refreshDeckCounts(supabaseAdmin, userId, deckId);
}

async function refreshSetCounts(supabaseAdmin: any, userId: string, setId: string) {
  const { count: cardCount } = await supabaseAdmin
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("set_id", setId);

  const { count: masteredCount } = await supabaseAdmin
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("set_id", setId)
    .eq("status", "mastered");

  const mastery = cardCount ? Math.round(((masteredCount || 0) / cardCount) * 100) : 0;

  let status = "learning";
  if ((cardCount || 0) > 0 && mastery >= 100) {
    status = "mastered";
  } else if ((cardCount || 0) > 0 && mastery > 0) {
    status = "reviewing";
  }

  await supabaseAdmin
    .from("sets")
    .update({
      card_count: cardCount || 0,
      mastery_percentage: mastery,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", setId)
    .eq("user_id", userId);
}

async function refreshFolderCounts(supabaseAdmin: any, userId: string, folderId: string) {
  const { count: setCount } = await supabaseAdmin
    .from("sets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("folder_id", folderId);

  const { count: cardCount } = await supabaseAdmin
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("folder_id", folderId);

  await supabaseAdmin
    .from("folders")
    .update({
      set_count: setCount || 0,
      card_count: cardCount || 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", folderId)
    .eq("user_id", userId);
}

async function refreshDeckCounts(supabaseAdmin: any, userId: string, deckId: string) {
  const { count: folderCount } = await supabaseAdmin
    .from("folders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("deck_id", deckId);

  const { count: setCount } = await supabaseAdmin
    .from("sets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("deck_id", deckId);

  const { count: cardCount } = await supabaseAdmin
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("deck_id", deckId);

  const { count: masteredCount } = await supabaseAdmin
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("deck_id", deckId)
    .eq("status", "mastered");

  const mastery = cardCount ? Math.round(((masteredCount || 0) / cardCount) * 100) : 0;

  await supabaseAdmin
    .from("decks")
    .update({
      folder_count: folderCount || 0,
      set_count: setCount || 0,
      card_count: cardCount || 0,
      mastery_percentage: mastery,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId)
    .eq("user_id", userId);
}

async function touchStudyTargets(
  supabaseAdmin: any,
  userId: string,
  deckId: string | null,
  setId: string | null
) {
  const now = new Date().toISOString();

  if (deckId) {
    await supabaseAdmin
      .from("decks")
      .update({
        last_studied_at: now,
        updated_at: now,
      })
      .eq("id", deckId)
      .eq("user_id", userId);
  }

  if (setId) {
    await supabaseAdmin
      .from("sets")
      .update({
        last_studied_at: now,
        updated_at: now,
      })
      .eq("id", setId)
      .eq("user_id", userId);
  }
}

// ============================================================
// ACHIEVEMENTS
// ============================================================

async function syncAchievements(supabaseAdmin: any, userId: string) {
  const { count: deckCount } = await supabaseAdmin
    .from("decks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: folderCount } = await supabaseAdmin
    .from("folders")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: setCount } = await supabaseAdmin
    .from("sets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: cardCount } = await supabaseAdmin
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { count: masteredCount } = await supabaseAdmin
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "mastered");

  const { count: sessionCount } = await supabaseAdmin
    .from("study_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("ended_at", "is", null);

  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from("study_sessions")
    .select("cards_studied, cards_correct, cards_incorrect, duration_seconds, xp_earned")
    .eq("user_id", userId)
    .not("ended_at", "is", null);

  if (sessionsError) throw sessionsError;

  const totalCardsStudied = (sessions || []).reduce(
    (sum: number, session: any) => sum + Number(session.cards_studied || 0),
    0
  );

  const totalCorrect = (sessions || []).reduce(
    (sum: number, session: any) => sum + Number(session.cards_correct || 0),
    0
  );

  const totalXp = (sessions || []).reduce(
    (sum: number, session: any) => sum + Number(session.xp_earned || 0),
    0
  );

  const totalStudyMinutes = Math.round(
    (sessions || []).reduce(
      (sum: number, session: any) => sum + Number(session.duration_seconds || 0),
      0
    ) / 60
  );

  const perfectSessionCount = (sessions || []).filter((session: any) => {
    const studied = Number(session.cards_studied || 0);
    const correct = Number(session.cards_correct || 0);
    const incorrect = Number(session.cards_incorrect || 0);

    return studied > 0 && incorrect === 0 && correct >= studied;
  }).length;

  const definitions = [
    {
      badge_key: "first_deck",
      badge_name: "First Deck",
      badge_description: "Create your first deck.",
      badge_icon: "library_books",
      progress: deckCount || 0,
      target: 1,
    },
    {
      badge_key: "ten_cards",
      badge_name: "Card Builder",
      badge_description: "Create 10 flashcards.",
      badge_icon: "style",
      progress: cardCount || 0,
      target: 10,
    },
    {
      badge_key: "first_study",
      badge_name: "First Study",
      badge_description: "Finish your first study session.",
      badge_icon: "school",
      progress: sessionCount || 0,
      target: 1,
    },
    {
      badge_key: "master_10",
      badge_name: "Memory Master",
      badge_description: "Master 10 cards.",
      badge_icon: "workspace_premium",
      progress: masteredCount || 0,
      target: 10,
    },

    // 8 achievements mới
    {
      badge_key: "deck_collector",
      badge_name: "Deck Collector",
      badge_description: "Create 5 decks.",
      badge_icon: "inventory_2",
      progress: deckCount || 0,
      target: 5,
    },
    {
      badge_key: "folder_architect",
      badge_name: "Folder Architect",
      badge_description: "Create 10 folders.",
      badge_icon: "folder_managed",
      progress: folderCount || 0,
      target: 10,
    },
    {
      badge_key: "set_architect",
      badge_name: "Set Architect",
      badge_description: "Create 20 study sets.",
      badge_icon: "category",
      progress: setCount || 0,
      target: 20,
    },
    {
      badge_key: "flashcard_library",
      badge_name: "Flashcard Library",
      badge_description: "Create 50 flashcards.",
      badge_icon: "auto_stories",
      progress: cardCount || 0,
      target: 50,
    },
    {
      badge_key: "study_grinder",
      badge_name: "Study Grinder",
      badge_description: "Finish 25 study sessions.",
      badge_icon: "local_fire_department",
      progress: sessionCount || 0,
      target: 25,
    },
    {
      badge_key: "hundred_reviews",
      badge_name: "Hundred Reviews",
      badge_description: "Study 100 cards in total.",
      badge_icon: "repeat",
      progress: totalCardsStudied,
      target: 100,
    },
    {
      badge_key: "accuracy_ace",
      badge_name: "Accuracy Ace",
      badge_description: "Answer 100 cards correctly.",
      badge_icon: "check_circle",
      progress: totalCorrect,
      target: 100,
    },
    {
      badge_key: "xp_hunter",
      badge_name: "XP Hunter",
      badge_description: "Earn 1,000 XP.",
      badge_icon: "bolt",
      progress: totalXp,
      target: 1000,
    },
    {
      badge_key: "deep_focus",
      badge_name: "Deep Focus",
      badge_description: "Study for 120 minutes in total.",
      badge_icon: "timer",
      progress: totalStudyMinutes,
      target: 120,
    },
    {
      badge_key: "perfect_streak",
      badge_name: "Perfect Streak",
      badge_description: "Finish 5 perfect study sessions.",
      badge_icon: "verified",
      progress: perfectSessionCount,
      target: 5,
    },
  ];

  const { data: existingAchievements } = await supabaseAdmin
    .from("achievements")
    .select("badge_key, is_unlocked, unlocked_at")
    .eq("user_id", userId);

  const existingMap = new Map(
    (existingAchievements || []).map((item: any) => [item.badge_key, item])
  );

  const rows = definitions.map((badge) => {
    const unlocked = badge.progress >= badge.target;
    const existing = existingMap.get(badge.badge_key);

    return {
      user_id: userId,
      badge_key: badge.badge_key,
      badge_name: badge.badge_name,
      badge_description: badge.badge_description,
      badge_icon: badge.badge_icon,
      progress: badge.progress,
      target: badge.target,
      is_unlocked: unlocked,
      unlocked_at: unlocked
        ? existing?.unlocked_at || new Date().toISOString()
        : null,
    };
  });

  const { error: upsertError } = await supabaseAdmin
    .from("achievements")
    .upsert(rows, {
      onConflict: "user_id,badge_key",
    });

  if (upsertError) {
    console.warn("Could not upsert achievements:", upsertError.message);
  }

  const { data, error } = await supabaseAdmin
    .from("achievements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}