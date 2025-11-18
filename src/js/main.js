// main.js

import "../css/style.css";

import {
  getPopularMovies,
  getMoviesByGenres,
  getPopularTVShows,
  getTVShowsByGenres,
  getGenreIds,
  getPosterUrl,
} from "./movieData.mjs";

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const safe = (v) => (v == null ? "" : String(v));

function card(item, type) {
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
  results.innerHTML = list.map((m) => card(m, type)).join("");
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

  if (!form || !genre || !typeSel) {
    console.error("Missing one of: #finder-form, #genre-select, #content-type-select");
    return;
  }

  // initial load based on content type (default to movies)
  loadPopular(typeSel.value || "movie").catch(console.error);

  // submit: filter by genre + type
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    loadByGenre(typeSel.value || "movie", genre.value || "").catch((err) => {
      console.error(err);
      const results = $("results");
      if (results) results.textContent = "Failed to load results.";
    });
  });

  // when user switches "Movie / TV Show", refresh the popular list
  typeSel.addEventListener("change", () => {
    loadPopular(typeSel.value || "movie").catch(console.error);
  });
});
