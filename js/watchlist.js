// watchlist storage helpers
const WATCHLIST_KEY = "movieFinderWatchlist";
const loadWatchlist = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn("Failed to read watchlist", err);
        return [];
    }
};
const saveWatchlist = (list) => {
    try {
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    } catch (err) {
        console.warn("Failed to write watchlist", err);
    }
};

const removeFromWatchlist = (id, type) => {
    const current = loadWatchlist();
    const next = current.filter((entry) => !(entry.id === id && entry.type === type));
    saveWatchlist(next);
    return next;
};

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const safe = (v) => (v == null ? "" : String(v));

function watchlistCard(item) {
    const poster = item.poster || "";
    const title = safe(item.title);
    const typeLabel = item.type === "tv" ? "TV Show" : "Movie";
    return `
      <article class="card">
        ${poster ? `<img class="movie-poster" loading="lazy" src="${poster}" alt="${title} poster">` : ""}
        <div class="card-body">
          <h3 class="movie-title">${title}</h3>
          <p class="meta">${typeLabel}</p>
          <button
            class="remove-from-watchlist-btn"
            data-id="${item.id}"
            data-type="${item.type}"
          >
            Remove
          </button>
        </div>
      </article>
    `;
}


function renderWatchlist() {
    // 1. Get Elements and Data
    const recentlyAddedContainer = $("recently-added-content");
    const fullListContainer = $("full-watchlist-content");
    const recentlyAddedSection = $("recently-added-section");
    const emptyMessage = $("watchlist-empty");

    // 💡 CRITICAL FIX: Ensure all required elements exist
    if (!recentlyAddedContainer || !fullListContainer || !recentlyAddedSection || !emptyMessage) {
        console.error("Missing required elements in watchlist.html");
        return;
    }

    const list = loadWatchlist();
    
    // Check for empty list
    if (!list.length) {
        recentlyAddedContainer.innerHTML = "";
        fullListContainer.innerHTML = "";
        recentlyAddedSection.style.display = "none";
        emptyMessage.style.display = "block";
        return;
    }

    // 2. Process URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const newIdsParam = urlParams.get('new_ids');
    // Ensure IDs are parsed as numbers for strict comparison
    const newIds = newIdsParam ? newIdsParam.split(',').map(id => Number(id.trim())) : [];

    // 3. Divide the Watchlist
    const newlyAddedItems = list.filter(item => newIds.includes(item.id));
    // Filter out the newly added items from the existing list
    // const existingItems = list.filter(item => !newIds.includes(item.id));
    const existingItems = list;

    // 4. Render the "Recently Added" Section
    if (newlyAddedItems.length > 0) {
        recentlyAddedSection.style.display = "block";
        recentlyAddedContainer.innerHTML = newlyAddedItems.map(item => {
            let cardHtml = watchlistCard(item);
            // Add a permanent visual highlight cue to the 'new' items
            return cardHtml.replace('<article class="card">', '<article class="card newly-added-marker">');
        }).join("");
    } else {
        recentlyAddedSection.style.display = "none";
        recentlyAddedContainer.innerHTML = "";
    }

    // 5. Render the "My Full List" Section
    fullListContainer.innerHTML = existingItems.map(item => watchlistCard(item)).join("");
    
    // Ensure the main empty message is hidden if we have ANY content
    emptyMessage.style.display = "none";
}

// ---------- wire up once DOM is ready ----------
document.addEventListener("DOMContentLoaded", () => {
    const recentlyAddedContent = $("recently-added-content");
    const fullWatchlistContent = $("full-watchlist-content");
    
    // Initial render
    renderWatchlist();

    if (recentlyAddedContent) {
        recentlyAddedContent.addEventListener("click", (e) => {
            const btn = e.target.closest(".remove-from-watchlist-btn");
            if (!btn) return;
            const id = Number(btn.dataset.id);
            const type = btn.dataset.type || "movie";
            
            // Perform removal
            removeFromWatchlist(id, type);
            
            // Re-render the whole page after removal to update both sections
            renderWatchlist();
        });
    }
    
    if (fullWatchlistContent) {
        fullWatchlistContent.addEventListener("click", (e) => {
            const btn = e.target.closest(".remove-from-watchlist-btn");
            if (!btn) return;
            const id = Number(btn.dataset.id);
            const type = btn.dataset.type || "movie";
            
            // Perform removal
            removeFromWatchlist(id, type);
            
            // Re-render the whole page after removal to update both sections
            renderWatchlist();
        });
    }
});