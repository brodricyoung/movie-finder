// main.js
import {
  getPopularMovies,
  getMoviesByGenres,
  getPopularTVShows,
  getTVShowsByGenres,
  getGenreIds,
  getPosterUrl,
  searchMovies,
  searchTVShows,
  getRecommendations,

  // debugging helpers
  getMovieFullDetails,
  getTVFullDetails

} from "../js/movieData.mjs";

let currentSessionAddedIds = [];

// simple localStorage helpers to remember user choices between visits
const STORAGE_KEY = "movieFinderPreferences";
const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch (err) {
    console.warn("Failed to read preferences", err);
    return {};
  }
};
const savePrefs = (partial) => {
  try {
    const current = loadPrefs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
  } catch (err) {
    console.warn("Failed to write preferences", err);
  }
};

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
const addToWatchlist = (item) => {
  const current = loadWatchlist();
  const exists = current.some((entry) => entry.id === item.id && entry.type === item.type);
  if (exists) return current;

  const next = [...current, item];
  saveWatchlist(next);
  return next;
};

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const safe = (v) => (v == null ? "" : String(v));

// Helper to get currently checked streaming services
const getSelectedServices = () => {
    const checkboxes = document.querySelectorAll("#streaming-services-list input[type='checkbox']");
    return Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
};

function card(item, type, isSaved) {
  const title = type === "tv" ? safe(item.name) : safe(item.title);
  const poster = getPosterUrl(item.poster_path) || "";
  const rating =
    typeof item.vote_average === "number" ? item.vote_average.toFixed(1) : "—";
  const overview = safe(item.overview) || "No description available.";
  return `
    <article class="movie-card recommended-card">
      <div class="movie-card-inner">
        <div class="movie-card-front">
          ${poster ? `<img class="movie-poster" loading="lazy" src="${poster}" alt="${title} poster">` : ""}
        </div>
        <div class="movie-card-back">
          <p class="movie-description">${overview}</p>
        </div>
      </div>
      <button class="zoom-close" type="button" aria-label="Close poster view">&times;</button>
      <div class="movie-card-footer">
        <p class="movie-title">${title}</p>
        <button
          class="add-to-watchlist-btn"
          data-id="${item.id}"
          data-type="${type}"
          data-title="${title}"
          data-poster="${poster}"
          ${isSaved ? "disabled" : ""}
        >
          ${isSaved ? "Saved to Watchlist" : "Add to Watchlist"}
        </button>
      </div>
    </article>
  `;
}





// -----------------------------------------------------------------------------
// DEBUGGING HELPER
// -----------------------------------------------------------------------------
async function debugLog(list, type) {
  console.group("🔍 Debugging Recommendation Results");
  console.log(`Total Results: ${list.length}`);
  
  // Only look at the first 3 to save API calls/time
  const sample = list.slice(0, 3);

  for (const item of sample) {
    const title = item.title || item.name;
    console.groupCollapsed(`Checking: ${title}`);
    
    try {
      // Fetch full details including the "watch providers"
      let details;
      if (type === 'tv') {
        details = await getTVFullDetails(item.id);
      } else {
        details = await getMovieFullDetails(item.id);
      }

      console.log("Raw Item Data:", item);
      console.log("Genre IDs:", item.genre_ids);
      
      // Check the 'flatrate' (streaming) providers for the US
      const providers = details.providers?.flatrate || [];
      const providerNames = providers.map(p => p.provider_name);
      
      if (providerNames.length > 0) {
        console.log("✅ Available on (Flatrate):", providerNames.join(", "));
      } else {
        console.warn("⚠️ No streaming providers found for US region.");
      }
      
    } catch (err) {
      console.error("Could not fetch details", err);
    }
    console.groupEnd();
  }
  console.groupEnd();
}












function render(list, type) {
  const results = $("results");
  if (!results) {
    console.error("Missing #results element in HTML.");
    return;
  }


  // -----------------------------------------------------------------------------
  // DEBUGGING HELPER
  // -----------------------------------------------------------------------------
  debugLog(list, type);

  
  if (!list || list.length === 0) {
      results.innerHTML = "<p>No results found matching your criteria.</p>";
      return;
  }

  const saved = loadWatchlist();
  results.innerHTML = list.map((m) => card(m, type, saved.some((item) => item.id === m.id && item.type === type))).join("");
}


function syncWatchlistButtons() {
  const saved = loadWatchlist();
  document.querySelectorAll(".add-to-watchlist-btn").forEach((btn) => {
    const id = Number(btn.dataset.id);
    const type = btn.dataset.type || "movie";
    const isSaved = saved.some((item) => item.id === id && item.type === type);
    btn.disabled = isSaved;
    btn.textContent = isSaved ? "Saved to Watchlist" : "Add to Watchlist";
  });
}

// Updated to grab selected services
async function loadPopular(type) {
  const services = getSelectedServices();
  
  if (type === "tv") {
    const shows = await getPopularTVShows(1, services);
    render(shows, "tv");
  } else {
    const movies = await getPopularMovies(1, services);
    render(movies, "movie");
  }
}

// Updated to grab selected services
async function loadByGenre(type, genreKey) {
  const ids = getGenreIds(genreKey, type, "|");
  const services = getSelectedServices();

  // If no genre IDs found, fallback to popular (with services filtered)
  if (!ids) return loadPopular(type);

  if (type === "tv") {
    const shows = await getTVShowsByGenres(ids, 1, services);
    render(shows, "tv");
  } else {
    const movies = await getMoviesByGenres(ids, 1, services);
    render(movies, "movie");
  }
}

// ---------- wire up once DOM is ready ----------
document.addEventListener("DOMContentLoaded", () => {
  const form = $("finder-form");
  const genre = $("genre-select");
  const typeSel = $("content-type-select");
  const mood = $("mood-select");
  const liked = $("liked-movies");
  const streamingServices = Array.from(
    document.querySelectorAll("#streaming-services-list input[type='checkbox']")
  );
  const watchlistLink = $("view-watchlist-button");
  const watchlistModal = $("watchlist-modal");
  const watchlistClose = $("close-watchlist-button");
  const watchlistContent = $("watchlist-content");
  const nav = document.getElementById("primary-nav");
  const navToggle = document.getElementById("menu-toggle");

  const prefs = loadPrefs();

  if (nav && navToggle) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("open");
    });

    nav.addEventListener("click", (e) => {
      if (e.target.matches("a")) {
        nav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (mood && prefs.mood) mood.value = prefs.mood;
  if (genre && prefs.genre) genre.value = prefs.genre;
  if (typeSel && prefs.type) typeSel.value = prefs.type;
  if (liked && prefs.liked) liked.value = prefs.liked;

  if (prefs.streamingServices && Array.isArray(prefs.streamingServices)) {
    streamingServices.forEach((cb) => {
      cb.checked = prefs.streamingServices.includes(cb.value);
    });
  }

  if (!form || !genre || !typeSel) {
    console.error("Missing one of: #finder-form, #genre-select, #content-type-select");
    return;
  }


  // Helper to update the watchlist link url parameters
const updateWatchlistLink = (currentType) => {
  if (watchlistLink) {
    const url = new URL("watchlist.html", document.baseURI);
    const idsString = currentSessionAddedIds.join(',');
    url.searchParams.set("new_ids", idsString);
    watchlistLink.href = url.toString();
  }
};

  const initialType = typeSel.value || "movie";
  if (prefs.genre) {
    loadByGenre(initialType, prefs.genre).catch(console.error);
  } else {
    loadPopular(initialType).catch(console.error);
  }
  updateWatchlistLink(initialType);



  // submit: filter by Liked Movie OR Genre/Type/Services
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const resultsContainer = $("results");
    
    // 1. Save all preferences (existing logic)
    const selectedType = typeSel.value || "movie";
    const streaming = streamingServices
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    savePrefs({
      genre: genre.value || "",
      type: selectedType,
      mood: mood ? mood.value || "" : "",
      liked: liked ? liked.value || "" : "",
      streamingServices: streaming,
    });
    updateWatchlistLink(selectedType);

    // 2. CHECK: Did the user type a "Previously Liked Movie"?
    // If yes, this takes priority over Genre/Mood selections.
    const likedQuery = liked.value ? liked.value.trim() : "";

    if (likedQuery) {
      try {
        // Handle multiple movies by taking the first one (e.g. "Matrix, Inception" -> "Matrix")
        const firstTitle = likedQuery.split(",")[0].trim();
        
        // A. Search for the movie/show to get its ID
        const searchResults = selectedType === "tv" 
          ? await searchTVShows(firstTitle) 
          : await searchMovies(firstTitle);

        if (searchResults && searchResults.length > 0) {
          // B. Get the ID of the best match
          const bestMatch = searchResults[0];
          console.log(`Found match for "${firstTitle}":`, bestMatch.title || bestMatch.name);

          // C. Get recommendations based on that ID
          const recommendations = await getRecommendations(bestMatch.id, selectedType);
          
          if (recommendations.length > 0) {
            render(recommendations, selectedType);
            return; // EXIT HERE so we don't overwrite with genre results
          }
        } else {
            console.warn("No results found for that title.");
        }
      } catch (err) {
        console.error("Error finding recommendations:", err);
      }
    }

    // 3. Fallback: If no text input (or search failed), load by Genre/Popularity
    loadByGenre(selectedType, genre.value || "").catch((err) => {
      console.error(err);
      if (resultsContainer) resultsContainer.textContent = "Failed to load results.";
    });
  });



  // when user switches "Movie / TV Show", refresh the list
  typeSel.addEventListener("change", () => {
    const newType = typeSel.value || "movie";
    savePrefs({ type: newType });
    updateWatchlistLink(newType); 
    
    // Check if we have a genre selected, otherwise load popular
    if(genre.value) {
        loadByGenre(newType, genre.value).catch(console.error);
    } else {
        loadPopular(newType).catch(console.error);
    }
  });

  if (genre) {
    genre.addEventListener("change", () => {
      savePrefs({ genre: genre.value || "" });
    });
  }

  if (mood) {
    mood.addEventListener("change", () => {
      savePrefs({ mood: mood.value || "" });
    });
  }

  if (liked) {
    liked.addEventListener("input", () => {
      savePrefs({ liked: liked.value || "" });
    });
  }

  streamingServices.forEach((cb) => {
    cb.addEventListener("change", () => {
      const streaming = streamingServices
        .filter((item) => item.checked)
        .map((item) => item.value);
      savePrefs({ streamingServices: streaming });
    });
  });

  // handle watchlist add via event delegation
  const results = $("results");
  if (results) {
    results.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-watchlist-btn");
      if (!btn) return;

      const id = Number(btn.dataset.id);
      const type = btn.dataset.type || "movie";
      const title = btn.dataset.title || "Untitled";
      const poster = btn.dataset.poster || "";

      addToWatchlist({ id, type, title, poster });

      if (!currentSessionAddedIds.includes(id)) {
          currentSessionAddedIds.push(id);
      }
      updateWatchlistLink(type);
      
      btn.textContent = "Saved to Watchlist";
      btn.disabled = true;
      renderWatchlist(); // Only if modal is used, but harmless if function missing
      syncWatchlistButtons();
    });

    results.addEventListener("click", (e) => {
      const cardEl = e.target.closest(".movie-card");
      if (!cardEl) return;

      const isZoomed = cardEl.classList.contains("zoomed");
      const clickedPosterArea = e.target.closest(".movie-card-inner");

      if (isZoomed && clickedPosterArea) {
        cardEl.classList.toggle("flip");
        return;
      }

      const img = e.target.closest(".movie-poster");
      if (!img) return;

      document.body.classList.remove("zoom-active");
      document.querySelectorAll(".movie-card.zoomed").forEach((card) => {
        card.classList.remove("zoomed");
        card.classList.remove("flip");
      });

      cardEl.classList.add("zoomed");
      document.body.classList.add("zoom-active");
    });
  }

  // Close zoomed poster
  document.addEventListener("click", (e) => {
    if (!document.body.classList.contains("zoom-active")) return;

    const closeBtn = e.target.closest(".zoom-close");
    if (closeBtn) {
      const card = closeBtn.closest(".movie-card");
      if (card) {
        card.classList.remove("zoomed");
        card.classList.remove("flip");
      }
      document.body.classList.remove("zoom-active");
      return;
    }

    const zoomed = document.querySelector(".movie-card.zoomed");
    if (!zoomed) {
      document.body.classList.remove("zoom-active");
      return;
    }
    if (!zoomed.contains(e.target)) {
      zoomed.classList.remove("zoomed");
      zoomed.classList.remove("flip");
      document.body.classList.remove("zoom-active");
    }
  });

  // Note: Watchlist modal logic moved to specific section, simplified here
  // Check if needed or if existing code handles it
});