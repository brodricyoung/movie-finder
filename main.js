// main.js
import {
  getPopularMovies,
  getMoviesByGenres,
  getPopularTVShows,
  getTVShowsByGenres,
  getGenreIds,
  getPosterUrl,
} from "./movieData.mjs";

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
const removeFromWatchlist = (id, type) => {
  const current = loadWatchlist();
  const next = current.filter((entry) => !(entry.id === id && entry.type === type));
  saveWatchlist(next);
  return next;
};

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const safe = (v) => (v == null ? "" : String(v));

function card(item, type, isSaved) {
  const title = type === "tv" ? safe(item.name) : safe(item.title);
  const poster = getPosterUrl(item.poster_path) || "";
  const rating =
    typeof item.vote_average === "number" ? item.vote_average.toFixed(1) : "—";
  return `
    <article class="card">
      ${poster ? `<img class="movie-poster" loading="lazy" src="${poster}" alt="${title} poster">` : ""}
      <div class="card-body">
        <h3 class="movie-title">${title}</h3>
        <p class="meta">⭐ ${rating}</p>
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

function render(list, type) {
  const results = $("results");
  if (!results) {
    console.error("Missing #results element in HTML.");
    return;
  }
  const saved = loadWatchlist();
  results.innerHTML = list.map((m) => card(m, type, saved.some((item) => item.id === m.id && item.type === type))).join("");
}

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
  const container = $("watchlist-content");
  const empty = $("watchlist-empty");
  if (!container) return;

  const list = loadWatchlist();
  if (!list.length) {
    container.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }

  container.innerHTML = list.map((item) => watchlistCard(item)).join("");
  if (empty) empty.style.display = "none";
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

async function loadPopular(type) {
  if (type === "tv") {
    const shows = await getPopularTVShows();
    render(shows, "tv");
  } else {
    const movies = await getPopularMovies();
    render(movies, "movie");
  }
}

async function loadByGenre(type, genreKey) {
  const ids = getGenreIds(genreKey, type, "|"); // OR across multiple if you add more later
  if (!ids) return loadPopular(type);

  if (type === "tv") {
    const shows = await getTVShowsByGenres(ids);
    render(shows, "tv");
  } else {
    const movies = await getMoviesByGenres(ids);
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
  const watchlistBtn = $("view-watchlist-button");
  const watchlistModal = $("watchlist-modal");
  const watchlistClose = $("close-watchlist-button");
  const watchlistContent = $("watchlist-content");

  const prefs = loadPrefs();

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

  const initialType = typeSel.value || "movie";
  if (prefs.genre) {
    loadByGenre(initialType, prefs.genre).catch(console.error);
  } else {
    loadPopular(initialType).catch(console.error);
  }

  // submit: filter by genre + type
  form.addEventListener("submit", (e) => {
    e.preventDefault();
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

    loadByGenre(selectedType, genre.value || "").catch((err) => {
      console.error(err);
      const results = $("results");
      if (results) results.textContent = "Failed to load results.";
    });
  });

  // when user switches "Movie / TV Show", refresh the popular list
  typeSel.addEventListener("change", () => {
    const newType = typeSel.value || "movie";
    savePrefs({ type: newType });
    loadPopular(newType).catch(console.error);
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
      btn.textContent = "Saved to Watchlist";
      btn.disabled = true;
      renderWatchlist();
      syncWatchlistButtons();
    });
  }

  // watchlist modal toggles
  const openWatchlist = () => {
    renderWatchlist();
    if (watchlistModal) {
      watchlistModal.classList.add("open");
      watchlistModal.setAttribute("aria-hidden", "false");
    }
  };
  const closeWatchlist = () => {
    if (watchlistModal) {
      watchlistModal.classList.remove("open");
      watchlistModal.setAttribute("aria-hidden", "true");
    }
  };

  if (watchlistBtn) watchlistBtn.addEventListener("click", openWatchlist);
  if (watchlistClose) watchlistClose.addEventListener("click", closeWatchlist);
  if (watchlistModal) {
    watchlistModal.addEventListener("click", (e) => {
      if (e.target === watchlistModal) closeWatchlist();
    });
  }

  // handle removes inside watchlist modal
  if (watchlistContent) {
    watchlistContent.addEventListener("click", (e) => {
      const btn = e.target.closest(".remove-from-watchlist-btn");
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const type = btn.dataset.type || "movie";
      removeFromWatchlist(id, type);
      renderWatchlist();
      syncWatchlistButtons();
    });
  }

  // initial sync so buttons match localStorage on first load
  syncWatchlistButtons();
});
