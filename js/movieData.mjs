
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
// WATCH PROVIDERS
// ====================

// get streaming availability for a movie or TV show by ID
// id: TMDB ID of the movie or show
// type: "movie" or "tv"
// country: 2-letter ISO country code (e.g. "US", "CA"), defaults to "US"
// returns: object with arrays of flatrate (streaming), rent, and buy providers
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

// get a list of popular movies
// returns an array of movie objects with id, title, poster_path, overview, etc.
export async function getPopularMovies(page = 1) {
  const data = await getJson(`discover/movie?language=en-US&sort_by=popularity.desc&page=${page}`);
  return data.results;
}

// get movies filtered by genre IDs
// genres: string of comma (action AND comedy) or pipe-separated (action OR comedy) TMDB IDs (25|38|459 or 25,38,459)
// returns array of movies that match the genre(s)
export async function getMoviesByGenres(genres, page = 1) {
  const data = await getJson(
    `discover/movie?language=en-US&sort_by=popularity.desc&page=${page}&with_genres=${genres}`
  );
  return data.results;
}

// get detailed info about a specific movie by its ID
// returns an object with id, title, overview, poster_path, runtime, genres, release_date, vote_average
export async function getMovieDetails(id) {
  const data = await getJson(`movie/${id}?language=en-US`);
  return data;
}

// get movie details + watch providers
// returns combined object with movie info and providers data
export async function getMovieFullDetails(id, country = "US") {
  const [details, providers] = await Promise.all([
    getMovieDetails(id),
    getWatchProviders(id, "movie", country),
  ]);
  return { ...details, providers };
}

/** Example output for getMovieFullDetails(550)
  {
    "id": 550,
    "title": "Fight Club",
    "overview": "A depressed man...",
    "release_date": "1999-10-15",
    "genres": [
      { "id": 18, "name": "Drama" }
    ],
    "vote_average": 8.4,
    "poster_path": "/a26cQPRhJPX6GbWfQbvZdrrp9j9.jpg",
    "providers": {
      "flatrate": [
        {
          "provider_name": "Amazon Prime Video",
          "logo_path": "/emthp39XA2YScoYL1p0sdbAH2WA.jpg"
        }
      ],
      "rent": [
        {
          "provider_name": "Apple TV",
          "logo_path": "/peURlLlr8jggOwK53fJ5wdQl05y.jpg"
        }
      ],
      "buy": [
        {
          "provider_name": "Google Play Movies",
          "logo_path": "/tbEdFQDwx5LEVr8WpSeXQSIirVq.jpg"
        }
      ]
    }
  }
 */




// ====================
// TV SHOWS
// ====================

// get a list of popular TV shows
// returns an array of tv show objects with id, name, poster_path, overview, etc.
export async function getPopularTVShows(page = 1) {
  const data = await getJson(`discover/tv?language=en-US&sort_by=popularity.desc&page=${page}`);
  return data.results;
}

// get TV shows filtered by genre IDs
// genres: string of comma (action AND comedy) or pipe-separated (action OR comedy) TMDB IDs (25|38|459 or 25,38,459)
// returns array of TV shows that match the genre(s)
export async function getTVShowsByGenres(genres, page = 1) {
  const data = await getJson(
    `discover/tv?language=en-US&sort_by=popularity.desc&page=${page}&with_genres=${genres}`
  );
  return data.results;
}

// get detailed info about a TV show by its ID
// returns an object with id, name, overview, poster_path, number_of_seasons, genres, vote_average
export async function getTVDetails(id) {
  const data = await getJson(`tv/${id}?language=en-US`);
  return data;
}

// get TV details + watch providers
// returns combined object with TV info and providers data
export async function getTVFullDetails(id, country = "US") {
  const [details, providers] = await Promise.all([
    getTVDetails(id),
    getWatchProviders(id, "tv", country),
  ]);
  return { ...details, providers };
}

/** example output for getTVFullDetails(1396)
  {
    "id": 1396,
    "name": "Breaking Bad",
    "overview": "A chemistry teacher diagnosed with cancer...",
    "first_air_date": "2008-01-20",
    "number_of_seasons": 5,
    "genres": [
      { "id": 18, "name": "Drama" },
      { "id": 80, "name": "Crime" }
    ],
    "vote_average": 8.9,
    "poster_path": "/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    "providers": {
      "flatrate": [
        {
          "provider_name": "Netflix",
          "logo_path": "/iFfT0hUUXQHktsvMsz68Pf77a1O.jpg"
        },
        {
          "provider_name": "HBO Max",
          "logo_path": "/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg"
        }
      ],
      "rent": [
        {
          "provider_name": "Apple TV",
          "logo_path": "/peURlLlr8jggOwK53fJ5wdQl05y.jpg"
        }
      ],
      "buy": [
        {
          "provider_name": "Google Play Movies",
          "logo_path": "/tbEdFQDwx5LEVr8WpSeXQSIirVq.jpg"
        }
      ]
    }
  }
 */




// ====================
// SEARCH
// ====================

// search movies by text query
// query: a string of the movie title or keywords (e.g. "Inception" or "star wars")
// returns: array of movie objects with info like id, title, overview, poster_path, etc.
export async function searchMovies(query, page = 1) {
  const q = encodeURIComponent(query);

  const data = await getJson(
    `search/movie?query=${q}&language=en-US&page=${page}&include_adult=false`
  );

  return data.results;
}

// search TV shows by text query
// query: a string of the show name or keywords (e.g. "Breaking Bad" or "Game of Thrones")
// returns: array of TV show objects with info like id, name, overview, poster_path, etc.
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

// mapping of dropdown values to TMDB genre IDs
const genreMap = {
  movie: {
    action: 28,
    adventure: 12,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    family: 10751,
    fantasy: 14,
    history: 36,
    horror: 27,
    music: 10402,
    mystery: 9648,
    romance: 10749,
    scifi: 878,
    thriller: 53,
    war: 10752,
    western: 37,
    biography: 36,
    musical: 10402,
  },
  tv: {
    action: 10759,
    animation: 16,
    comedy: 35,
    crime: 80,
    documentary: 99,
    drama: 18,
    family: 10751,
    kids: 10762,
    mystery: 9648,
    news: 10763,
    reality: 10764,
    scifi: 10765,
    talk: 10767,
    war: 10768,
  },
};

// turn one or more genre names into a TMDB genre ID string
// genres: a single genre name string (e.g. "Action") or an array of genre names (e.g. ["Action", "Comedy"])
// type: "movie" or "tv" to specify which TMDB genre map to use
// separator: string used to join multiple IDs ("," for AND, "|" for OR), default is "|"
// returns: a string of TMDB genre IDs joined by the separator, e.g. "28|35|878" or "" if no valid genres found
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

// get full poster image URL
// path: poster_path string from TMDB objects (e.g. "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg")
// returns: string like "https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg"
export function getPosterUrl(path, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}

// get full backdrop image URL
// path: backdrop_path string from TMDB objects (e.g. "/r9PkFnRUIthgBp2JZZzD380MWZy.jpg")
// returns string like "https://image.tmdb.org/t/p/w500/r9PkFnRUIthgBp2JZZzD380MWZy.jpg"
export function getBackdropUrl(path, size = "w500") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : "";
}




