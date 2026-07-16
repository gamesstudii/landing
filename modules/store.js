const games = [
    {
        title: "Tanks Wars",
        description: {
            ru: "Тактическая игра про танковые ветки, ангар, улучшения и бои.",
            en: "A tactical game about tank tech trees, hangar, upgrades, and battles."
        },
        genres: ["tanks", "strategy"],
        platforms: ["browser", "pc"],
        image: "../imgs/screens/tanks-wars.png",
        page: "game-tanks-wars.html",
        play: "../tankswars/index.html",
        studios: [
            { title: "Games Studio", page: "studio-games-studio.html" }
        ],
        tags: {
            ru: ["Танки", "Тактика", "Браузер", "ПК"],
            en: ["Tanks", "Tactics", "Browser", "PC"]
        }
    },
    {
        title: "Tanks Wars: New Era",
        description: {
            ru: "Scratch-версия Tanks Wars от Your Nightmare Studio.",
            en: "Scratch version of Tanks Wars by Your Nightmare Studio."
        },
        genres: ["tanks", "strategy"],
        platforms: ["browser"],
        image: "../imgs/screens/tanks-wars-new-era.png",
        page: "game-tanks-wars-new-era.html",
        play: "https://scratch.mit.edu/projects/1204890294",
        studios: [
            { title: "Your Nightmare Studio", page: "studio-your-nightmare.html" }
        ],
        tags: {
            ru: ["Танки", "Scratch", "Браузер"],
            en: ["Tanks", "Scratch", "Browser"]
        }
    },
    {
        title: "Savage Zone",
        description: {
            ru: "Scratch-проект от Games Studio и Your Nightmare Studio.",
            en: "Scratch project by Games Studio and Your Nightmare Studio."
        },
        genres: ["strategy"],
        platforms: ["browser"],
        image: "../imgs/screens/savage-zone.png",
        page: "game-savage-zone.html",
        play: "https://scratch.mit.edu/projects/1204890294",
        studios: [
            { title: "Games Studio", page: "studio-games-studio.html" },
            { title: "Your Nightmare Studio", page: "studio-your-nightmare.html" }
        ],
        tags: {
            ru: ["Scratch", "Браузер"],
            en: ["Scratch", "Browser"]
        }
    },
    {
        title: "Ashes Of Nations",
        description: {
            ru: "Стратегия про государства, карты, сценарии и управление странами.",
            en: "A strategy game about states, maps, scenarios, and country management."
        },
        genres: ["strategy"],
        platforms: ["browser", "pc"],
        image: "../imgs/screens/ashes-of-nations.png",
        page: "game-ashes-of-nations.html",
        play: "../Ashes-of-Nations/index.html",
        studios: [
            { title: "Games Studio", page: "studio-games-studio.html" }
        ],
        tags: {
            ru: ["Стратегия", "Карта", "Сценарии", "ПК"],
            en: ["Strategy", "Map", "Scenarios", "PC"]
        }
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
    const haystack = `${game.title} ${game.description.ru} ${game.description.en} ${game.tags.ru.join(" ")} ${game.tags.en.join(" ")}`.toLowerCase();

    return (!query || haystack.includes(query))
        && (genre === "all" || game.genres.includes(genre))
        && (platform === "all" || game.platforms.includes(platform));
}

function renderStore() {
    const language = window.getSiteLanguage ? window.getSiteLanguage() : "ru";
    const detailsText = language === "en" ? "Details" : "Подробнее";
    const playText = language === "en" ? "Play" : "Играть";
    const screenshotText = language === "en" ? "Screenshot of" : "Скриншот";
    const studioText = language === "en" ? "Studio" : "Студия";
    const studiosText = language === "en" ? "Studios" : "Студии";
    const visibleGames = games.filter(matchesGame);
    grid.innerHTML = visibleGames.map((game) => `
        <article class="store-card">
            <img src="${game.image}" alt="${screenshotText} ${game.title}">
            <div class="store-card-body">
                <h2>${game.title}</h2>
                <p>${game.description[language]}</p>
                <div class="store-studios">
                    <span>${game.studios.length > 1 ? studiosText : studioText}</span>
                    <div>${game.studios.map((studio) => `<a href="${studio.page}">${studio.title}</a>`).join(", ")}</div>
                </div>
                <div class="tags">${game.tags[language].map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
                <div class="store-actions">
                    <a class="button-link" href="${game.page}">${detailsText}</a>
                    <a class="button-link secondary" href="${game.play}">${playText}</a>
                </div>
            </div>
        </article>
    `).join("");
    empty.style.display = visibleGames.length ? "none" : "block";

    if (window.initScrollReveal) {
        window.initScrollReveal();
    }
}

[searchInput, genreFilter, platformFilter].forEach((control) => {
    control.addEventListener("input", renderStore);
});

window.addEventListener("site-language-change", renderStore);

renderStore();
