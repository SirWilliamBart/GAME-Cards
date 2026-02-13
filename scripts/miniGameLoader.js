// miniGameLoader.js
let currentCleanup = null;
let currentCssHref = null;

function dirnameUrl(url) {
    const u = new URL(url);
    u.pathname = u.pathname.replace(/\/[^/]*$/, "/");
    u.search = "";
    u.hash = "";
    return u.toString().replace(/\/$/, ""); // no trailing slash for consistency
}

function normalizeBase(baseUrl) {
    const raw = String(baseUrl || "").trim();
    if (!raw) throw new Error("openMiniGame: baseUrl is empty");

    // IMPORTANT: resolve relative to the HTML page, not to this JS module
    const abs = new URL(raw, document.baseURI).toString();

    // If user passed ".../game.html", use that file; otherwise treat as folder
    if (abs.toLowerCase().endsWith(".html")) {
        const base = dirnameUrl(abs);
        return {
            base,
            htmlUrl: abs,
            cssUrl: `${base}/game.css`,
            jsUrl: `${base}/game.js`,
        };
    }

    const base = abs.replace(/\/$/, "");
    return {
        base,
        htmlUrl: `${base}/game.html`,
        cssUrl: `${base}/game.css`,
        jsUrl: `${base}/game.js`,
    };
}

function ensureCssLoaded(href) {
    // remove previous mini-game CSS if different (prevents style leaks)
    if (currentCssHref && currentCssHref !== href) {
        document.querySelector(`link[data-mini-css="${currentCssHref}"]`)?.remove();
        currentCssHref = null;
    }

    let link = document.querySelector(`link[data-mini-css="${href}"]`);
    if (!link) {
        link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.miniCss = href;
        document.head.appendChild(link);
    }
    currentCssHref = href;
}

function cleanupNow() {
    if (typeof currentCleanup === "function") {
        try { currentCleanup(); } catch (e) { console.warn("cleanup failed:", e); }
    }
    currentCleanup = null;
}

export function closeMiniGame(hostId = "miniGameHost") {
    cleanupNow();
    const host = document.getElementById(hostId);
    if (host) host.innerHTML = "";
}

export async function openMiniGame(opts) {
    const {
        baseUrl,
        title,
        showScreen,
        showMiniGameError,
        clearMiniGameError,
        ids = { host: "miniGameHost", title: "miniGameTitle" },
    } = opts || {};

    clearMiniGameError?.();

    // cleanup any previous game before opening a new one
    cleanupNow();

    const { base, htmlUrl, cssUrl, jsUrl } = normalizeBase(baseUrl);

    const host = document.getElementById(ids.host);
    if (!host) throw new Error(`Missing HTML host element: #${ids.host}`);

    showScreen?.("mini-game");

    const titleEl = document.getElementById(ids.title);
    if (titleEl) titleEl.textContent = String(title || "Mini Game");

    // 1) Fetch HTML
    let htmlText = "";
    try {
        const res = await fetch(htmlUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load ${htmlUrl} (${res.status})`);
        htmlText = await res.text();
    } catch (e) {
        console.error(e);
        showMiniGameError?.(`Failed to load mini-game HTML.\n${String(e?.message || e)}`);
        throw e;
    }

    host.innerHTML = htmlText;

    // 2) Load CSS
    try { ensureCssLoaded(cssUrl); } catch (e) { console.warn("CSS load failed:", e); }

    // 3) Import JS module (absolute URL!)
    // Cache-bust in dev; remove ?v=... later if you want caching
    const moduleUrl = `${jsUrl}?v=${Date.now()}`;

    let mod;
    try {
        mod = await import(moduleUrl);
    } catch (e) {
        console.error(e);
        showMiniGameError?.(
            `Failed to import mini-game JS.\nExpected: ${jsUrl}\n` +
            `If your folder is correct, check that game.js exists and is served by the server.\n` +
            `Error: ${String(e?.message || e)}`
        );
        throw e;
    }

    const initFn =
        (typeof mod.initMiniGame === "function" && mod.initMiniGame) ||
        (typeof mod.initPong === "function" && mod.initPong) ||
        (typeof mod.default === "function" && mod.default) ||
        null;

    if (!initFn) {
        const msg =
            `Mini-game module has no init function.\n` +
            `Export one of: initMiniGame(), initPong(), or default.\n` +
            `Module: ${jsUrl}`;
        showMiniGameError?.(msg);
        throw new Error(msg);
    }

    const api = {
        baseUrl: base,
        close: () => closeMiniGame(ids.host),
        showError: (m) => showMiniGameError?.(m),
        clearError: () => clearMiniGameError?.(),
    };

    const cleanup = initFn(host, api);
    if (typeof cleanup === "function") currentCleanup = cleanup;
}
