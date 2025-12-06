// js/movieData.mjs

const baseUrl = "https://api.themoviedb.org/3/";
const accessToken = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NGM3NDJkMmI4ZTMzMDg5NjU4YjY1Njg1NWFjNDhhYiIsIm5iZiI6MTc2MjE5NzA3My4xNTI5OTk5LCJzdWIiOiI2OTA4ZmU1MWYwZGZmM2MzNTcyZmYyYmUiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.QtLk7w_yoeC1w1DjEBthRbkQoTvogp8EXh3EED0s-jQ";

async function getJson(url) {
  const res = await fetch(baseUrl + url, {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return await res.json();
}

// ====================
// PROVIDER MAP
// ====================
// Maps the 'value' from your HTML checkboxes to TMDB Provider IDs (US Region)
const providerMap = {
  "Netflix": "8",
  "Amazon Prime Video": "9|119", // Prime Video or Prime
  "Disney Plus": "337",
  "Apple TV Plus": "350",
  "Hulu": "15",
  "HBO Max": "384|1899", // HBO Max or Max
  "Peacock": "386|387",
  "Paramount Plus": "531",
  "YouTube TV": "188", // Mapping to YouTube Premium as closest equivalent for discovery
};

// Helper to build the provider query string
function getProviderQuery(services) {
  if (!services || services.length === 0) return "";
  
  // Map service names to IDs
  const ids = services
    .map(name => providerMap[name])
    .filter(Boolean) // Remove any undefineds
    .join("|");      // Join with pipe for "OR" logic (Netflix OR Hulu)
    
  // Important: watch_region is required when filtering by providers
  return ids ? `&with_watch_providers=${ids}&watch_region=US` : "";
}


// ====================
// WATCH PROVIDERS (Single Item)
// ====================
export async function getWatchProviders(id, type, country = "US") {
  const data = await getJson(`${type}/${id}/watch/providers`);
  const region = data.results?.[country];

  if (!region) return { flatrate: [], rent: [], buy: [] };

  return {
    flatrate: region.flatrate || [],
    rent: region.rent || [],
    buy: region.buy || [],
  };
}


// ====================
// MOVIES
// ====================

// Updated to accept providers array
export async function getPopularMovies(page = 1, providers = []) {
  const providerQuery = getProviderQuery(providers);
  const data = await getJson(`discover/movie?language=en-US&sort_by=popularity.desc&page=${page}${providerQuery}`);
  return data.results;
}

// Updated to accept providers array
export async function getMoviesByGenres(genres, page = 1, providers = []) {
  const providerQuery = getProviderQuery(providers);
  const data = await getJson(
    `discover/movie?language=en-US&sort_by=popularity.desc&page=${page}&with_genres=${genres}${providerQuery}`
  );
  return data.results;
}

export async function getMovieDetails(id) {
  const data = await getJson(`movie/${id}?language=en-US`);
  return data;
}

export async function getMovieFullDetails(id, country = "US") {
  const [details, providers] = await Promise.all([
    getMovieDetails(id),
    getWatchProviders(id, "movie", country),
  ]);
  return { ...details, providers };
}


// ====================
// TV SHOWS
// ====================

// Updated to accept providers array
export async function getPopularTVShows(page = 1, providers = []) {
  const providerQuery = getProviderQuery(providers);
  const data = await getJson(`discover/tv?language=en-US&sort_by=popularity.desc&page=${page}${providerQuery}`);
  return data.results;
}

// Updated to accept providers array
export async function getTVShowsByGenres(genres, page = 1, providers = []) {
  const providerQuery = getProviderQuery(providers);
  const data = await getJson(
    `discover/tv?language=en-US&sort_by=popularity.desc&page=${page}&with_genres=${genres}${providerQuery}`
  );
  return data.results;
}

export async function getTVDetails(id) {
  const data = await getJson(`tv/${id}?language=en-US`);
  return data;
}

export async function getTVFullDetails(id, country = "US") {
  const [details, providers] = await Promise.all([
    getTVDetails(id),
    getWatchProviders(id, "tv", country),
  ]);
  return { ...details, providers };
}


// ====================
// SEARCH
// ====================

export async function searchMovies(query, page = 1) {
  const q = encodeURIComponent(query);
  const data = await getJson(
    `search/movie?query=${q}&language=en-US&page=${page}&include_adult=false`
  );
  return data.results;
}

export async function searchTVShows(query, page = 1) {
  const q = encodeURIComponent(query);
  const data = await getJson(
    `search/tv?query=${q}&language=en-US&page=${page}&include_adult=false`
  );
  return data.results;
}


// ====================
// HELPER: GENRES
// ====================

const genreMap = {
  movie: {
    action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
    documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
    horror: 27, music: 10402, mystery: 9648, romance: 10749, scifi: 878,
    thriller: 53, war: 10752, western: 37, biography: 36, musical: 10402,
  },
  tv: {
    action: 10759, animation: 16, comedy: 35, crime: 80, documentary: 99,
    drama: 18, family: 10751, kids: 10762, mystery: 9648, news: 10763,
    reality: 10764, scifi: 10765, talk: 10767, war: 10768,
  },
};

export function getGenreIds(genres, type, separator = "|") {
  if (!genres || !type) return "";
  const map = genreMap[type] || {};
  const arr = Array.isArray(genres) ? genres : [genres];
  const ids = arr
    .map((g) => map[g.toLowerCase().replace(/\s+/g, "")])
    .filter(Boolean);
  return ids.join(separator);
}

// ====================
// IMAGE HELPERS
// ====================

export function getPosterUrl(path, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

export function getBackdropUrl(path, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

// ====================
// RECOMMENDATIONS
// ====================

// Get recommendations based on a specific movie or TV show ID
// id: The TMDB ID (e.g., 550 for Fight Club)
// type: "movie" or "tv"
export async function getRecommendations(id, type) {
  const data = await getJson(`${type}/${id}/recommendations?language=en-US&page=1`);
  return data.results;
}