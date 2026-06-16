
let currentSession = null;
let currentUser = null;

let allDeckCache = [];
let currentDeckBundleCache = null;

let studyCards = [];
let currentCardIndex = 0;
let studySessionId = null;
let studyCorrect = 0;
let studyIncorrect = 0;
let studyStartTime = null;
let isAnswerShown = false;

// ============================================================
// INIT
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
  bindCommonEvents();
  bindAuthTabs();
  bindEditDeckForm();

  try {
    currentSession = await getSessionOrNull();

    if (!currentSession) {
      showAuthModal();
      return;
    }

    currentUser = currentSession.user;

    const profileResult = await api("ensureProfile", {
        username: currentUser.email?.split("@")[0] || "Scholar",
        email: currentUser.email,
    });

    renderUserProfile(profileResult.user, currentUser);

    const page = getCurrentPage();

    if (page === "index.html" || page === "") {
      await initDashboard();
      return;
    }

    if (page === "decks.html") {
      await initDecksPage();
      return;
    }

    if (page === "deck-details.html") {
      await initDeckDetails();
      return;
    }

    if (page === "cards.html") {
      await initCardsPage();
      return;
    }

    if (page === "study-session.html") {
      await initStudySession();
      return;
    }

    if (page === "recent.html") {
      await initRecentPage();
      return;
    }

    if (page === "achievements.html") {
      await initAchievementsPage();
      return;
    }

    if (page === "manage-account.html") {
      await initAccountPage();
      return;
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || "Có lỗi xảy ra khi khởi tạo ứng dụng.", "error");
  }
});

// ============================================================
// CORE HELPERS
// ============================================================

function getCurrentPage() {
  return window.location.pathname.split("/").pop() || "index.html";
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getApiUrl() {
  if (typeof API_URL !== "undefined" && API_URL) return API_URL;

  if (typeof SUPABASE_URL !== "undefined" && SUPABASE_URL) {
    return `${SUPABASE_URL}/functions/v1/flashcard-api`;
  }

  throw new Error("Thiếu API_URL hoặc SUPABASE_URL trong js/supabase-config.js");
}

async function getSessionOrNull() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

async function api(action, payload = {}) {
  const session = currentSession || (await getSessionOrNull());

  if (!session?.access_token) {
    throw new Error("Bạn cần đăng nhập trước.");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };

  if (typeof SUPABASE_ANON_KEY !== "undefined" && SUPABASE_ANON_KEY) {
    headers.apikey = SUPABASE_ANON_KEY;
  }

  const res = await fetch(getApiUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify({
      action,
      ...payload,
    }),
  });

  let json = {};
  try {
    json = await res.json();
  } catch (_) {
    json = {};
  }

  if (!res.ok) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }

  return json;
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function timeAgo(dateStr) {
  if (!dateStr) return "Not studied yet";

  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");

  const colors = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-surface-container text-on-surface",
  };

  toast.className = `fixed top-4 right-4 z-[9999] px-6 py-3 rounded-xl shadow-lg font-bold text-body-md ${
    colors[type] || colors.info
  }`;

  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
  }, 2600);

  setTimeout(() => toast.remove(), 3000);
}

function showLoading(btnId, text) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.dataset.oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = text;
}

function hideLoading(btnId, fallbackText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.disabled = false;
  btn.textContent = btn.dataset.oldText || fallbackText;
}

function showAuthModal() {
  const modal = document.getElementById("authModal");

  if (modal) {
    modal.classList.remove("hidden");
  } else {
    console.warn("Không thấy #authModal. Người dùng chưa đăng nhập.");
  }
}

function closeModal(id) {
  document.getElementById(id)?.classList.add("hidden");
}

function openModal(id) {
  document.getElementById(id)?.classList.remove("hidden");
}

// ============================================================
// AUTH
// ============================================================

function bindAuthTabs() {
  const loginTab = document.getElementById("showLoginTab");
  const signupTab = document.getElementById("showSignupTab");

  const loginPanel = document.getElementById("loginPanel");
  const signupPanel = document.getElementById("signupPanel");

  if (!loginTab || !signupTab) return;

  function switchTab(isLogin) {
    loginTab.classList.toggle("active", isLogin);
    signupTab.classList.toggle("active", !isLogin);

    loginPanel.classList.toggle("hidden", !isLogin);
    signupPanel.classList.toggle("hidden", isLogin);
  }

  loginTab.addEventListener("click", () => switchTab(true));
  signupTab.addEventListener("click", () => switchTab(false));
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  currentSession = data.session;
  currentUser = data.user;

  return data;
}

async function signUp(email, password, username) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  if (data.session) {
    currentSession = data.session;
    currentUser = data.user;

    await api("ensureProfile", {
      username: username || email.split("@")[0],
      email,
    });
  }

  return data;
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;

  currentSession = null;
  currentUser = null;

  window.location.href = "index.html";
}

function bindCommonEvents() {
  const loginForm = document.getElementById("loginForm");

  if (loginForm && loginForm.dataset.bound !== "true") {
    loginForm.dataset.bound = "true";

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("loginEmail")?.value?.trim();
      const password = document.getElementById("loginPassword")?.value;

      if (!email || !password) {
        showToast("Vui lòng nhập email và mật khẩu.", "error");
        return;
      }

      try {
        await signIn(email, password);
        location.reload();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  const signupForm = document.getElementById("signupForm");

  if (signupForm && signupForm.dataset.bound !== "true") {
    signupForm.dataset.bound = "true";

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("signupEmail")?.value?.trim();
      const password = document.getElementById("signupPassword")?.value;
      const username = document.getElementById("signupUsername")?.value?.trim();

      if (!email || !password) {
        showToast("Vui lòng nhập email và mật khẩu.", "error");
        return;
      }

      try {
        await signUp(email, password, username);
        showToast(
          "Tạo tài khoản thành công. Nếu có yêu cầu xác nhận email, hãy kiểm tra hộp thư.",
          "success"
        );
      } catch (err) {
        showToast(err.message, "error");
      }
    });


    
  }

  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn && logoutBtn.dataset.bound !== "true") {
    logoutBtn.dataset.bound = "true";

    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  document.querySelectorAll("[data-nav]").forEach((el) => {
    if (el.dataset.bound === "true") return;
    el.dataset.bound = "true";

    el.addEventListener("click", () => {
      window.location.href = el.dataset.nav;
    });
  });

  document.querySelectorAll("[data-modal-open]").forEach((el) => {
    if (el.dataset.bound === "true") return;
    el.dataset.bound = "true";

    el.addEventListener("click", () => openModal(el.dataset.modalOpen));
  });

  document.querySelectorAll("[data-modal-close]").forEach((el) => {
    if (el.dataset.bound === "true") return;
    el.dataset.bound = "true";

    el.addEventListener("click", () => closeModal(el.dataset.modalClose));
  });

  document.querySelectorAll("[data-color]").forEach((btn) => {
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      const selectedColor = document.getElementById("selectedColor");

      if (selectedColor) {
        selectedColor.value = btn.dataset.color;
      }

      document.querySelectorAll("[data-color]").forEach((b) => {
        b.classList.remove("ring-2", "ring-offset-2");
      });

      btn.classList.add("ring-2", "ring-offset-2");
    });
  });

  const themeButtons = document.querySelectorAll(
    "[data-icon='contrast'], [data-theme-toggle]"
  );

  themeButtons.forEach((btn) => {
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      document.documentElement.classList.toggle("dark");

      localStorage.setItem(
        "flipflash-theme",
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
    });
  });

  if (localStorage.getItem("flipflash-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
}

// ============================================================
// PROFILE
// ============================================================

async function loadUserProfile(user) {
  try {
    const result = await api("ensureProfile", {
      username: user.email?.split("@")[0] || "Scholar",
      email: user.email,
    });

    renderUserProfile(result.user, user);
  } catch (err) {
    console.warn("Cannot load profile:", err);
  }
}


function renderUserProfile(profile, user) {
  if (!profile) return;

  const nameEl = document.getElementById("userName");
  if (nameEl) nameEl.textContent = profile.username || "Scholar";

  const levelEl = document.getElementById("userLevel");
  if (levelEl) levelEl.textContent = `Level ${profile.level || 1} Scholar`;

  const streakEl = document.getElementById("studyStreak");
  if (streakEl) streakEl.textContent = profile.study_streak || 0;

  const masteredEl = document.getElementById("totalMastered");
  if (masteredEl) {
    masteredEl.textContent = (profile.total_cards_mastered || 0).toLocaleString();
  }

  const hoursEl = document.getElementById("totalHours");
  if (hoursEl) {
    hoursEl.textContent = Math.round(Number(profile.total_study_hours || 0)) + "h";
  }

  const emailEl = document.getElementById("profileEmail");
  if (emailEl) emailEl.value = profile.email || user?.email || "";

  const usernameEl = document.getElementById("profileUsername");
  if (usernameEl) usernameEl.value = profile.username || "";

  const avatarEl = document.getElementById("profileAvatarUrl");
  if (avatarEl) avatarEl.value = profile.avatar_url || "";
}

// ============================================================
// API WRAPPERS
// ============================================================

async function getAllDecks() {
  return api("listDecks");
}

async function createDeck(payload) {
  return api("createDeck", payload);
}

async function updateDeck(deckId, payload) {
  return api("updateDeck", {
    deckId,
    ...payload,
  });
}

async function deleteDeck(deckId) {
  return api("deleteDeck", {
    deckId,
  });
}

async function getDeckBundle(deckId) {
  return api("getDeckBundle", {
    deckId,
  });
}

async function createFolder(payload) {
  return api("createFolder", payload);
}

async function createSet(payload) {
  return api("createSet", payload);
}

async function listCards(setId) {
  return api("listCards", {
    setId,
  });
}

async function createCard(payload) {
  return api("createCard", payload);
}

async function updateCard(cardId, payload) {
  return api("updateCard", {
    cardId,
    ...payload,
  });
}

async function deleteCard(cardId) {
  return api("deleteCard", {
    cardId,
  });
}

async function updateFolder(folderId, payload) {
  return api("updateFolder", {
    folderId,
    ...payload,
  });
}

async function deleteFolder(folderId) {
  return api("deleteFolder", {
    folderId,
  });
}

async function updateSet(setId, payload) {
  return api("updateSet", {
    setId,
    ...payload,
  });
}

async function deleteSet(setId) {
  return api("deleteSet", {
    setId,
  });
}

async function uploadCardImage(file) {
  if (!file) return null;

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB.");
  }

  const base64 = await fileToBase64(file);

  const result = await api("uploadCardImage", {
    fileName: file.name,
    contentType: file.type || "image/png",
    base64,
  });

  return result.url;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.split(",")[1];

      if (!base64) {
        reject(new Error("Không đọc được file ảnh."));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.readAsDataURL(file);
  });
}

function bindImageUploadPreview() {
  const input = document.getElementById("cardImageFile");
  const preview = document.getElementById("cardImagePreview");

  if (!input || !preview) return;
  if (input.dataset.bound === "true") return;

  input.dataset.bound = "true";

  input.addEventListener("change", () => {
    const file = input.files?.[0];

    if (!file) {
      preview.src = "";
      preview.classList.add("hidden");
      return;
    }

    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
  });
}

// ============================================================
// DASHBOARD - index.html
// ============================================================

async function initDashboard() {
  await loadAndRenderDecks({
    limit: 3,
    mode: "dashboard",
    recentOnly: true,
  });

  bindCreateDeckForm();
  bindDeckSearch();
}

// ============================================================
// ALL DECKS - decks.html
// ============================================================

async function initDecksPage() {
  await loadAndRenderDecks({
    limit: null,
    mode: "all",
  });

  bindCreateDeckForm();
  bindDeckSearch();
}

function bindCreateDeckForm() {
  const createDeckForm = document.getElementById("createDeckForm");

  if (!createDeckForm) return;
  if (createDeckForm.dataset.bound === "true") return;

  createDeckForm.dataset.bound = "true";

  createDeckForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("deckName")?.value?.trim();
    const description = document.getElementById("deckDesc")?.value?.trim() || "";
    const color = document.getElementById("selectedColor")?.value || "#994700";

    if (!name) {
      showToast("Deck name is required", "error");
      return;
    }

    try {
      showLoading("createDeckBtn", "Creating...");

      await createDeck({
        name,
        description,
        color,
        icon: "menu_book",
      });

      closeModal("createDeckModal");
      createDeckForm.reset();

      showToast("Deck created!", "success");

      if (getCurrentPage() === "decks.html") {
        await loadAndRenderDecks({ limit: null, mode: "all" });
      } else {
        await loadAndRenderDecks({ limit: 3, mode: "dashboard", recentOnly: true });
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      hideLoading("createDeckBtn", "Create Deck");
    }
  });
}

async function loadAndRenderDecks(options = {}) {
  const {
    limit = null,
    mode = "all",
    recentOnly = false,
  } = options;

  try {
    const data = await getAllDecks();

    allDeckCache = data?.decks || [];

    let decksToRender = [...allDeckCache];

    if (recentOnly) {
      decksToRender.sort((a, b) => {
        const aTime = new Date(
          a.last_studied_at ||
          a.updated_at ||
          a.created_at
        ).getTime();

        const bTime = new Date(
          b.last_studied_at ||
          b.updated_at ||
          b.created_at
        ).getTime();

        return bTime - aTime;
      });
    }

    const visibleDecks = limit
      ? decksToRender.slice(0, limit)
      : decksToRender;

    renderDecks(visibleDecks, {
      mode,
      totalDecks: allDeckCache.length,
    });

    renderStats(allDeckCache);
  } catch (err) {
    console.error("Error loading decks:", err);
    showToast("Failed to load decks", "error");
  }
}

function bindDeckSearch() {
  const input = document.getElementById("deckSearchInput");
  if (!input) return;
  if (input.dataset.bound === "true") return;

  input.dataset.bound = "true";

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();

    const filtered = allDeckCache.filter((deck) => {
      return (
        deck.name?.toLowerCase().includes(q) ||
        deck.description?.toLowerCase().includes(q)
      );
    });

    renderDecks(filtered, {
      mode: getCurrentPage() === "decks.html" ? "all" : "dashboard",
      totalDecks: allDeckCache.length,
    });
  });
}

function renderDecks(decks, options = {}) {
  const { mode = "all", totalDecks = decks.length } = options;

  const container = document.getElementById("decksGrid");
  if (!container) return;

  const addSection = document.getElementById("addDeckSection");

  container.innerHTML = "";

  if (!decks.length) {
    const empty = document.createElement("div");
    empty.className = "ff-card";

    empty.style.gridColumn = "1 / -1";

    empty.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:24px;font-weight:800;">
        No decks yet.
      </h3>
      <p style="margin:0 0 18px;color:var(--on-surface-variant);">
        Create your first deck to start learning flashcards.
      </p>
      <button
        data-modal-open="createDeckModal"
        class="ff-btn ff-btn-primary">
        Create Deck
      </button>
    `;

    container.appendChild(empty);

    empty.querySelector("[data-modal-open]")?.addEventListener("click", () => {
      openModal("createDeckModal");
    });

    if (addSection) container.appendChild(addSection);
    return;
  }

  const colors = [
    "#994700",
    "#006397",
    "#5f5e5e",
    "#E91E63",
    "#9C27B0",
    "#4CAF50",
  ];

  decks.forEach((deck, i) => {
    const color = deck.color || colors[i % colors.length];

    const card = document.createElement("article");
    card.className = "ff-card ff-card-lift ff-deck-card";
    card.style.setProperty("--deck-color", color);
    card.dataset.openDeck = deck.id;

    card.innerHTML = `
      <div class="ff-deck-head">
        <div class="ff-deck-icon">
          <span class="material-symbols-outlined">
            ${safeText(deck.icon || "menu_book")}
          </span>
        </div>

        <div class="ff-deck-actions">
          <button
            type="button"
            data-edit-deck="${deck.id}"
            title="Edit deck">
            <span class="material-symbols-outlined">edit</span>
          </button>

          <button
            type="button"
            class="danger"
            data-delete-deck="${deck.id}"
            data-deck-name="${safeText(deck.name)}"
            data-card-count="${deck.card_count || 0}"
            title="Delete deck">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <h3 class="ff-deck-title">
        ${safeText(deck.name)}
      </h3>

      <p class="ff-deck-desc">
        ${safeText(deck.description || "")}
      </p>

      <div class="ff-deck-meta">
        <span>
          <span class="material-symbols-outlined">folder</span>
          ${deck.folder_count || 0} Folders
        </span>

        <span>
          <span class="material-symbols-outlined">style</span>
          ${deck.card_count || 0} Cards
        </span>
      </div>

      <div class="ff-deck-footer">
        <small>
          ${
            deck.last_studied_at
              ? "Last studied " + timeAgo(deck.last_studied_at)
              : "Not studied yet"
          }
        </small>

        <button
          type="button"
          data-study-deck="${deck.id}"
          class="ff-btn ff-btn-soft"
          style="color:${safeText(color)};">
          Study
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  if (mode === "dashboard" && totalDecks > decks.length) {
    const viewAll = document.createElement("article");
    viewAll.className = "ff-card ff-card-lift";
    viewAll.style.display = "flex";
    viewAll.style.flexDirection = "column";
    viewAll.style.alignItems = "center";
    viewAll.style.justifyContent = "center";
    viewAll.style.textAlign = "center";
    viewAll.style.minHeight = "244px";

    viewAll.innerHTML = `
      <span class="material-symbols-outlined" style="font-size:46px;color:var(--primary);margin-bottom:10px;">
        dashboard
      </span>

      <h3 style="margin:0 0 8px;font-size:24px;font-weight:800;">
        View all decks
      </h3>

      <p style="margin:0 0 18px;color:var(--on-surface-variant);">
        You have ${totalDecks} decks in total.
      </p>

      <a href="decks.html" class="ff-btn ff-btn-primary">
        Open Decks
      </a>
    `;

    container.appendChild(viewAll);
  }

  if (addSection) container.appendChild(addSection);

  document.querySelectorAll(".ff-deck-card[data-open-deck]").forEach((card) => {
  card.addEventListener("click", () => {
    window.location.href = `deck-details.html?id=${card.dataset.openDeck}`;
    });
  });

  document.querySelectorAll("[data-study-deck]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = `study-session.html?deckId=${btn.dataset.studyDeck}`;
    });
  });

  document.querySelectorAll("[data-edit-deck]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditDeck(btn.dataset.editDeck);
    });
  });

  document.querySelectorAll("[data-delete-deck]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    confirmDeleteDeck(
      btn.dataset.deleteDeck,
      btn.dataset.deckName,
      Number(btn.dataset.cardCount || 0)
      );
    });
  });
}

function renderStats(decks) {
  const totalCards = decks.reduce((sum, d) => sum + Number(d.card_count || 0), 0);
  const totalDecks = decks.length;

  const totalMastery =
    decks.length > 0
      ? Math.round(
          decks.reduce((sum, d) => sum + Number(d.mastery_percentage || 0), 0) /
            decks.length
        )
      : 0;

  const totalCardsEl = document.getElementById("totalCards");
  if (totalCardsEl) totalCardsEl.textContent = totalCards.toLocaleString();

  const totalDecksEl = document.getElementById("totalDecks");
  if (totalDecksEl) totalDecksEl.textContent = totalDecks.toLocaleString();

  const masteryEl = document.getElementById("masteryPercentage");
  if (masteryEl) masteryEl.textContent = `${totalMastery}%`;
}

function confirmDeleteDeck(deckId, deckName, cardCount) {
  const modal = document.getElementById("deleteModal");

  if (!modal) {
    const ok = confirm(`Xóa deck "${deckName}" và toàn bộ ${cardCount || 0} cards?`);

    if (ok) {
      deleteDeckAndReload(deckId);
    }

    return;
  }

  const text = document.getElementById("deleteModalText");

  if (text) {
    text.textContent = `This action cannot be undone. All ${
      cardCount || 0
    } cards in "${deckName}" will be permanently removed.`;
  }

  const confirmBtn = document.getElementById("confirmDeleteBtn");

  if (confirmBtn) {
    confirmBtn.onclick = () => deleteDeckAndReload(deckId, modal);
  }

  modal.classList.remove("hidden");
}

async function deleteDeckAndReload(deckId, modal = null) {
  try {
    await deleteDeck(deckId);

    if (modal) modal.classList.add("hidden");

    showToast("Deck deleted", "success");

    if (getCurrentPage() === "decks.html") {
      await loadAndRenderDecks({ limit: null, mode: "all" });
    } else {
      await loadAndRenderDecks({ limit: 3, mode: "dashboard", recentOnly: true });
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

function openEditDeck(deckId) {
  const deck = allDeckCache.find((d) => String(d.id) === String(deckId));

  if (!deck) {
    showToast("Cannot find deck to edit.", "error");
    return;
  }

  const modal = document.getElementById("editDeckModal");

  if (!modal) {
    showToast("Cannot find editDeckModal in the HTML file.", "error");
    return;
  }

  document.getElementById("editDeckId").value = deck.id;
  document.getElementById("editDeckName").value = deck.name || "";
  document.getElementById("editDeckDesc").value = deck.description || "";
  document.getElementById("editSelectedColor").value = deck.color || "#994700";

  document.querySelectorAll("[data-edit-color]").forEach((btn) => {
    btn.classList.remove("ring-2", "ring-offset-2");

    if (btn.dataset.editColor === (deck.color || "#994700")) {
      btn.classList.add("ring-2", "ring-offset-2");
    }
  });

  openModal("editDeckModal");
}

function bindEditDeckForm() {
  const form = document.getElementById("editDeckForm");

  if (!form) return;
  if (form.dataset.bound === "true") return;

  form.dataset.bound = "true";

  document.querySelectorAll("[data-edit-color]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const selectedColor = document.getElementById("editSelectedColor");
      if (selectedColor) selectedColor.value = btn.dataset.editColor;

      document.querySelectorAll("[data-edit-color]").forEach((b) => {
        b.classList.remove("ring-2", "ring-offset-2");
      });

      btn.classList.add("ring-2", "ring-offset-2");
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const deckId = document.getElementById("editDeckId")?.value;
    const name = document.getElementById("editDeckName")?.value?.trim();
    const description = document.getElementById("editDeckDesc")?.value?.trim() || "";
    const color = document.getElementById("editSelectedColor")?.value || "#994700";

    if (!deckId) {
      showToast("Deck ID is required", "error");
      return;
    }

    if (!name) {
      showToast("Deck name is required", "error");
      return;
    }

    try {
      showLoading("saveEditDeckBtn", "Saving...");

      await updateDeck(deckId, {
        name,
        description,
        color,
      });

      closeModal("editDeckModal");
      showToast("Deck updated", "success");

      if (getCurrentPage() === "decks.html") {
        await loadAndRenderDecks({ limit: null, mode: "all" });
      } else {
        await loadAndRenderDecks({ limit: 3, mode: "dashboard", recentOnly: true });
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      hideLoading("saveEditDeckBtn", "Save Changes");
    }
  });
}

// ============================================================
// DECK DETAILS - deck-details.html
// ============================================================

async function initDeckDetails() {
  const deckId = getParam("id");

  if (!deckId) {
    showToast("Thiếu deckId.", "error");
    window.location.href = "decks.html";
    return;
  }

  await loadDeckBundleAndRender(deckId);

  const createFolderForm = document.getElementById("createFolderForm");

  if (createFolderForm && createFolderForm.dataset.bound !== "true") {
    createFolderForm.dataset.bound = "true";

    createFolderForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("folderName")?.value?.trim();
      const description = document.getElementById("folderDesc")?.value?.trim() || "";

      if (!name) {
        showToast("Vui lòng nhập tên folder.", "error");
        return;
      }

      try {
        await createFolder({
          deckId,
          name,
          description,
          color: "#994700",
          icon: "folder",
        });

        showToast("Đã tạo folder.", "success");

        createFolderForm.reset();
        closeModal("createFolderModal");

        await loadDeckBundleAndRender(deckId);
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  const createSetForm = document.getElementById("createSetForm");

  if (createSetForm && createSetForm.dataset.bound !== "true") {
    createSetForm.dataset.bound = "true";

    createSetForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const folderId = document.getElementById("setFolderId")?.value;
      const name = document.getElementById("setName")?.value?.trim();
      const description = document.getElementById("setDesc")?.value?.trim() || "";

      if (!folderId) {
        showToast("Vui lòng chọn folder.", "error");
        return;
      }

      if (!name) {
        showToast("Vui lòng nhập tên set.", "error");
        return;
      }

      try {
        await createSet({
          deckId,
          folderId,
          name,
          description,
          color: "#994700",
          icon: "style",
        });

        showToast("Đã tạo set.", "success");

        createSetForm.reset();
        closeModal("createSetModal");

        await loadDeckBundleAndRender(deckId);
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  const editFolderForm = document.getElementById("editFolderForm");

if (editFolderForm && editFolderForm.dataset.bound !== "true") {
  editFolderForm.dataset.bound = "true";

  editFolderForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const folderId = document.getElementById("editFolderId")?.value;
    const name = document.getElementById("editFolderName")?.value?.trim();
    const description = document.getElementById("editFolderDesc")?.value?.trim() || "";

    if (!folderId || !name) {
      showToast("Thiếu thông tin folder.", "error");
      return;
    }

    try {
      await updateFolder(folderId, {
        name,
        description,
      });

      closeModal("editFolderModal");
      showToast("Đã cập nhật folder.", "success");

      await loadDeckBundleAndRender(deckId);
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

const editSetForm = document.getElementById("editSetForm");

if (editSetForm && editSetForm.dataset.bound !== "true") {
  editSetForm.dataset.bound = "true";

  editSetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const setId = document.getElementById("editSetId")?.value;
    const name = document.getElementById("editSetName")?.value?.trim();
    const description = document.getElementById("editSetDesc")?.value?.trim() || "";

    if (!setId || !name) {
      showToast("Thiếu thông tin set.", "error");
      return;
    }

    try {
      await updateSet(setId, {
        name,
        description,
      });

      closeModal("editSetModal");
      showToast("Đã cập nhật set.", "success");

      await loadDeckBundleAndRender(deckId);
      const focusFolderId = getParam("focusFolder");

      if (focusFolderId) {
        setTimeout(() => {
          const folderEl = document.querySelector(
            `[data-folder-card="${focusFolderId}"]`
          );

          const folderBody = document.querySelector(
            `[data-folder-body="${focusFolderId}"]`
          );

          if (folderBody) {
            folderBody.classList.remove("is-collapsed");
          }

          if (folderEl) {
            folderEl.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 200);
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}
}

async function loadDeckBundleAndRender(deckId) {
  const result = await getDeckBundle(deckId);

  currentDeckBundleCache = {
    deck: result.deck,
    folders: result.folders || [],
    sets: result.sets || [],
  };

  renderDeckHeader(result.deck);
  renderFoldersAndSets(result.deck, result.folders || [], result.sets || []);
  bindDeckDetailsSearch();
}

function bindDeckDetailsSearch() {
  const input = document.getElementById("deckDetailSearchInput");

  if (!input) return;
  if (input.dataset.bound === "true") return;

  input.dataset.bound = "true";

  input.addEventListener("input", () => {
    const keyword = input.value.trim().toLowerCase();

    if (!currentDeckBundleCache) return;

    const { deck, folders, sets } = currentDeckBundleCache;

    if (!keyword) {
      renderFoldersAndSets(deck, folders, sets);
      return;
    }

    const matchedFolders = folders.filter((folder) => {
      return (
        folder.name?.toLowerCase().includes(keyword) ||
        folder.description?.toLowerCase().includes(keyword)
      );
    });

    const matchedSets = sets.filter((set) => {
      return (
        set.name?.toLowerCase().includes(keyword) ||
        set.description?.toLowerCase().includes(keyword)
      );
    });

    const matchedFolderIds = new Set([
      ...matchedFolders.map((folder) => String(folder.id)),
      ...matchedSets.map((set) => String(set.folder_id)),
    ]);

    const filteredFolders = folders.filter((folder) =>
      matchedFolderIds.has(String(folder.id))
    );

    const filteredSets = sets.filter((set) =>
      matchedFolderIds.has(String(set.folder_id))
    );

    renderFoldersAndSets(deck, filteredFolders, filteredSets);

    // Khi search thì mở tất cả folder đang hiển thị ra
    document.querySelectorAll("[data-folder-body]").forEach((body) => {
      body.classList.remove("is-collapsed");
    });

    document.querySelectorAll("[data-folder-chevron] .material-symbols-outlined").forEach((icon) => {
      icon.textContent = "expand_less";
    });
  });
}

function renderDeckHeader(deck) {
  if (!deck) return;

  const title = document.getElementById("deckTitle");
  if (title) title.textContent = deck.name;

  const name = document.getElementById("deckNameTitle");
  if (name) name.textContent = deck.name;

  const desc = document.getElementById("deckDescription");
  if (desc) desc.textContent = deck.description || "";

  const cardCount = document.getElementById("deckCardCount");
  if (cardCount) cardCount.textContent = deck.card_count || 0;

  const folderCount = document.getElementById("deckFolderCount");
  if (folderCount) folderCount.textContent = deck.folder_count || 0;

  const setCount = document.getElementById("deckSetCount");
  if (setCount) setCount.textContent = deck.set_count || 0;
}

function renderFoldersAndSets(deck, folders, sets) {
  const folderSelect = document.getElementById("setFolderId");

  if (folderSelect) {
    folderSelect.innerHTML = folders
      .map((folder) => `<option value="${folder.id}">${safeText(folder.name)}</option>`)
      .join("");
  }

  const container =
    document.getElementById("foldersContainer") ||
    document.getElementById("foldersGrid") ||
    document.getElementById("deckContent");

  if (!container) return;

  container.innerHTML = "";

  if (!folders.length) {
    container.innerHTML = `
      <div class="ff-card">
        <h3 style="margin:0 0 8px;font-size:24px;font-weight:800;">
          Deck này chưa có folder
        </h3>

        <p style="margin:0 0 18px;color:var(--on-surface-variant);">
          Tạo folder trước, sau đó tạo set trong folder.
        </p>

        <button
          type="button"
          data-modal-open="createFolderModal"
          class="ff-btn ff-btn-primary">
          Create Folder
        </button>
      </div>
    `;

    container.querySelector("[data-modal-open]")?.addEventListener("click", () => {
      openModal("createFolderModal");
    });

    return;
  }

  folders.forEach((folder, folderIndex) => {
    const folderSets = sets.filter((set) => set.folder_id === folder.id);
    const isFirst = folderIndex === 0;

    const section = document.createElement("section");
    section.className = "ff-card ff-folder-card";
    section.dataset.folderCard = folder.id;

    section.innerHTML = `
      <button
        type="button"
        class="ff-folder-header"
        data-toggle-folder="${folder.id}">

        <div class="ff-folder-main">
            <span class="material-symbols-outlined">folder</span>

            <div style="min-width:0;">
            <h3 class="ff-folder-title">
                ${safeText(folder.name)}
            </h3>

            ${
                folder.description
                ? `<p class="ff-folder-sub">${safeText(folder.description)}</p>`
                : ""
            }
            </div>
        </div>

        <span class="ff-folder-count">
            ${folder.set_count || 0} sets · ${folder.card_count || 0} cards
        </span>

        <span class="ff-folder-action-cluster">
            <span
            role="button"
            tabindex="0"
            class="ff-mini-icon-btn"
            data-edit-folder="${folder.id}"
            data-folder-name="${safeText(folder.name)}"
            data-folder-desc="${safeText(folder.description || "")}"
            title="Edit folder">
            <span class="material-symbols-outlined">edit</span>
            </span>

            <span
            role="button"
            tabindex="0"
            class="ff-mini-icon-btn danger"
            data-delete-folder="${folder.id}"
            data-folder-name="${safeText(folder.name)}"
            title="Delete folder">
            <span class="material-symbols-outlined">delete</span>
            </span>

            <span
            role="button"
            tabindex="0"
            class="ff-mini-icon-btn"
            data-folder-chevron="${folder.id}"
            title="Toggle folder">
            <span class="material-symbols-outlined">
                ${isFirst ? "expand_less" : "expand_more"}
            </span>
            </span>
        </span>
        </button>

      <div
        class="ff-folder-body ${isFirst ? "" : "is-collapsed"}"
        data-folder-body="${folder.id}">

        ${
          folderSets.length
            ? `
              <div class="ff-set-grid">
                ${folderSets
                  .map(
                    (set) => `
                      <article
                        class="ff-set-card"
                        data-open-set="${set.id}"
                        data-folder-id="${folder.id}">

                        <div class="ff-set-card-top">
                            <h4 class="ff-set-title">
                            <span class="material-symbols-outlined">
                                ${safeText(set.icon || "style")}
                            </span>
                            ${safeText(set.name)}
                            </h4>

                            <div class="ff-set-icon-actions">
                            <button
                                type="button"
                                class="ff-mini-icon-btn"
                                data-edit-set="${set.id}"
                                data-set-name="${safeText(set.name)}"
                                data-set-desc="${safeText(set.description || "")}"
                                title="Edit set">
                                <span class="material-symbols-outlined">edit</span>
                            </button>

                            <button
                                type="button"
                                class="ff-mini-icon-btn danger"
                                data-delete-set="${set.id}"
                                data-set-name="${safeText(set.name)}"
                                title="Delete set">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                            </div>
                        </div>

                        ${set.description ? `
                        <p class="ff-set-desc">
                          ${safeText(set.description)}
                        </p>
                      ` : ""}

                        <p class="ff-set-meta">
                            ${set.card_count || 0} cards ·
                            ${Math.round(Number(set.mastery_percentage || 0))}% mastered
                        </p>

                        <div class="ff-set-actions">

                            <button
                            type="button"
                            class="ff-btn ff-btn-primary"
                            data-study-set="${set.id}">
                            Study
                            </button>
                        </div>
                        </article>
                    `
                  )
                  .join("")}
              </div>
            `
            : `
              <div class="ff-card" style="box-shadow:none;">
                <p style="margin:0;color:var(--on-surface-variant);">
                  Folder này chưa có set. Bấm Create Set để thêm.
                </p>
              </div>
            `
        }
      </div>
    `;

    container.appendChild(section);
  });

  // Toggle folder expand / collapse
  document.querySelectorAll("[data-toggle-folder]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    if (e.target.closest("[data-edit-folder]")) return;
    if (e.target.closest("[data-delete-folder]")) return;
    if (e.target.closest("[data-folder-chevron]")) {
      // vẫn cho toggle khi bấm chevron
    }

    const folderId = btn.dataset.toggleFolder;
    const body = document.querySelector(`[data-folder-body="${folderId}"]`);
    const chevron = document.querySelector(`[data-folder-chevron="${folderId}"] .material-symbols-outlined`);

    if (!body) return;

    body.classList.toggle("is-collapsed");

    if (chevron) {
      chevron.textContent = body.classList.contains("is-collapsed")
        ? "expand_more"
        : "expand_less";
    }
  });
});

  // Click whole set card to open cards page
  document.querySelectorAll("[data-open-set]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;

      const setId = card.dataset.openSet;
      const folderId = card.dataset.folderId;

      window.location.href = `cards.html?deckId=${deck.id}&folderId=${folderId}&setId=${setId}`;
    });
  });

  // Open cards button
  document.querySelectorAll("[data-open-cards]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const setId = btn.dataset.openCards;
      const folderId = btn.dataset.folderId;

      window.location.href = `cards.html?deckId=${deck.id}&folderId=${folderId}&setId=${setId}`;
    });
  });

  // Study set button
  document.querySelectorAll("[data-study-set]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      window.location.href = `study-session.html?deckId=${deck.id}&setId=${btn.dataset.studySet}`;
    });
  });

  // Edit folder
  document.querySelectorAll("[data-edit-folder]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    document.getElementById("editFolderId").value = btn.dataset.editFolder;
    document.getElementById("editFolderName").value = btn.dataset.folderName || "";
    document.getElementById("editFolderDesc").value = btn.dataset.folderDesc || "";

    openModal("editFolderModal");
    });
});

    document.querySelectorAll("[data-delete-folder]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const ok = confirm(
        `Delete this folder "${btn.dataset.folderName}"? All sets and cards inside will also be deleted.`
        );

        if (!ok) return;

        try {
        await deleteFolder(btn.dataset.deleteFolder);
        showToast("Deleted folder.", "success");
        await loadDeckBundleAndRender(deck.id);
        } catch (err) {
        showToast(err.message, "error");
        }
    });
    });

  // Delete folder
  document.querySelectorAll("[data-delete-folder]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      const ok = confirm(
        `Delete this folder "${btn.dataset.folderName}"? All sets and cards inside will also be deleted.`
      );

      if (!ok) return;

      try {
        await deleteFolder(btn.dataset.deleteFolder);

        showToast("Deleted folder.", "success");

        await loadDeckBundleAndRender(deck.id);
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  // Edit set
  document.querySelectorAll("[data-edit-set]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();

      const idInput = document.getElementById("editSetId");
      const nameInput = document.getElementById("editSetName");
      const descInput = document.getElementById("editSetDesc");

      if (!idInput || !nameInput || !descInput) {
        showToast("Thiếu editSetModal trong deck-details.html.", "error");
        return;
      }

      idInput.value = btn.dataset.editSet;
      nameInput.value = btn.dataset.setName || "";
      descInput.value = btn.dataset.setDesc || "";

      openModal("editSetModal");
    });
  });

  // Delete set
  document.querySelectorAll("[data-delete-set]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      const ok = confirm(
        `Delete this set "${btn.dataset.setName}"? All cards inside will also be deleted.`
      );

      if (!ok) return;

      try {
        await deleteSet(btn.dataset.deleteSet);

        showToast("Deleted set.", "success");

        await loadDeckBundleAndRender(deck.id);
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
}

// ============================================================
// CARDS - cards.html
// ============================================================

async function renderCardsPageHeader(deckId, folderId, setId) {
  try {
    const result = await getDeckBundle(deckId);

    const set = (result.sets || []).find(
      (item) => String(item.id) === String(setId)
    );

    const realFolderId = set?.folder_id || folderId;

    const folder = (result.folders || []).find(
      (item) => String(item.id) === String(realFolderId)
    );

    const folderLink = document.getElementById("cardsFolderLink");
    const setTitle = document.getElementById("cardsSetTitle");

    if (folderLink) {
      folderLink.textContent = folder?.name || "Folder";
      folderLink.href = `deck-details.html?id=${deckId}&focusFolder=${realFolderId}`;
      folderLink.title = "Back to folder";
    }

    if (setTitle) {
      setTitle.textContent = set?.name || "Set";
    }
  } catch (err) {
    console.warn("Cannot load cards page header:", err);
  }
}


async function initCardsPage() {
  const deckId = getParam("deckId");
  const folderId = getParam("folderId");
  const setId = getParam("setId");

  if (!deckId || !folderId || !setId) {
    showToast("Thiếu deckId, folderId hoặc setId.", "error");
    window.location.href = "decks.html";
    return;
  }

  await renderCardsPageHeader(deckId, folderId, setId);

  await loadCardsAndRender(setId);

  const studyBtn = document.getElementById("studySetBtn");

  if (studyBtn && studyBtn.dataset.bound !== "true") {
    studyBtn.dataset.bound = "true";

    studyBtn.addEventListener("click", () => {
      window.location.href = `study-session.html?deckId=${deckId}&setId=${setId}`;
    });
  }
}

async function loadCardsAndRender(setId) {
  const result = await listCards(setId);

  allCardsCache = result.cards || [];

  renderCards(allCardsCache);
  bindCardSearch();
}

function bindCardSearch() {
  const input = document.getElementById("cardSearchInput");

  if (!input) return;
  if (input.dataset.bound === "true") return;

  input.dataset.bound = "true";

  input.addEventListener("input", () => {
    const keyword = input.value.trim().toLowerCase();

    if (!keyword) {
      renderCards(allCardsCache);
      return;
    }

    const filteredCards = allCardsCache.filter((card) => {
      const question = card.question || "";
      const answer = card.answer || "";

      return `${question} ${answer}`.toLowerCase().includes(keyword);
    });

    renderCards(filteredCards);
  });
}

let isBulkEditMode = false;
let currentRenderedCards = [];
let allCardsCache = [];

function renderCards(cards) {
  currentRenderedCards = cards;

  const container =
    document.getElementById("cardsContainer") ||
    document.getElementById("cardsList") ||
    document.getElementById("cardsGrid");

  if (!container) return;

  container.innerHTML = "";

  const countEl = document.getElementById("cardsCount");
  if (countEl) countEl.textContent = cards.length;

  const toolbar = document.createElement("div");
  toolbar.className = "ff-bulk-bar";

  toolbar.innerHTML = `
    <div>
      <strong>${cards.length} cards</strong>
      <span style="color:var(--on-surface-variant);">
        ${isBulkEditMode ? "· Editing this set" : "· View mode"}
      </span>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button
        type="button"
        id="toggleBulkEditBtn"
        class="ff-btn ${isBulkEditMode ? "ff-btn-soft" : "ff-btn-tonal"}">
        ${isBulkEditMode ? "Cancel Edit" : "Edit Set"}
      </button>

      ${
        isBulkEditMode
          ? `
            <button
              type="button"
              id="saveAllCardsBtn"
              class="ff-btn ff-btn-primary">
              Save All Cards
            </button>
          `
          : ""
      }
    </div>
  `;

  container.appendChild(toolbar);

  document.getElementById("toggleBulkEditBtn")?.addEventListener("click", () => {
    isBulkEditMode = !isBulkEditMode;
    renderCards(currentRenderedCards);
  });

  document.getElementById("saveAllCardsBtn")?.addEventListener("click", async () => {
    await saveAllCardsInSet();
  });

  if (!cards.length) {
  const empty = document.createElement("div");
  empty.className = "ff-card";

  empty.innerHTML = `
    <h3 style="margin:0 0 8px;font-size:24px;font-weight:800;">
      Set này chưa có flashcard
    </h3>
    <p style="margin:0;color:var(--on-surface-variant);">
      Bấm nút + bên dưới để thêm card đầu tiên.
    </p>
  `;

  container.appendChild(empty);
  }

  cards.forEach((card, index) => {
    const row = document.createElement("article");
    row.className = "ff-card-row";
    row.dataset.cardId = card.id;

    if (isBulkEditMode) {
      row.innerHTML = `
        <div class="ff-card-row-head">
          <p class="ff-card-index">Card ${index + 1}</p>

          <button
            type="button"
            class="ff-icon-btn danger"
            data-delete-card="${card.id}"
            title="Delete card">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>

        <div class="ff-card-edit-grid">
          <div class="ff-field" style="margin:0;">
            <label>Question</label>
            <textarea data-edit-question="${card.id}">${safeText(card.question)}</textarea>
          </div>

          <div class="ff-field" style="margin:0;">
            <label>Answer</label>
            <textarea data-edit-answer="${card.id}">${safeText(card.answer)}</textarea>
          </div>
        </div>

        <div class="ff-card-extra-grid">
          <div class="ff-field" style="margin:0;">
            <label>Image / Hint</label>

            <label
              for="edit-image-${card.id}"
              class="ff-new-card-upload ${card.image_url ? "hidden" : ""}"
              data-edit-upload-box="${card.id}">
              <span class="material-symbols-outlined">add_photo_alternate</span>
              <strong>Upload image</strong>
              <small>PNG, JPG, WebP · Max 5MB</small>
            </label>

            <input
              id="edit-image-${card.id}"
              data-edit-image-file="${card.id}"
              type="file"
              accept="image/*"
              class="hidden"/>

            <input
              data-edit-image="${card.id}"
              type="hidden"
              value="${safeText(card.image_url || "")}">

            <div
              data-edit-image-wrap="${card.id}"
              class="ff-new-card-image-wrap ${card.image_url ? "" : "hidden"}">

              <img
                data-edit-preview="${card.id}"
                class="ff-new-card-preview"
                src="${safeText(card.image_url || "")}"
                alt="Image preview"/>

              <button
                type="button"
                class="ff-remove-new-image"
                data-remove-edit-image="${card.id}"
                title="Remove image">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div class="ff-field" style="margin:0;">
            <label>Difficulty</label>
            <select data-edit-difficulty="${card.id}">
              ${[1, 2, 3, 4, 5]
                .map(
                  (n) =>
                    `<option value="${n}" ${
                      Number(card.difficulty_level || 1) === n ? "selected" : ""
                    }>${n}</option>`
                )
                .join("")}
            </select>
          </div>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="ff-card-row-head">
          <div>
            <p class="ff-card-index">Card ${index + 1}</p>
            <h3 class="ff-card-question">${safeText(card.question)}</h3>
          </div>

          <button
            type="button"
            class="ff-icon-btn danger"
            data-delete-card="${card.id}"
            title="Delete card">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>

        <p class="ff-card-answer">${safeText(card.answer)}</p>

        ${
          card.image_url
            ? `<img
                src="${safeText(card.image_url)}"
                alt="Card image"
                style="margin-top:16px;max-height:220px;max-width:100%;border-radius:16px;border:1px solid var(--outline-variant);object-fit:cover;">`
            : ""
        }

        <p style="margin:18px 0 0;color:var(--on-surface-variant);font-weight:700;">
          Difficulty ${card.difficulty_level || 1} ·
          ${card.status || "learning"} ·
          Reviewed ${card.review_count || 0} times
        </p>
      `;
    }

    container.appendChild(row);
  });

  appendInlineAddCardArea(container);
  bindInlineAddCardEvents();

  document.querySelectorAll("[data-delete-card]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this card?")) return;

      try {
        await deleteCard(btn.dataset.deleteCard);

        showToast("Card deleted.", "success");

        await loadCardsAndRender(getParam("setId"));
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
  bindEditCardImageUploads();
}


function bindEditCardImageUploads() {
  document.querySelectorAll("[data-edit-image-file]").forEach((input) => {
    if (input.dataset.bound === "true") return;
    input.dataset.bound = "true";

    input.addEventListener("change", () => {
      const cardId = input.dataset.editImageFile;
      const file = input.files?.[0];

      const preview = document.querySelector(`[data-edit-preview="${cardId}"]`);
      const wrap = document.querySelector(`[data-edit-image-wrap="${cardId}"]`);
      const uploadBox = document.querySelector(`[data-edit-upload-box="${cardId}"]`);

      if (!file || !preview || !wrap || !uploadBox) return;

      preview.src = URL.createObjectURL(file);
      wrap.classList.remove("hidden");
      uploadBox.classList.add("hidden");
    });
  });

  document.querySelectorAll("[data-remove-edit-image]").forEach((btn) => {
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      const cardId = btn.dataset.removeEditImage;

      const fileInput = document.querySelector(`[data-edit-image-file="${cardId}"]`);
      const hiddenInput = document.querySelector(`[data-edit-image="${cardId}"]`);
      const preview = document.querySelector(`[data-edit-preview="${cardId}"]`);
      const wrap = document.querySelector(`[data-edit-image-wrap="${cardId}"]`);
      const uploadBox = document.querySelector(`[data-edit-upload-box="${cardId}"]`);

      if (fileInput) fileInput.value = "";
      if (hiddenInput) hiddenInput.value = "";
      if (preview) preview.src = "";

      wrap?.classList.add("hidden");
      uploadBox?.classList.remove("hidden");
    });
  });
}

function appendInlineAddCardArea(container) {
  const area = document.createElement("div");
  area.className = "ff-inline-add-area";
  area.id = "inlineAddCardArea";

  area.innerHTML = `
    <button
      id="addInlineCardBtn"
      type="button"
      class="ff-add-card-circle"
      title="Add card">
      <span class="material-symbols-outlined">add</span>
    </button>

    <button
      id="saveInlineCardsBtn"
      type="button"
      class="ff-btn ff-btn-primary hidden">
      Save New Cards
    </button>
  `;

  container.appendChild(area);
}

function bindInlineAddCardEvents() {
  const addBtn = document.getElementById("addInlineCardBtn");
  const saveBtn = document.getElementById("saveInlineCardsBtn");

  if (addBtn) {
    addBtn.onclick = () => {
      addInlineCardRow();
      saveBtn?.classList.remove("hidden");
    };
  }

  if (saveBtn) {
    saveBtn.onclick = saveInlineNewCards;
  }
}

function addInlineCardRow() {
  const area = document.getElementById("inlineAddCardArea");
  if (!area) return;

  const uid = `new-card-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const row = document.createElement("article");
  row.className = "ff-card-row ff-new-card-row";
  row.dataset.newCardRow = "true";

  row.innerHTML = `
    <div class="ff-card-row-head">
      <p class="ff-card-index">New Card</p>

      <button
        type="button"
        class="ff-icon-btn danger"
        data-remove-new-card
        title="Remove card">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    <div class="ff-card-edit-grid">
      <div class="ff-field" style="margin:0;">
        <label>Question</label>
        <textarea data-new-question placeholder="Enter question..." required></textarea>
      </div>

      <div class="ff-field" style="margin:0;">
        <label>Answer</label>
        <textarea data-new-answer placeholder="Enter answer..." required></textarea>
      </div>
    </div>

    <div class="ff-card-extra-grid">
      <div class="ff-field" style="margin:0;">
        <label>Image / Hint</label>

        <label for="${uid}" class="ff-new-card-upload" data-new-upload-box>
          <span class="material-symbols-outlined">add_photo_alternate</span>
          <strong>Upload image</strong>
          <small>PNG, JPG, WebP · Max 5MB</small>
        </label>

        <input
          id="${uid}"
          data-new-image
          type="file"
          accept="image/*"
          class="hidden"/>

        <div data-new-image-wrap class="ff-new-card-image-wrap hidden">
          <img
            data-new-preview
            class="ff-new-card-preview"
            alt="Image preview"/>

          <button
            type="button"
            class="ff-remove-new-image"
            data-remove-new-image
            title="Remove image">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div class="ff-field" style="margin:0;">
        <label>Difficulty</label>
        <select data-new-difficulty>
          <option value="1">1 - Easy</option>
          <option value="2">2</option>
          <option value="3">3 - Medium</option>
          <option value="4">4</option>
          <option value="5">5 - Hard</option>
        </select>
      </div>
    </div>
  `;

  area.parentNode.insertBefore(row, area);

  row.querySelector("[data-remove-new-card]")?.addEventListener("click", () => {
    row.remove();

    const stillHasNewRows = document.querySelectorAll("[data-new-card-row]").length > 0;
    if (!stillHasNewRows) {
      document.getElementById("saveInlineCardsBtn")?.classList.add("hidden");
    }
  });

  const fileInput = row.querySelector("[data-new-image]");
  const preview = row.querySelector("[data-new-preview]");
  const imageWrap = row.querySelector("[data-new-image-wrap]");
  const uploadBox = row.querySelector("[data-new-upload-box]");
  const removeImageBtn = row.querySelector("[data-remove-new-image]");

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];

    if (!file || !preview || !imageWrap || !uploadBox) return;

    preview.src = URL.createObjectURL(file);

    imageWrap.classList.remove("hidden");
    uploadBox.classList.add("hidden");
  });

  removeImageBtn?.addEventListener("click", () => {
    if (fileInput) fileInput.value = "";

    if (preview) preview.src = "";

    imageWrap?.classList.add("hidden");
    uploadBox?.classList.remove("hidden");
  });

  row.querySelector("[data-new-question]")?.focus();
}

async function saveInlineNewCards() {
  const rows = Array.from(document.querySelectorAll("[data-new-card-row]"));

  if (!rows.length) return;

  const deckId = getParam("deckId");
  const folderId = getParam("folderId");
  const setId = getParam("setId");

  const saveBtn = document.getElementById("saveInlineCardsBtn");

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";
    }

    for (const row of rows) {
      const question = row.querySelector("[data-new-question]")?.value?.trim();
      const answer = row.querySelector("[data-new-answer]")?.value?.trim();
      const difficulty = Number(row.querySelector("[data-new-difficulty]")?.value || 1);
      const imageFile = row.querySelector("[data-new-image]")?.files?.[0] || null;

      if (!question || !answer) {
        throw new Error("Question and Answer cannot be empty.");
      }

      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadCardImage(imageFile);
      }

      await createCard({
        deckId,
        folderId,
        setId,
        question,
        answer,
        image_url: imageUrl,
        difficulty_level: difficulty,
      });
    }

    showToast("Đã thêm cards.", "success");

    await renderCardsPageHeader(deckId, folderId, setId);
    await loadCardsAndRender(setId);
  } catch (err) {
    showToast(err.message, "error");

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save New Cards";
    }
  }
}

async function saveAllCardsInSet() {
  const cards = currentRenderedCards || [];

  if (!cards.length) return;

  try {
    const btn = document.getElementById("saveAllCardsBtn");

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }

    for (const card of cards) {
      const question = document.querySelector(`[data-edit-question="${card.id}"]`)?.value?.trim();
      const answer = document.querySelector(`[data-edit-answer="${card.id}"]`)?.value?.trim();
      let imageUrl = document.querySelector(`[data-edit-image="${card.id}"]`)?.value?.trim() || null;

      const imageFile = document.querySelector(`[data-edit-image-file="${card.id}"]`)?.files?.[0] || null;

      if (imageFile) {
        imageUrl = await uploadCardImage(imageFile);
      }

      const difficulty = Number(
        document.querySelector(`[data-edit-difficulty="${card.id}"]`)?.value || 1
      );

      if (!question || !answer) {
        throw new Error("Question and Answer cannot be empty.");
      }

      await updateCard(card.id, {
        question,
        answer,
        image_url: imageUrl || null,
        difficulty_level: difficulty,
      });
    }

    showToast("Saved all cards.", "success");

    isBulkEditMode = false;
    await loadCardsAndRender(getParam("setId"));
  } catch (err) {
    showToast(err.message, "error");

    const btn = document.getElementById("saveAllCardsBtn");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save All Cards";
    }
  }
}

// ============================================================
// STUDY - study-session.html
// ============================================================

async function initStudySession() {
  const deckId = getParam("deckId");
  const setId = getParam("setId");

  if (!deckId) {
    showToast("No deckId.", "error");
    window.location.href = "decks.html";
    return;
  }

  try {
    const result = await api("startStudy", {
      deckId,
      setId,
    });

    studySessionId = result.session?.id;
    studyCards = result.cards || [];
    currentCardIndex = 0;
    studyCorrect = 0;
    studyIncorrect = 0;
    studyStartTime = Date.now();
    isAnswerShown = false;

    bindStudyButtons();

    if (!studyCards.length) {
      const studyArea = document.getElementById("studyArea");

      if (studyArea) {
        studyArea.innerHTML = `
          <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg text-center">
            <h2 class="font-bold text-headline-md mb-sm">
              Set này chưa có card
            </h2>
            <p class="text-on-surface-variant mb-md">
              Hãy thêm flashcard trước khi học.
            </p>
            <button
              onclick="history.back()"
              class="bg-primary text-white px-md py-sm rounded-full font-bold">
              Quay lại
            </button>
          </div>
        `;
      }

      return;
    }

    renderCurrentStudyCard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function bindStudyButtons() {
  const showAnswerBtn = document.getElementById("showAnswerBtn");
  const correctBtn = document.getElementById("correctBtn");
  const incorrectBtn = document.getElementById("incorrectBtn");
  const finishStudyBtn = document.getElementById("finishStudyBtn");

  if (showAnswerBtn) {
    showAnswerBtn.onclick = () => {
      isAnswerShown = true;
      renderCurrentStudyCard();
    };
  }

  if (correctBtn) {
    correctBtn.onclick = () => reviewCurrentCard(true);
  }

  if (incorrectBtn) {
    incorrectBtn.onclick = () => reviewCurrentCard(false);
  }

  if (finishStudyBtn) {
    finishStudyBtn.onclick = finishStudy;
  }
}

function renderCurrentStudyCard() {
  const card = studyCards[currentCardIndex];
  if (!card) return;

  const progressEl = document.getElementById("studyProgress");

  if (progressEl) {
    progressEl.textContent = `${currentCardIndex + 1}/${studyCards.length}`;
  }

  const studyArea = document.getElementById("studyArea");

  if (studyArea) {
    studyArea.innerHTML = `
      <div class="ff-study-card ${isAnswerShown ? "is-flipped" : ""}" id="studyFlipCard">
        <div class="ff-study-inner">
          <div class="ff-study-face ff-study-front">
            <p class="ff-study-label">Question</p>

            ${
                card.image_url
                    ? `
                    <div class="ff-study-image-wrap">
                        <img
                        src="${safeText(card.image_url)}"
                        alt="Question hint image"
                        class="ff-study-image">
                    </div>
                    `
                    : ""
                }

            <p class="ff-study-text">
              ${safeText(card.question)}
            </p>
          </div>

          <div class="ff-study-face ff-study-back">
            <p class="ff-study-label">Answer</p>
            <p class="ff-study-answer">
              ${safeText(card.answer)}
            </p>
          </div>
        </div>
      </div>

      <div class="ff-study-actions">
        <button
          id="showAnswerBtn"
          class="ff-btn ff-btn-primary ${isAnswerShown ? "hidden" : ""}"
          type="button">
          Show Answer
        </button>

        <button
          id="incorrectBtn"
          class="ff-btn ff-btn-danger ${isAnswerShown ? "" : "hidden"}"
          type="button">
          Incorrect
        </button>

        <button
          id="correctBtn"
          class="ff-btn ff-btn-success ${isAnswerShown ? "" : "hidden"}"
          type="button">
          Correct
        </button>

        <button
          id="finishStudyBtn"
          class="ff-btn ff-btn-soft"
          type="button">
          Finish
        </button>
      </div>
    `;

    bindStudyButtons();
  }
}

async function reviewCurrentCard(isCorrect) {
  const card = studyCards[currentCardIndex];

  if (!card) return;

  try {
    await api("reviewCard", {
      cardId: card.id,
      isCorrect,
    });

    if (isCorrect) {
      studyCorrect += 1;
    } else {
      studyIncorrect += 1;
    }

    currentCardIndex += 1;
    isAnswerShown = false;

    if (currentCardIndex >= studyCards.length) {
      await finishStudy();
      return;
    }

    renderCurrentStudyCard();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function finishStudy() {
  if (!studySessionId) {
    window.location.href = "recent.html";
    return;
  }

  const durationSeconds = Math.max(
    1,
    Math.floor((Date.now() - studyStartTime) / 1000)
  );

  try {
    await api("finishStudy", {
      sessionId: studySessionId,
      cardsStudied: studyCorrect + studyIncorrect,
      cardsCorrect: studyCorrect,
      cardsIncorrect: studyIncorrect,
      durationSeconds,
    });

    showToast("Đã lưu phiên học.", "success");

    window.location.href = "recent.html";
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ============================================================
// RECENT - recent.html
// ============================================================

async function initRecentPage() {
  const container =
    document.getElementById("recentContainer") ||
    document.getElementById("recentList") ||
    document.getElementById("sessionsList");

  const searchInput = document.getElementById("recentSearchInput");

  if (!container) return;

  container.className = "ff-recent-list";

  container.innerHTML = `
    ${[1, 2, 3].map(() => `
      <div class="ff-recent-item ff-skeleton">
        <div class="ff-recent-icon"></div>
        <div>
          <div class="ff-skeleton-line" style="width:45%;margin-bottom:10px;"></div>
          <div class="ff-skeleton-line" style="width:72%;"></div>
        </div>
        <div class="ff-recent-score">
          <div class="ff-skeleton-line" style="width:80px;margin-bottom:10px;"></div>
          <div class="ff-skeleton-line" style="width:58px;"></div>
        </div>
      </div>
    `).join("")}
  `;

  try {
    const result = await api("listRecent");
    const sessions = result.sessions || [];

    function renderRecent(filteredSessions) {
      container.innerHTML = "";

      if (!filteredSessions.length) {
        container.innerHTML = `
          <div class="ff-card">
            <h3 style="margin:0 0 8px;font-size:24px;font-weight:800;">
              Không tìm thấy phiên học nào
            </h3>
            <p style="margin:0;color:var(--on-surface-variant);">
              Thử tìm bằng tên deck hoặc tên set khác.
            </p>
          </div>
        `;
        return;
      }

      filteredSessions.forEach((session) => {
        const item = document.createElement("article");
        item.className = "ff-recent-item";

        const deckName = session.decks?.name || "Unknown deck";
        const setName = session.sets?.name || "All cards";

        const studied = Number(session.cards_studied || 0);
        const correct = Number(session.cards_correct || 0);
        const incorrect = Number(session.cards_incorrect || 0);
        const xp = Number(session.xp_earned || 0);

        item.innerHTML = `
          <div class="ff-recent-icon">
            <span class="material-symbols-outlined">history_edu</span>
          </div>

          <div>
            <h3 class="ff-recent-title">
              ${safeText(deckName)} / ${safeText(setName)}
            </h3>

            <p class="ff-recent-meta">
              ${studied} cards · ${correct} correct · ${incorrect} incorrect
            </p>
          </div>

          <div class="ff-recent-score">
            <p class="ff-recent-time">${timeAgo(session.started_at)}</p>
            <p class="ff-recent-xp">+${xp} XP</p>
          </div>
        `;

        container.appendChild(item);
      });
    }

    renderRecent(sessions);

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.trim().toLowerCase();

        const filtered = sessions.filter((session) => {
          const deckName = session.decks?.name || "";
          const setName = session.sets?.name || "";
          const text = `${deckName} ${setName}`.toLowerCase();

          return text.includes(keyword);
        });

        renderRecent(filtered);
      });
    }
  } catch (err) {
    container.innerHTML = `
      <div class="ff-card">
        <h3 style="margin:0 0 8px;font-size:22px;font-weight:800;">
          Không tải được recent sessions
        </h3>
        <p style="margin:0;color:var(--on-surface-variant);">
          ${safeText(err.message)}
        </p>
      </div>
    `;
  }
}

// ============================================================
// ACHIEVEMENTS - achievements.html
// ============================================================

async function initAchievementsPage() {
  const container =
    document.getElementById("achievementsContainer") ||
    document.getElementById("achievementsGrid") ||
    document.getElementById("badgesGrid");

  const searchInput = document.getElementById("achievementSearchInput");

  if (!container) return;

  container.className = "ff-grid";

  container.innerHTML = `
    ${[1, 2, 3].map(() => `
      <div class="ff-card ff-achievement-card ff-skeleton">
        <div class="ff-achievement-top">
          <div class="ff-achievement-icon"></div>
          <div style="flex:1;">
            <div class="ff-skeleton-line" style="width:55%;margin-bottom:12px;"></div>
            <div class="ff-skeleton-line" style="width:80%;"></div>
          </div>
        </div>
        <div class="ff-skeleton-line" style="width:100%;height:10px;margin-top:auto;"></div>
      </div>
    `).join("")}
  `;

  try {
    const result = await api("listAchievements");
    const achievements = result.achievements || [];

    function renderAchievements(filteredAchievements) {
      container.innerHTML = "";

      if (!filteredAchievements.length) {
        container.innerHTML = `
          <div class="ff-card" style="grid-column:1/-1;">
            <h3 style="margin:0 0 8px;font-size:24px;font-weight:800;">
              Không tìm thấy achievement nào
            </h3>
            <p style="margin:0;color:var(--on-surface-variant);">
              Thử tìm bằng tên badge, mô tả hoặc trạng thái unlocked/locked.
            </p>
          </div>
        `;
        return;
      }

      filteredAchievements.forEach((badge) => {
        const progress = badge.target
          ? Math.min(
              100,
              Math.round(
                (Number(badge.progress || 0) / Number(badge.target || 1)) * 100
              )
            )
          : 0;

        const unlocked = Boolean(badge.is_unlocked);

        const item = document.createElement("article");
        item.className = `ff-card ff-card-lift ff-achievement-card ${
          unlocked ? "is-unlocked" : ""
        }`;

        item.innerHTML = `
          <div class="ff-achievement-top">
            <div class="ff-achievement-icon">
              <span class="material-symbols-outlined">
                ${safeText(badge.badge_icon || "emoji_events")}
              </span>
            </div>

            <div>
              <h3 class="ff-achievement-name">
                ${safeText(badge.badge_name || "Achievement")}
              </h3>

              <p class="ff-achievement-desc">
                ${safeText(badge.badge_description || "")}
              </p>
            </div>
          </div>

          <div class="ff-achievement-progress">
            <div class="ff-progress-track">
              <div class="ff-progress-fill" style="width:${progress}%"></div>
            </div>

            <div class="ff-achievement-foot">
              <span>${badge.progress || 0}/${badge.target || 0}</span>

              <span class="ff-badge ${
                unlocked ? "ff-badge-unlocked" : "ff-badge-locked"
              }">
                <span class="material-symbols-outlined" style="font-size:17px;">
                  ${unlocked ? "check_circle" : "lock"}
                </span>
                ${unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>
          </div>
        `;

        container.appendChild(item);
      });
    }

    renderAchievements(achievements);

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const keyword = searchInput.value.trim().toLowerCase();

        const filtered = achievements.filter((badge) => {
          const name = badge.badge_name || "";
          const description = badge.badge_description || "";
          const status = badge.is_unlocked ? "unlocked opened complete" : "locked incomplete";
          const text = `${name} ${description} ${status}`.toLowerCase();

          return text.includes(keyword);
        });

        renderAchievements(filtered);
      });
    }
  } catch (err) {
    container.innerHTML = `
      <div class="ff-card" style="grid-column:1/-1;">
        <h3 style="margin:0 0 8px;font-size:22px;font-weight:800;">
          Không tải được achievements
        </h3>
        <p style="margin:0;color:var(--on-surface-variant);">
          ${safeText(err.message)}
        </p>
      </div>
    `;
  }
}

// ============================================================
// ACCOUNT - manage-account.html
// ============================================================

async function initAccountPage() {
  const form =
    document.getElementById("accountForm") ||
    document.getElementById("profileForm");

  if (!form) return;

  if (form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("profileUsername")?.value?.trim();

    const avatarUrl =
      document.getElementById("profileAvatarUrl")?.value?.trim() || null;

    if (!username) {
      showToast("Vui lòng nhập username.", "error");
      return;
    }

    try {
      await api("updateProfile", {
        username,
        avatar_url: avatarUrl,
      });

      showToast("Đã cập nhật tài khoản.", "success");

      if (currentUser) {
        await loadUserProfile(currentUser);
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

// ============================================================
// EXPOSE FUNCTIONS FOR OLD INLINE ONCLICK HTML
// ============================================================

window.confirmDeleteDeck = confirmDeleteDeck;
window.openEditDeck = openEditDeck;
window.signOut = signOut;
window.openModal = openModal;
window.closeModal = closeModal;