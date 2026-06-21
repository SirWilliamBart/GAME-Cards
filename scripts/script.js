// script.js
import { buildDeck } from "./deckView.js";
import { openMiniGame, closeMiniGame } from "./miniGameLoader.js";
import { renderFiltersUI, buildPoolFromFilters } from "./filters.js";
import { setupAddCardsUI } from "./addCards.js";

const JSON_URL = "cards2.json";

let cardsData = null;
let currentDeckSize = 5;
let currentPool = [];
let additionalCards = [];

/* ---------- helpers ---------- */
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function toInt(v, fallback = 0) {
    const n = parseInt(String(v ?? "").trim(), 10);
    return Number.isFinite(n) ? n : fallback;
}

function escapeHtml(str) {
    return String(str ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function prettyName(s) {
    return String(s ?? "")
        .replaceAll("_", " ")
        .replaceAll("/", " / ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeKey(s) {
    return String(s ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeType(t) {
    return String(t ?? "").trim().toLowerCase();
}

function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    return tags.map((t) => String(t ?? "").trim()).filter(Boolean);
}

function getPlayers(card) {
    return toInt(card?.players, 0);
}

function getDifficulty(card) {
    return toInt(card?.dificulty ?? card?.difficulty, 0);
}

function getSpice(card) {
    return toInt(card?.spice, 0);
}

function getSpecial(card) {
    return card?.special ? String(card.special) : "";
}

function showUiError(msg) {
    const el = document.getElementById("uiError");
    if (!el) return;
    el.textContent = String(msg ?? "");
    el.classList.toggle("hidden", !msg);
}

// Dedicated mini-game error area.
function showMiniGameError(msg) {
    const el = document.getElementById("miniGameError");
    if (!el) {
        showUiError(msg);
        return;
    }
    el.textContent = String(msg ?? "");
    el.classList.toggle("hidden", !msg);
}

function clearMiniGameError() {
    const el = document.getElementById("miniGameError");
    if (!el) return;
    el.textContent = "";
    el.classList.add("hidden");
}

/* ---------- screens ---------- */
// expects screens in HTML:
// #config-screen, #game-screen, #mini-game-screen
function showScreen(which) {
    const config = document.getElementById("config-screen");
    const game = document.getElementById("game-screen");
    const mini = document.getElementById("mini-game-screen");

    if (!config || !game) return;

    const set = (el, on) => {
        if (!el) return;
        el.classList.toggle("hidden", !on);
    };

    set(config, which === "config");
    set(game, which === "game");
    set(mini, which === "mini-game");
}

/* ---------- data ---------- */
async function loadCardsJson() {
    const res = await fetch(JSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${JSON_URL} (${res.status})`);
    const data = await res.json();
    if (!data || typeof data !== "object") throw new Error("cards.json is not an object");
    if (!Array.isArray(data.cards)) throw new Error("cards.json missing 'cards' array");
    return data;
}

/* ---------- mini-games ---------- */
async function onOpenMiniGame(url, title) {
    try {
        clearMiniGameError();

        // url should be like "./mini-games/pong" OR "./mini-games/pong/game.html"
        await openMiniGame({
            baseUrl: url,
            title,
            showScreen,
            showMiniGameError,
            clearMiniGameError,
            ids: { host: "miniGameHost", title: "miniGameTitle" },
        });
    } catch (e) {
        console.error("openMiniGame failed:", e);
        showMiniGameError("Mini game failed to open (check console).");
        showScreen("mini-game");
    }
}

/* ---------- render deck via deckView.js ---------- */
function renderDeck() {
    const deckEl = document.getElementById("deck");
    if (!deckEl) {
        showUiError('Missing HTML: <div id="deck"></div>');
        return;
    }

    if (!currentPool.length && !additionalCards.length) {
        deckEl.innerHTML = "";
        showUiError("No cards in pool. Adjust filters or load extra cards.");
        return;
    }

    buildDeck({
        deckEl,
        items: currentPool,
        extraItems: additionalCards,
        deckSize: currentDeckSize,
        escapeHtml,
        shuffleArray,
        onOpenMiniGame,
        onDeckEmptyRebuild: () => renderDeck(),
    });
}

/* ---------- start / buttons ---------- */
function rebuildPoolFromUI() {
    const deps = {
        escapeHtml,
        prettyName,
        normalizeType,
        normalizeKey,
        normalizeTags,
        getDifficulty,
        getPlayers,
        getSpice,
        getSpecial,
        toInt,
        showUiError,
    };

    currentPool = buildPoolFromFilters(cardsData, deps);
    return currentPool;
}

function startGameFromFilters() {
    showUiError("");

    const deckSizeInput = document.getElementById("deckSizeInput");
    currentDeckSize = Math.max(1, toInt(deckSizeInput?.value, 5));

    rebuildPoolFromUI();

    // Additional loaded cards do NOT count toward deck size, but they can still create a playable deck.
    if (!currentPool.length && !additionalCards.length) {
        showUiError("No cards match your filters and no extra cards are loaded.");
        return;
    }

    showScreen("game");
    renderDeck();
}

function newDeckSameFilters() {
    showUiError("");
    if (!currentPool.length) rebuildPoolFromUI();
    renderDeck();
}

/* ---------- init ---------- */
async function init() {
    try {
        cardsData = await loadCardsJson();

        const deps = {
            escapeHtml,
            prettyName,
            normalizeType,
            normalizeKey,
            normalizeTags,
            getDifficulty,
            getPlayers,
            getSpice,
            getSpecial,
            toInt,
            showUiError,
            ids: { host: "filters" },
        };

        renderFiltersUI(cardsData, deps);

        setupAddCardsUI({
            ids: { host: "addCards" },
            escapeHtml,
            normalizeType,
            normalizeTags,
            getDifficulty,
            getPlayers,
            getSpice,
            getSpecial,
            showUiError,
            onCardsChanged: (cards) => {
                additionalCards = cards;
            },
        });

        document.getElementById("startButton")?.addEventListener("click", startGameFromFilters);
        document.getElementById("newDeckButton")?.addEventListener("click", newDeckSameFilters);
        document.getElementById("backButton")?.addEventListener("click", () => showScreen("config"));

        // Exit mini-game back to game screen.
        document.getElementById("exitMiniGameButton")?.addEventListener("click", () => {
            closeMiniGame("miniGameHost");
            clearMiniGameError();
            showScreen("game");
        });

        showScreen("config");
    } catch (err) {
        console.error(err);
        showUiError(err?.message || "Failed to initialize");
    }
}

init();
