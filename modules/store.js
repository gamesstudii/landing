const games = [
    {
        title: "Tanks Wars",
        description: "Тактическая игра про танковые ветки, ангар, улучшения и бои.",
        genres: ["tanks", "strategy"],
        platforms: ["browser", "pc"],
        image: "../imgs/screens/tanks-wars.png",
        page: "game-tanks-wars.html",
        play: "../tankswars/index.html",
        tags: ["Танки", "Тактика", "Браузер", "ПК"]
    },
    {
        title: "Tanks Wars: New Era",
        description: "Отдельная Scratch-версия Tanks Wars от Your Nightmare studio.",
        genres: ["tanks", "strategy"],
        platforms: ["browser"],
        image: "../imgs/screens/tanks-wars.png",
        page: "game-tanks-wars-new-era.html",
        play: "https://scratch.mit.edu/projects/1204890294",
        tags: ["Танки", "Scratch", "Браузер"]
    },
    {
        title: "Savage Zone",
        description: "Scratch-проект от Your Nightmare studio.",
        genres: ["strategy"],
        platforms: ["browser"],
        image: "../Games Studio.png",
        page: "game-savage-zone.html",
        play: "https://scratch.mit.edu/projects/1204890294",
        tags: ["Scratch", "Браузер"]
    },
    {
        title: "Ashes Of Nations",
        description: "Стратегия про государства, карты, сценарии и управление странами.",
        genres: ["strategy"],
        platforms: ["browser", "pc"],
        image: "../imgs/screens/ashes-of-nations.png",
        page: "game-ashes-of-nations.html",
        play: "../Ashes-of-Nations/index.html",
        tags: ["Стратегия", "Карта", "Сценарии", "ПК"]
    }
];

const searchInput = document.getElementById("store-search");
const genreFilter = document.getElementById("genre-filter");
const platformFilter = document.getElementById("platform-filter");
const grid = document.getElementById("store-grid");
const empty = document.getElementById("store-empty");

function matchesGame(game) {
    const query = searchInput.value.trim().toLowerCase();
    const genre = genreFilter.value;
    const platform = platformFilter.value;
    const haystack = `${game.title} ${game.description} ${game.tags.join(" ")}`.toLowerCase();

    return (!query || haystack.includes(query))
        && (genre === "all" || game.genres.includes(genre))
        && (platform === "all" || game.platforms.includes(platform));
}

function renderStore() {
    const visibleGames = games.filter(matchesGame);
    grid.innerHTML = visibleGames.map((game) => `
        <article class="store-card">
            <img src="${game.image}" alt="Скриншот ${game.title}">
            <div class="store-card-body">
                <h2>${game.title}</h2>
                <p>${game.description}</p>
                <div class="tags">${game.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
                <div class="store-actions">
                    <a class="button-link" href="${game.page}">Подробнее</a>
                    <a class="button-link secondary" href="${game.play}">Играть</a>
                </div>
            </div>
        </article>
    `).join("");
    empty.style.display = visibleGames.length ? "none" : "block";
}

[searchInput, genreFilter, platformFilter].forEach((control) => {
    control.addEventListener("input", renderStore);
});

renderStore();
