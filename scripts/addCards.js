// addCards.js
// UI + logic for adding extra cards from:
// 1) an uploaded JSON file,
// 2) JSON written directly into a text box,
// 3) the visual card creator.
//
// Important behavior:
// - Added cards are ALWAYS added to the final deck.
// - Added cards do NOT count toward the selected deck size.
// - Added cards are randomly mixed with the filtered cards in deckView.js.
// - Loading cards from a file or from the text box replaces the previously loaded extra cards.
// - Cards made in the visual creator are appended to the currently loaded extra cards.
//
// Static browser limitation:
// A normal static web page cannot directly write into styles/cards-special-custom.css on disk.
// This file stores custom card-back styles in localStorage and injects them into the page.
// styles/cards-special-custom.css can stay as a placeholder for future backend/build support.

const EXAMPLE_CARDS_JSON = `[
  {
    "text": "Tell one thing you want to try together this month.",
    "type": "question",
    "players": 2,
    "dificulty": 1,
    "spice": 1,
    "tags": ["relationship", "thoughts/opinions"]
  }
]`;

const CUSTOM_BACKS_STORAGE_KEY = "coupleCottageCards.customBacks.v1";
const CUSTOM_BACKS_STYLE_ID = "customCardBackStyles";

const DEFAULT_ICON = "⭐";
const DEFAULT_GRADIENT = {
    angle: 135,
    hueA: 216,
    hueB: 216,
    saturation: 100,
    lightnessA: 71,
    lightnessB: 77,
};

export function setupAddCardsUI({
                                    ids = { host: "addCards" },
                                    escapeHtml,
                                    normalizeType,
                                    normalizeTags,
                                    getDifficulty,
                                    getPlayers,
                                    getSpice,
                                    getSpecial,
                                    showUiError,
                                    onCardsChanged,
                                }) {
    const host = document.getElementById(ids.host);
    if (!host) {
        showUiError?.('HTML is missing: <div id="addCards"></div>');
        return;
    }

    let addedCards = [];
    let customBacks = loadCustomBacks();
    let createdCardCounter = 1;

    injectCustomBackStyles(customBacks);

    host.innerHTML = `
        <div class="add-cards-grid">
            <div class="filter-block add-cards-block">
                <div class="filter-title">Add additional cards</div>

                <p class="filter-hint">
                    Upload JSON, write JSON, or create a card visually. These cards are always included in the final deck,
                    do not count toward deck size, and are randomly mixed with the filtered cards.
                </p>

                <div class="add-cards-actions">
                    <button id="loadExtraCardsBtn" type="button">Load cards</button>
                    <button id="writeExtraCardsBtn" type="button" class="secondary-button">Write cards</button>
                    <button id="createExtraCardBtn" type="button" class="secondary-button">Create cards</button>
                    <button id="clearExtraCardsBtn" type="button" class="secondary-button">Clear loaded cards</button>
                </div>

                <input id="extraCardsFileInput" class="hidden" type="file" accept="application/json,.json" />

                <div id="addCardsEditor" class="add-cards-editor hidden">
                    <label class="add-cards-label" for="extraCardsTextInput">Cards JSON</label>
                    <textarea id="extraCardsTextInput" class="add-cards-textarea" spellcheck="false"></textarea>

                    <div class="add-cards-editor-actions">
                        <button id="loadWrittenCardsBtn" type="button">Load written cards</button>
                        <button id="resetWrittenCardsExampleBtn" type="button" class="secondary-button">Reset example</button>
                    </div>

                    <p class="filter-hint">
                        You can write either an array of cards, or an object with a <b>cards</b> array.
                    </p>
                </div>

                <div id="addCardsCreator" class="add-cards-creator hidden">
                    <div class="add-cards-creator-header">
                        <div>
                            <div class="filter-title">Create card</div>
                            <p class="filter-hint">
                                Write directly on the text side. Tap the icon to type or paste any emoji. Tap the back outside the icon to edit gradient sliders and special type.
                            </p>
                        </div>
                    </div>

                    <div class="card-creator-preview">
                        <div id="creatorTextFace" class="creator-card-face creator-card-text-face" aria-label="Edit card text">
                            <div
                                id="creatorTextValue"
                                class="creator-text-value"
                                contenteditable="true"
                                role="textbox"
                                aria-multiline="true"
                                data-placeholder="Your text"
                                spellcheck="true"
                            ></div>
                        </div>

                        <div id="creatorBackFace" class="creator-card-face creator-card-back-face" aria-label="Edit card back style">
                            <input
                                id="creatorIconInput"
                                class="creator-icon-input"
                                type="text"
                                value="${escapeHtml(DEFAULT_ICON)}"
                                aria-label="Card icon"
                                maxlength="12"
                                autocomplete="off"
                                spellcheck="false"
                            />
                            <span class="creator-back-label">Tap icon to edit · tap background for style</span>
                        </div>
                    </div>

                    <div id="creatorStyleEditor" class="creator-editor-box hidden">
                        <div class="creator-control-grid">
                            <label class="creator-control">
                                <span class="creator-control-header">
                                    First colour hue
                                    <output id="creatorHueAValue" class="creator-slider-value">28</output>
                                </span>
                                <input id="creatorHueA" type="range" min="0" max="360" value="28" />
                            </label>

                            <label class="creator-control">
                                <span class="creator-control-header">
                                    Second colour hue
                                    <output id="creatorHueBValue" class="creator-slider-value">36</output>
                                </span>
                                <input id="creatorHueB" type="range" min="0" max="360" value="36" />
                            </label>

                            <label class="creator-control">
                                <span class="creator-control-header">
                                    First colour lightness
                                    <output id="creatorLightnessAValue" class="creator-slider-value">50%</output>
                                </span>
                                <input id="creatorLightnessA" type="range" min="20" max="80" value="50" />
                            </label>

                            <label class="creator-control">
                                <span class="creator-control-header">
                                    Second colour lightness
                                    <output id="creatorLightnessBValue" class="creator-slider-value">64%</output>
                                </span>
                                <input id="creatorLightnessB" type="range" min="20" max="85" value="64" />
                            </label>

                            <label class="creator-control creator-control-wide">
                                <span>Special type</span>
                                <input id="creatorSpecialInput" type="text" value="custom-1" />
                            </label>
                        </div>

                        <p class="filter-hint">
                            Special type becomes a CSS class. Example: <b>custom-1</b> creates <b>.special-custom-1</b>.
                        </p>
                    </div>

                    <div class="creator-actions">
                        <button id="addCreatedCardBtn" type="button">Add card</button>
                        <button id="discardCreatedCardBtn" type="button" class="secondary-button">Discard</button>
                    </div>
                </div>

                <div id="addCardsStatus" class="add-cards-status">No extra cards loaded.</div>
                <div id="addCardsError" class="add-cards-error hidden"></div>
                <div id="addCardsPreview" class="add-cards-preview hidden"></div>
            </div>
        </div>
    `;

    const fileInput = document.getElementById("extraCardsFileInput");
    const loadBtn = document.getElementById("loadExtraCardsBtn");
    const writeBtn = document.getElementById("writeExtraCardsBtn");
    const createBtn = document.getElementById("createExtraCardBtn");
    const clearBtn = document.getElementById("clearExtraCardsBtn");

    const editorEl = document.getElementById("addCardsEditor");
    const textInput = document.getElementById("extraCardsTextInput");
    const loadWrittenBtn = document.getElementById("loadWrittenCardsBtn");
    const resetExampleBtn = document.getElementById("resetWrittenCardsExampleBtn");

    const creatorEl = document.getElementById("addCardsCreator");
    const creatorTextValue = document.getElementById("creatorTextValue");
    const creatorBackFace = document.getElementById("creatorBackFace");
    const creatorIconInput = document.getElementById("creatorIconInput");
    const creatorStyleEditor = document.getElementById("creatorStyleEditor");
    const creatorSpecialInput = document.getElementById("creatorSpecialInput");
    const addCreatedCardBtn = document.getElementById("addCreatedCardBtn");
    const discardCreatedCardBtn = document.getElementById("discardCreatedCardBtn");

    const gradientInputs = {
        hueA: document.getElementById("creatorHueA"),
        hueB: document.getElementById("creatorHueB"),
        lightnessA: document.getElementById("creatorLightnessA"),
        lightnessB: document.getElementById("creatorLightnessB"),
    };

    const gradientOutputs = {
        hueA: document.getElementById("creatorHueAValue"),
        hueB: document.getElementById("creatorHueBValue"),
        lightnessA: document.getElementById("creatorLightnessAValue"),
        lightnessB: document.getElementById("creatorLightnessBValue"),
    };

    const statusEl = document.getElementById("addCardsStatus");
    const errorEl = document.getElementById("addCardsError");
    const previewEl = document.getElementById("addCardsPreview");

    if (textInput) {
        textInput.value = EXAMPLE_CARDS_JSON;
    }

    resetCreatorDraft();

    function setError(msg) {
        if (!errorEl) return;
        errorEl.textContent = String(msg ?? "");
        errorEl.classList.toggle("hidden", !msg);
    }

    function updateStatus(sourceName = "") {
        if (!statusEl) return;

        if (!addedCards.length) {
            statusEl.textContent = "No extra cards loaded.";
            return;
        }

        const sourcePart = sourceName ? ` from ${sourceName}` : "";
        statusEl.textContent = `${addedCards.length} extra card${addedCards.length === 1 ? "" : "s"} loaded${sourcePart}.`;
    }

    function updatePreview() {
        if (!previewEl) return;

        if (!addedCards.length) {
            previewEl.innerHTML = "";
            previewEl.classList.add("hidden");
            return;
        }

        const maxPreview = 7;
        const previewItems = addedCards.slice(0, maxPreview);
        const remaining = Math.max(0, addedCards.length - previewItems.length);

        previewEl.innerHTML = `
            <div class="add-cards-preview-title">Preview</div>
            <ul>
                ${previewItems.map((card) => {
            const type = card.type ? `[${card.type}] ` : "";
            const special = card.special ? ` {${card.special}} ` : "";
            const text = card.text || card.url || "Untitled card";
            return `<li>${escapeHtml(type + special + text)}</li>`;
        }).join("")}
            </ul>
            ${remaining ? `<div class="filter-hint">...and ${remaining} more.</div>` : ""}
        `;
        previewEl.classList.remove("hidden");
    }

    function publishCards(sourceName = "") {
        if (typeof onCardsChanged === "function") {
            onCardsChanged(addedCards.slice());
        }
        updateStatus(sourceName);
        updatePreview();
    }

    function clearCards() {
        addedCards = [];
        setError("");
        if (fileInput) fileInput.value = "";
        publishCards();
    }

    function extractCardsArray(parsed) {
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.cards)) return parsed.cards;
        throw new Error("JSON must be either an array of cards or an object with a 'cards' array.");
    }

    function normalizeLoadedCard(raw, index) {
        if (!raw || typeof raw !== "object") {
            throw new Error(`Card ${index + 1} is not an object.`);
        }

        const type = normalizeType(raw.type || "question") || "question";
        const text = String(raw.text ?? "").trim();
        const url = raw.url ? String(raw.url).trim() : "";
        const isGame = type === "game";

        if (isGame && !url) {
            throw new Error(`Card ${index + 1} is a game card but is missing 'url'.`);
        }

        if (!isGame && !text) {
            throw new Error(`Card ${index + 1} is missing 'text'.`);
        }

        return {
            text: text || "Mini Game",
            type,
            url,
            players: getPlayers(raw),
            difficulty: getDifficulty(raw),
            spice: getSpice(raw),
            special: getSpecial(raw),
            tags: normalizeTags(raw.tags),
        };
    }

    function loadCardsFromParsedJson(parsed, sourceName) {
        const rawCards = extractCardsArray(parsed);
        const normalizedCards = rawCards.map((card, index) => normalizeLoadedCard(card, index));

        if (!normalizedCards.length) {
            throw new Error("The JSON does not contain any cards.");
        }

        addedCards = normalizedCards;
        publishCards(sourceName);
    }

    async function loadCardsFromFile(file) {
        if (!file) return;

        setError("");

        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            loadCardsFromParsedJson(parsed, file.name || "selected file");
        } catch (err) {
            console.error("Failed to load extra cards:", err);
            addedCards = [];
            publishCards();
            setError(err?.message || "Failed to load cards from JSON file.");
        }
    }

    function loadCardsFromTextBox() {
        if (!textInput) return;

        setError("");

        try {
            const rawText = textInput.value.trim();
            if (!rawText) {
                throw new Error("The text box is empty. Write cards in JSON format first.");
            }

            const parsed = JSON.parse(rawText);
            loadCardsFromParsedJson(parsed, "written JSON");
        } catch (err) {
            console.error("Failed to load written cards:", err);
            addedCards = [];
            publishCards();
            setError(err?.message || "Failed to load written cards.");
        }
    }

    function toggleEditor() {
        if (!editorEl) return;

        const willShow = editorEl.classList.contains("hidden");
        editorEl.classList.toggle("hidden", !willShow);

        if (writeBtn) {
            writeBtn.textContent = willShow ? "Hide writer" : "Write cards";
        }

        if (willShow) {
            textInput?.focus();
        }
    }

    function toggleCreator() {
        if (!creatorEl) return;

        const willShow = creatorEl.classList.contains("hidden");
        creatorEl.classList.toggle("hidden", !willShow);

        if (createBtn) {
            createBtn.textContent = willShow ? "Hide creator" : "Create cards";
        }

        if (willShow) {
            creatorTextValue?.focus();
        }
    }

    function toSliderInt(el, fallback) {
        const n = parseInt(String(el?.value ?? ""), 10);
        if (!Number.isFinite(n)) return fallback;

        const min = parseInt(String(el?.min ?? ""), 10);
        const max = parseInt(String(el?.max ?? ""), 10);
        const safeMin = Number.isFinite(min) ? min : Number.MIN_SAFE_INTEGER;
        const safeMax = Number.isFinite(max) ? max : Number.MAX_SAFE_INTEGER;

        return Math.max(safeMin, Math.min(safeMax, n));
    }

    function getGradientSettings() {
        return {
            hueA: toSliderInt(gradientInputs.hueA, DEFAULT_GRADIENT.hueA),
            hueB: toSliderInt(gradientInputs.hueB, DEFAULT_GRADIENT.hueB),
            lightnessA: toSliderInt(gradientInputs.lightnessA, DEFAULT_GRADIENT.lightnessA),
            lightnessB: toSliderInt(gradientInputs.lightnessB, DEFAULT_GRADIENT.lightnessB),
        };
    }

    function buildGradientFromSettings(settings) {
        const s = settings || DEFAULT_GRADIENT;

        return `linear-gradient(${DEFAULT_GRADIENT.angle}deg, hsl(${s.hueA} ${DEFAULT_GRADIENT.saturation}% ${s.lightnessA}%), hsl(${s.hueB} ${DEFAULT_GRADIENT.saturation}% ${s.lightnessB}%))`;
    }

    function updateSliderLabels(settings = getGradientSettings()) {
        if (gradientOutputs.hueA) gradientOutputs.hueA.textContent = String(settings.hueA);
        if (gradientOutputs.hueB) gradientOutputs.hueB.textContent = String(settings.hueB);
        if (gradientOutputs.lightnessA) gradientOutputs.lightnessA.textContent = `${settings.lightnessA}%`;
        if (gradientOutputs.lightnessB) gradientOutputs.lightnessB.textContent = `${settings.lightnessB}%`;
    }

    function sanitizeSpecialType(value) {
        const cleaned = String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/^special-/, "")
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        return cleaned || `custom-card-${Date.now()}`;
    }

    function creatorDraftText() {
        return String(creatorTextValue?.textContent ?? "").trim();
    }

    function creatorDraftIcon() {
        return String(creatorIconInput?.value ?? "").trim() || DEFAULT_ICON;
    }

    function updateCreatorPreview() {
        const settings = getGradientSettings();
        const gradient = buildGradientFromSettings(settings);

        updateSliderLabels(settings);

        if (creatorBackFace) {
            creatorBackFace.style.background = gradient;
        }
    }

    function resetGradientSliders() {
        Object.entries(DEFAULT_GRADIENT).forEach(([key, value]) => {
            if (gradientInputs[key]) gradientInputs[key].value = String(value);
        });
    }

    function resetCreatorDraft() {
        if (creatorTextValue) creatorTextValue.innerHTML = "";
        if (creatorIconInput) creatorIconInput.value = DEFAULT_ICON;
        resetGradientSliders();
        if (creatorSpecialInput) creatorSpecialInput.value = `custom-${createdCardCounter}`;
        if (creatorStyleEditor) creatorStyleEditor.classList.add("hidden");
        updateCreatorPreview();
    }

    function showCreatorStyleEditor() {
        creatorStyleEditor?.classList.remove("hidden");
    }

    function addCreatedCard() {
        setError("");

        const text = creatorDraftText();
        if (!text) {
            setError("Write text for the created card first.");
            creatorTextValue?.focus();
            return;
        }

        const special = sanitizeSpecialType(creatorSpecialInput?.value || `custom-${createdCardCounter}`);
        const icon = creatorDraftIcon();
        const gradient = buildGradientFromSettings(getGradientSettings());

        const customBack = {
            special,
            icon,
            gradient,
        };

        customBacks = {
            ...customBacks,
            [special]: customBack,
        };
        saveCustomBacks(customBacks);
        injectCustomBackStyles(customBacks);

        addedCards.push({
            text,
            type: "question",
            url: "",
            players: 0,
            difficulty: 0,
            spice: 0,
            special,
            tags: ["custom"],
        });

        createdCardCounter += 1;
        publishCards("card creator");
        resetCreatorDraft();
        creatorTextValue?.focus();
    }

    function buildCustomBackCss(back) {
        const special = sanitizeSpecialType(back.special);
        const selector = `.card.special-${cssEscapeLite(special)}`;
        const gradient = sanitizeCssGradient(back.gradient);
        const icon = sanitizeCssContent(back.icon || DEFAULT_ICON);

        return `
${selector}{
    box-shadow: 0 16px 34px rgba(30, 60, 120, 0.28);
}

${selector} .card-front{
    background: ${gradient};
}

${selector} .card-front::after{
    content: "${icon}";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 96px;
    opacity: 0.95;
    pointer-events: none;
    filter:
        drop-shadow(0 0 2px rgba(0,0,0,0.9))
        drop-shadow(0 0 6px rgba(0,0,0,0.7))
        drop-shadow(0 0 12px rgba(0,0,0,0.45))
        drop-shadow(0 6px 16px rgba(0,0,0,0.35));
}`;
    }

    function injectCustomBackStyles(backs) {
        let styleEl = document.getElementById(CUSTOM_BACKS_STYLE_ID);
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = CUSTOM_BACKS_STYLE_ID;
            document.head.appendChild(styleEl);
        }

        const css = Object.values(backs || {})
            .filter((back) => back && back.special)
            .map(buildCustomBackCss)
            .join("\n\n");

        styleEl.textContent = css;
    }

    function loadCustomBacks() {
        try {
            const raw = localStorage.getItem(CUSTOM_BACKS_STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
            return parsed;
        } catch (err) {
            console.warn("Failed to load custom card backs:", err);
            return {};
        }
    }

    function saveCustomBacks(backs) {
        try {
            localStorage.setItem(CUSTOM_BACKS_STORAGE_KEY, JSON.stringify(backs || {}));
        } catch (err) {
            console.warn("Failed to save custom card backs:", err);
        }
    }

    function sanitizeCssGradient(value) {
        const str = String(value ?? "").trim();
        const safeGradientPattern = /^linear-gradient\(\s*(?:[0-9]|[1-9][0-9]|[1-2][0-9]{2}|3[0-5][0-9]|360)deg\s*,\s*hsl\(\s*(?:[0-9]|[1-9][0-9]|[1-2][0-9]{2}|3[0-5][0-9]|360)\s+(?:[0-9]|[1-9][0-9]|100)%\s+(?:[0-9]|[1-9][0-9]|100)%\s*\)\s*,\s*hsl\(\s*(?:[0-9]|[1-9][0-9]|[1-2][0-9]{2}|3[0-5][0-9]|360)\s+(?:[0-9]|[1-9][0-9]|100)%\s+(?:[0-9]|[1-9][0-9]|100)%\s*\)\s*\)$/i;

        if (safeGradientPattern.test(str)) return str;
        return buildGradientFromSettings(DEFAULT_GRADIENT);
    }

    function sanitizeCssContent(value) {
        return String(value ?? DEFAULT_ICON)
            .replaceAll("\\", "\\\\")
            .replaceAll('"', '\\"')
            .replace(/[\n\r]/g, " ");
    }

    function cssEscapeLite(value) {
        return String(value ?? "")
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .replace(/^-+/, "");
    }

    loadBtn?.addEventListener("click", () => {
        fileInput?.click();
    });

    writeBtn?.addEventListener("click", toggleEditor);
    createBtn?.addEventListener("click", toggleCreator);
    clearBtn?.addEventListener("click", clearCards);

    resetExampleBtn?.addEventListener("click", () => {
        if (textInput) {
            textInput.value = EXAMPLE_CARDS_JSON;
            textInput.focus();
        }
        setError("");
    });

    loadWrittenBtn?.addEventListener("click", loadCardsFromTextBox);

    fileInput?.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        loadCardsFromFile(file);
    });

    creatorTextValue?.addEventListener("input", () => {
        if (!creatorDraftText()) {
            creatorTextValue.innerHTML = "";
        }
    });

    creatorTextValue?.addEventListener("paste", (event) => {
        event.preventDefault();
        const pastedText = event.clipboardData?.getData("text/plain") || "";
        document.execCommand("insertText", false, pastedText);
    });

    creatorIconInput?.addEventListener("click", (event) => {
        event.stopPropagation();
        creatorIconInput.focus();
        creatorIconInput.select();
    });

    creatorIconInput?.addEventListener("input", () => {
        if (!creatorDraftIcon()) creatorIconInput.value = DEFAULT_ICON;
    });

    creatorBackFace?.addEventListener("click", (event) => {
        if (event.target === creatorIconInput) return;
        showCreatorStyleEditor();
    });

    Object.values(gradientInputs).forEach((input) => {
        input?.addEventListener("input", updateCreatorPreview);
    });

    addCreatedCardBtn?.addEventListener("click", addCreatedCard);
    discardCreatedCardBtn?.addEventListener("click", resetCreatorDraft);

    publishCards();
}
