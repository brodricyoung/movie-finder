
// ====================
// GET FORM VALUES
// ====================

function getMoodValue() {
    return document.getElementById("mood-select").value;
}

function getTypeValue() {
    return document.getElementById("content-type-select").value;
}

function getGenreValue() {
    return document.getElementById("genre-select").value;
}

function getSelectedServices() {
    return Array.from(
        document.querySelectorAll('input[name="streaming-service"]:checked')
    ).map((e) => e.value);
}

function getLikedMovies() {
    const likedMoviesInput = document.getElementById("liked-movies").value.trim();
    return likedMoviesInput 
        ? likedMoviesInput.split(",").map((m) => m.trim())
        : [];
}



// ====================
// FORM SUBMISSION
// ====================
document
  .getElementById("finder-form")
  .addEventListener("submit", (event) => {
    event.preventDefault(); // stops the page from reloading

    const mood = getMoodValue();
    const type = getTypeValue();
    const genre = getGenreValue();
    const genreIds = getGenreIds(genre, type);
    const services = getSelectedServices();
    const likedMovies = getLikedMovies();

    // do something with the values
  });


