// filters.js
// Renders filter UI + builds the filtered pool (tri-state tags).
//
// Tag states:
// 0 = neutral (ignored)
// 1 = required (card must include tag)
// 2 = excluded (card must NOT include tag)

export function renderFiltersUI(data, deps) {
    const {
        escapeHtml,
        prettyName,
        normalizeType,
        normalizeKey,
        getDifficulty,
        getPlayers,
        getSpice,
        showUiError,
        ids = { host: "filters" },
    } = deps;

    const host = document.getElementById(ids.host);
    if (!host) {
        showUiError?.('HTML is missing: <div id="filters"></div>');
        return;
    }

    const tagsTop = Array.isArray(data?.tags) ? data.tags.map(String) : [];
    const cards = Array.isArray(data?.cards) ? data.cards : [];

    // types from cards
    const types = Array.from(new Set(cards.map((c) => normalizeType(c?.type)).filter(Boolean))).sort();

    // ranges from cards
    const diffs = cards.map(getDifficulty);
    const spices = cards.map(getSpice);
    const players = cards.map(getPlayers);

    const minDiff = diffs.length ? Math.min(...diffs) : 0;
    const maxDiff = diffs.length ? Math.max(...diffs) : 5;

    const minSpice = spices.length ? Math.min(...spices) : 0;
    const maxSpice = spices.length ? Math.max(...spices) : 5;

    const minPlayers = players.length ? Math.min(...players) : 1;
    const maxPlayers = players.length ? Math.max(...players) : 4;

    host.innerHTML = `
    <div class="filters-grid">

      <div class="filter-block">
        <div class="filter-title">Tags</div>
        <div id="tagGrid" class="tag-grid"></div>
        <div class="filter-hint">
          Click a tag: Required ✓ → Excluded ✕ → Neutral.<br>
          Neutral tags may appear. Required tags must be on the card. Excluded tags must not be on the card.
        </div>
      </div>

      <div class="filter-block">
        <div class="filter-title">Type</div>
        <div id="typeGrid" class="type-grid"></div>
        <div class="filter-hint">If none selected, all types are allowed.</div>
      </div>

      <div class="filter-block">
        <div class="filter-title">Players</div>
        <div class="filter-row">
          <label>Min:</label>
          <input id="playersMin" type="number" min="${minPlayers}" max="${maxPlayers}" value="${minPlayers}" />
          <label>Max:</label>
          <input id="playersMax" type="number" min="${minPlayers}" max="${maxPlayers}" value="${maxPlayers}" />
        </div>
      </div>

      <div class="filter-block">
        <div class="filter-title">Difficulty</div>
        <div class="filter-row">
          <label>Min:</label>
          <input id="diffMin" type="number" min="${minDiff}" max="${maxDiff}" value="${minDiff}" />
          <label>Max:</label>
          <input id="diffMax" type="number" min="${minDiff}" max="${maxDiff}" value="${maxDiff}" />
        </div>
      </div>

      <div class="filter-block">
        <div class="filter-title">Spice</div>
        <div class="filter-row">
          <label>Min:</label>
          <input id="spiceMin" type="number" min="${minSpice}" max="${maxSpice}" value="${minSpice}" />
          <label>Max:</label>
          <input id="spiceMax" type="number" min="${minSpice}" max="${maxSpice}" value="${maxSpice}" />
        </div>
      </div>

      <div class="filter-block">
        <div class="filter-title">Quick actions</div>
        <div class="filter-actions">
          <button id="selectAllTagsBtn" type="button">Require all tags</button>
          <button id="clearTagsBtn" type="button">Neutral all tags</button>
          <button id="selectAllTypesBtn" type="button">Select all types</button>
          <button id="clearTypesBtn" type="button">Clear types</button>
        </div>
      </div>

    </div>
  `;

    // ---------- TAGS (tri-state pills) ----------
    const tagGrid = document.getElementById("tagGrid");
    if (tagGrid) {
        tagGrid.innerHTML = "";

        const applyState = (el, state) => {
            el.dataset.state = String(state);

            el.classList.toggle("is-required", state === 1);
            el.classList.toggle("is-excluded", state === 2);

            el.setAttribute("aria-pressed", state !== 0 ? "true" : "false");

            const mark = el.querySelector(".pill-mark");
            if (mark) mark.textContent = state === 1 ? "✓" : state === 2 ? "✕" : "";
        };

        const cycleState = (el) => {
            const cur = Number(el.dataset.state || "0");
            const next = (cur + 1) % 3;
            applyState(el, next);
        };

        tagsTop.forEach((tag) => {
            const norm = normalizeKey(tag);

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "pill-check tri-pill";
            btn.dataset.tag = tag;
            btn.dataset.tagNorm = norm;
            btn.dataset.state = "0";
            btn.setAttribute("aria-pressed", "false");

            btn.innerHTML = `
        <span class="pill-mark"></span>
        <span class="pill-text">${escapeHtml(prettyName(tag))}</span>
      `;

            btn.addEventListener("click", () => cycleState(btn));
            tagGrid.appendChild(btn);
        });

        // quick actions for tri-tags
        document.getElementById("selectAllTagsBtn")?.addEventListener("click", () => {
            document.querySelectorAll(".tri-pill").forEach((el) => applyState(el, 1));
        });

        document.getElementById("clearTagsBtn")?.addEventListener("click", () => {
            document.querySelectorAll(".tri-pill").forEach((el) => applyState(el, 0));
        });
    }

    // ---------- TYPES (checkboxes) ----------
    const typeGrid = document.getElementById("typeGrid");
    if (typeGrid) {
        typeGrid.innerHTML = "";
        const list = types.length ? types : ["question", "challenge", "game"];

        list.forEach((type) => {
            const id = `type_${type.replace(/\W+/g, "_")}`;

            const label = document.createElement("label");
            label.className = "pill-check";
            label.innerHTML = `
        <input type="checkbox" class="type-checkbox" id="${escapeHtml(id)}" data-type="${escapeHtml(type)}">
        <span>${escapeHtml(prettyName(type))}</span>
      `;
            typeGrid.appendChild(label);
        });
    }

    // quick actions for types
    document.getElementById("selectAllTypesBtn")?.addEventListener("click", () => {
        document.querySelectorAll(".type-checkbox").forEach((cb) => (cb.checked = true));
    });
    document.getElementById("clearTypesBtn")?.addEventListener("click", () => {
        document.querySelectorAll(".type-checkbox").forEach((cb) => (cb.checked = false));
    });
}

export function readFiltersFromUI(deps) {
    const { toInt } = deps;

    const requiredTags = new Set();
    const excludedTags = new Set();

    document.querySelectorAll(".tri-pill").forEach((el) => {
        const state = Number(el.dataset.state || "0");
        const norm = el.dataset.tagNorm;
        if (!norm) return;

        if (state === 1) requiredTags.add(norm);
        if (state === 2) excludedTags.add(norm);
    });

    const selectedTypes = new Set(
        Array.from(document.querySelectorAll(".type-checkbox"))
            .filter((cb) => cb.checked)
            .map((cb) => cb.dataset.type)
            .filter(Boolean)
    );

    const playersMin = toInt(document.getElementById("playersMin")?.value, 0);
    const playersMax = toInt(document.getElementById("playersMax")?.value, 99);

    const diffMin = toInt(document.getElementById("diffMin")?.value, 0);
    const diffMax = toInt(document.getElementById("diffMax")?.value, 99);

    const spiceMin = toInt(document.getElementById("spiceMin")?.value, 0);
    const spiceMax = toInt(document.getElementById("spiceMax")?.value, 99);

    return {
        requiredTags,
        excludedTags,
        selectedTypes,
        playersMin,
        playersMax,
        diffMin,
        diffMax,
        spiceMin,
        spiceMax,
    };
}

export function buildPoolFromFilters(data, deps) {
    const {
        readFiltersFromUIFn = readFiltersFromUI,
        normalizeType,
        normalizeKey,
        normalizeTags,
        getPlayers,
        getDifficulty,
        getSpice,
        getSpecial,
    } = deps;

    const cards = Array.isArray(data?.cards) ? data.cards : [];
    const f = readFiltersFromUIFn(deps);

    const playersMin = Math.min(f.playersMin, f.playersMax);
    const playersMax = Math.max(f.playersMin, f.playersMax);

    const diffMin = Math.min(f.diffMin, f.diffMax);
    const diffMax = Math.max(f.diffMin, f.diffMax);

    const spiceMin = Math.min(f.spiceMin, f.spiceMax);
    const spiceMax = Math.max(f.spiceMin, f.spiceMax);

    const requireTypes = f.selectedTypes.size > 0;
    const requireTags = f.requiredTags.size > 0;
    const excludeTags = f.excludedTags.size > 0;

    const pool = [];

    cards.forEach((raw) => {
        if (!raw || typeof raw !== "object") return;

        const type = normalizeType(raw.type);
        const text = String(raw.text ?? "").trim();
        const url = raw.url ? String(raw.url).trim() : "";

        const isGame = type === "game";
        if (isGame) {
            if (!url) return;
        } else {
            if (!text) return;
        }

        const players = getPlayers(raw);
        const difficulty = getDifficulty(raw);
        const spice = getSpice(raw);
        const special = getSpecial(raw);
        const tags = normalizeTags(raw.tags);

        // numeric filters
        if (players) {
            if (players < playersMin || players > playersMax) return;
        }
        if (difficulty < diffMin || difficulty > diffMax) return;
        if (spice < spiceMin || spice > spiceMax) return;

        // type filter
        if (requireTypes && !f.selectedTypes.has(type)) return;

        const tagsNorm = tags.map(normalizeKey).filter(Boolean);

        // excluded: if card has ANY excluded tag -> drop
        if (excludeTags) {
            const hasExcluded = tagsNorm.some((t) => f.excludedTags.has(t));
            if (hasExcluded) return;
        }

        // required: card must contain ALL required tags
        if (requireTags) {
            if (tagsNorm.length === 0) return;
            const hasAllRequired = Array.from(f.requiredTags).every((t) => tagsNorm.includes(t));
            if (!hasAllRequired) return;
        }

        pool.push({ text, type, url, players, difficulty, spice, special, tags });
    });

    return pool;
}
