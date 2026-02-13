// deckView.js
// Responsible only for rendering the deck + handling clicks/flips.

export function buildDeck({
                              deckEl,
                              items,
                              deckSize,
                              escapeHtml,
                              shuffleArray,
                              onOpenMiniGame,      // async (url, title) => void
                              onDeckEmptyRebuild,  // () => void
                          }) {
    if (!deckEl) return;

    const MAX_VISIBLE = 25;

    // Build the FULL logical deck once (no visual cap here)
    const shuffled = shuffleArray(items);
    const fullSize = Math.min(deckSize, shuffled.length);
    const deck = shuffled.slice(0, fullSize); // last is the "top"

    function makeCard(item, stackIndex, zIndex) {
        const card = document.createElement("div");
        card.className = "card";

        // store the item so click handler can read it reliably
        card.__item = item;

        // offset + stacking
        card.style.setProperty("--stack-index", stackIndex);
        card.style.zIndex = String(zIndex);

        const type = item?.type || "text";
        card.dataset.cardType = type;

        // special
        if (item?.special) {
            const cls = "special-" + String(item.special).trim().toLowerCase().replace(/\s+/g, "-");
            card.classList.add("is-special", cls);
            card.dataset.special = String(item.special);
        }

        const front = document.createElement("div");
        front.className = "card-face card-front";

        const back = document.createElement("div");
        back.className = "card-face card-back";

        if (type === "game") {
            const title = String(item?.text || "Mini Game").trim();
            const url = String(item?.url || "").trim();

            // Show ONLY title + bottom hint (never show url)
            back.innerHTML = `
        <div class="card-back-content">
          <div class="game-title"> ${escapeHtml(title)}</div>
          <div class="game-hint">Click again to open</div>
        </div>
      `;

            // Store url/title for click handler (not visible)
            card.dataset.gameUrl = url;
            card.dataset.gameTitle = title;
        } else {
            back.textContent = String(item?.text || "");
        }

        card.appendChild(front);
        card.appendChild(back);
        return card;
    }

    function renderVisible() {
        deckEl.innerHTML = "";

        const visibleCount = Math.min(MAX_VISIBLE, deck.length);

        // Show only the TOP visibleCount cards (append bottom -> top)
        const start = Math.max(0, deck.length - visibleCount);
        const visible = deck.slice(start);

        visible.forEach((item, i) => {
            const depthFromTop = (visibleCount - 1) - i; // top card => 0

            const card = makeCard(item, i, 100 + i);
            card.style.setProperty("--depth", depthFromTop);

            deckEl.appendChild(card);
        });
    }

    // initial render
    renderVisible();

    // Click behavior: first flip, second remove (or open game)
    deckEl.onclick = async () => {
        const topCard = deckEl.lastElementChild;
        if (!topCard) return;

        if (!topCard.classList.contains("is-flipped")) {
            topCard.classList.add("is-flipped");
            return;
        }

        const item = topCard.__item;
        const type = topCard.dataset.cardType;

        // Remove from logical deck (top is always the last item)
        deck.pop();

        // Re-render immediately
        renderVisible();

        if (type === "game") {
            const url = (item?.url ? String(item.url).trim() : String(topCard.dataset.gameUrl || "").trim());
            const title = (item?.text ? String(item.text).trim() : String(topCard.dataset.gameTitle || "Mini Game").trim());

            if (typeof onOpenMiniGame === "function" && url) {
                await onOpenMiniGame(url, title);
            } else {
                console.warn("Game card missing url:", item);
            }
        }

        if (deck.length === 0 && typeof onDeckEmptyRebuild === "function") {
            onDeckEmptyRebuild();
        }
    };
}
