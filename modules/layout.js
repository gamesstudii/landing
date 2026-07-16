async function loadLayout() {
    const headerSlot = document.getElementById("header-slot");

    if (!headerSlot) {
        return;
    }

    if (window.location.protocol === "file:") {
        const headerHtml = '<div class="header"><a class="brand" href="main.html" aria-label="Games Studio"><img src="../Games Studio.png" alt=""><span>Games Studio</span></a><nav class="top-nav" aria-label="Основная навигация"><a class="top-nav-link" href="main.html">Главная</a><a class="top-nav-link" href="store.html">Магазин</a><a class="top-nav-link" href="news.html">Новости</a><a class="top-nav-link" href="contacts.html">Контакты</a></nav></div>';
        headerSlot.innerHTML = headerHtml;
        initLanguage();
        markActiveNav();
        initScrollReveal();
        return;
    }

    try {
        const headerResponse = await fetch("../modules/header.html");

        if (!headerResponse.ok) {
            throw new Error("Не удалось загрузить layout.");
        }

        const headerHtml = await headerResponse.text();
        headerSlot.innerHTML = headerHtml;
        initLanguage();
        markActiveNav();
        initScrollReveal();
    } catch (error) {
        console.error(error);
    }
}

const translations = {
    en: {
        "Главная": "Home",
        "Магазин": "Games",
        "Новости": "News",
        "Контакты": "Contacts",
        "Игры без лишней обёртки": "Games without extra noise",
        "Здесь лежат проекты студии. Игры можно запускать сразу, смотреть описание и переходить к странице каждого проекта.": "Studio projects are collected here. You can launch games, read descriptions, and open each project page.",
        "Перейти к играм": "Go to games",
        "Танковая игра с ангаром и боями.": "A tank game with a hangar and battles.",
        "Scratch-версия от Your Nightmare Studio.": "Scratch version by Your Nightmare Studio.",
        "Scratch-проект от Games Studio и Your Nightmare Studio.": "Scratch project by Games Studio and Your Nightmare Studio.",
        "Стратегия с картой и сценариями.": "A strategy game with a map and scenarios.",
        "Страница игры": "Game page",
        "Каталог": "Catalog",
        "Игры": "Games",
        "Все игры": "All games",
        "Каталог Games Studio": "Games Studio Catalog",
        "Выбери игру, открой страницу с описанием или запусти сразу. Сейчас в каталоге четыре проекта.": "Choose a game, open its page, or launch it right away. The catalog currently has four projects.",
        "Поиск": "Search",
        "Жанр": "Genre",
        "Платформа": "Platform",
        "Все": "All",
        "Стратегия": "Strategy",
        "Танки": "Tanks",
        "Браузер": "Browser",
        "ПК": "PC",
        "Ничего не найдено.": "Nothing found.",
        "Подробнее": "Details",
        "Играть": "Play",
        "Танковая тактическая игра с ангаром, развитием техники, событиями и боями.": "A tactical tank game with a hangar, vehicle progression, events, and battles.",
        "Новая версия Tanks Wars на Scratch от Your Nightmare Studio.": "A new Scratch version of Tanks Wars by Your Nightmare Studio.",
        "Scratch-проект от Games Studio и Your Nightmare Studio.": "Scratch project by Games Studio and Your Nightmare Studio.",
        "Стратегия про страны, карты, сценарии и управление государствами.": "A strategy game about countries, maps, scenarios, and state management.",
        "Жанр": "Genre",
        "Платформы": "Platforms",
        "Статус": "Status",
        "Студия": "Studio",
        "Студии": "Studios",
        "Доступно": "Available",
        "Танки, тактика, стратегия": "Tanks, tactics, strategy",
        "Браузер, ПК": "Browser, PC",
        "Глобальная стратегия": "Grand strategy",
        "Scratch-проект": "Scratch project",
        "Играть на сайте": "Play on site",
        "Яндекс Игры": "Yandex Games",
        "Скачать APK": "Download APK",
        "Скачать для Windows": "Download for Windows",
        "Назад в магазин": "Back to games",
        "Играть на Scratch": "Play on Scratch",
        "Описание": "Description",
        "Что внутри": "What's inside",
        "Как запустить": "How to start",
        "Tanks Wars - игра про танки, где основной экран связан с ангаром, техникой и боями. Можно выбрать машину, посмотреть характеристики и перейти в бой.": "Tanks Wars is a tank game where the main screen connects the hangar, vehicles, and battles. You can choose a vehicle, view stats, and enter battle.",
        "Tanks Wars: New Era - Scratch-версия танковой игры от Your Nightmare Studio. Проект доступен через страницу Scratch.": "Tanks Wars: New Era is a Scratch tank game by Your Nightmare Studio. The project is available on Scratch.",
        "Savage Zone - игра на Scratch от Games Studio и Your Nightmare Studio. Сейчас доступна ссылка на страницу проекта Scratch.": "Savage Zone is a Scratch game by Games Studio and Your Nightmare Studio. A Scratch project link is currently available.",
        "Ashes Of Nations - стратегия с картой и сценариями. Игрок выбирает условия, смотрит территории и работает с государствами на карте.": "Ashes Of Nations is a strategy game with a map and scenarios. The player chooses conditions, views territories, and works with states on the map.",
        "Ангар": "Hangar",
        "Выбор танка и просмотр параметров.": "Choose a tank and view its stats.",
        "Улучшения": "Upgrades",
        "Открытие техники и настройка машины.": "Unlock vehicles and tune your machine.",
        "Бой": "Battle",
        "Отдельный экран для сражения.": "A separate screen for combat.",
        "Scratch": "Scratch",
        "Игра запускается на платформе Scratch.": "The game runs on Scratch.",
        "Проект продолжает тему танковых боёв.": "The project continues the tank battle theme.",
        "Браузер": "Browser",
        "Можно открыть проект без установки.": "You can open the project without installing anything.",
        "Студии": "Studios",
        "Проект от Games Studio и Your Nightmare Studio.": "A project by Games Studio and Your Nightmare Studio.",
        "Студия": "Studio",
        "Проект от Your Nightmare Studio.": "A project by Your Nightmare Studio.",
        "Карта": "Map",
        "Основной экран с территориями.": "Main screen with territories.",
        "Сценарии": "Scenarios",
        "Разные стартовые условия.": "Different starting conditions.",
        "Редакторы": "Editors",
        "Инструменты для карт и сценариев.": "Tools for maps and scenarios.",
        "Выбрать площадку: сайт, Яндекс Игры, Scratch или APK.": "Choose a platform: site, Yandex Games, Scratch, or APK.",
        "Дождаться загрузки игры.": "Wait for the game to load.",
        "Выбрать танк в ангаре и начать бой.": "Choose a tank in the hangar and start a battle.",
        "Нажать кнопку “Играть на Scratch”.": "Press “Play on Scratch”.",
        "Дождаться загрузки проекта на Scratch.": "Wait for the Scratch project to load.",
        "Запустить игру на странице проекта.": "Start the game on the project page.",
        "Нажать кнопку “Играть” в браузере, скачать установщик Windows или APK.": "Press “Play” in the browser, download the Windows installer, or download the APK.",
        "Выбрать режим или сценарий.": "Choose a mode or scenario.",
        "Открыть карту и начать игру.": "Open the map and start playing.",
        "Связь с Games Studio": "Contact Games Studio",
        "Для вопросов по проектам можно использовать почту, Telegram и официальные страницы студии.": "For project questions, use email, Telegram, or the studio's official pages.",
        "Почта": "Email",
        "Техподдержка": "Support",
        "Telegram bot": "Telegram bot",
        "Telegram канал": "Telegram channel",
        "Видео": "Video",
        "Статьи": "Articles",
        "Сообщество": "Community",
        "Страница студии. Здесь можно будет добавить описание, проекты, новости и ссылки.": "Studio page. You can add a description, projects, news, and links here later.",
        "О студии": "About the studio",
        "Заполни этот блок позже: история студии, команда, чем занимаетесь и какие игры делаете.": "Fill this block later: studio history, team, what you do, and what games you make.",
        "Заполни этот блок позже: описание студии, авторы, стиль игр и планы.": "Fill this block later: studio description, creators, game style, and plans.",
        "Проекты": "Projects",
        "Танковая игра Games Studio.": "A tank game by Games Studio.",
        "Стратегия Games Studio.": "A strategy game by Games Studio.",
        "Совместный проект.": "A joint project.",
        "Scratch-проект Your Nightmare Studio.": "A Scratch project by Your Nightmare Studio.",
        "Будущие игры": "Future games",
        "Сюда можно добавить новые проекты позже.": "You can add new projects here later.",
        "Ссылки": "Links",
        "Сюда можно добавить сайт, соцсети и другие официальные страницы студии.": "You can add the website, social media, and other official studio pages here.",
        "Сюда можно добавить Scratch, соцсети и другие официальные страницы студии.": "You can add Scratch, social media, and other official studio pages here.",
        "Загрузка...": "Loading...",
        "Ошибка загрузки": "Loading error",
        "Файл новостей не найден.": "News file not found.",
        "Вторая часть не найдена": "Second part not found",
        "Третья часть не найдена": "Third part not found"
    }
};

const placeholders = {
    en: {
        "Например: танки, стратегия": "For example: tanks, strategy"
    }
};

const pageTitles = {
    en: {
        "Игры | Games Studio": "Games | Games Studio",
        "Новости | Games Studio": "News | Games Studio",
        "Контакты | Games Studio": "Contacts | Games Studio",
        "Games Studio | Студия": "Games Studio | Studio",
        "Your Nightmare Studio | Студия": "Your Nightmare Studio | Studio"
    }
};

function detectLanguage() {
    const savedLanguage = localStorage.getItem("site-language");
    if (savedLanguage === "ru" || savedLanguage === "en") {
        return savedLanguage;
    }

    return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function getSiteLanguage() {
    return document.documentElement.lang === "en" ? "en" : "ru";
}

function setLanguage(language) {
    const nextLanguage = language === "en" ? "en" : "ru";
    localStorage.setItem("site-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
    translatePage(nextLanguage);
    window.dispatchEvent(new CustomEvent("site-language-change", { detail: { language: nextLanguage } }));
}

function translateTextNode(node, language) {
    const original = node.dataset?.i18nOriginal ?? node.textContent.trim();
    if (!original) {
        return;
    }

    if (node.dataset) {
        node.dataset.i18nOriginal = original;
    }

    node.textContent = language === "en" ? (translations.en[original] || original) : original;
}

function translatePage(language = getSiteLanguage()) {
    document.documentElement.lang = language;

    document.querySelectorAll("body *").forEach((element) => {
        if (element.children.length === 0) {
            translateTextNode(element, language);
        }

        if (element.placeholder) {
            const originalPlaceholder = element.dataset.i18nPlaceholder || element.placeholder;
            element.dataset.i18nPlaceholder = originalPlaceholder;
            element.placeholder = language === "en" ? (placeholders.en[originalPlaceholder] || originalPlaceholder) : originalPlaceholder;
        }
    });

    const originalTitle = document.documentElement.dataset.i18nTitle || document.title;
    document.documentElement.dataset.i18nTitle = originalTitle;
    document.title = language === "en" ? (pageTitles.en[originalTitle] || originalTitle) : originalTitle;
}

function initLanguage() {
    const language = detectLanguage();
    document.documentElement.lang = language;
    translatePage(language);
    window.dispatchEvent(new CustomEvent("site-language-change", { detail: { language } }));
}

function markActiveNav() {
    const currentPage = window.location.pathname.split("/").pop().toLowerCase() || "main.html";
    const storePages = new Set(["store.html", "game-tanks-wars.html", "game-tanks-wars-new-era.html", "game-savage-zone.html", "game-ashes-of-nations.html", "studio-games-studio.html", "studio-your-nightmare.html"]);
    const activePage = storePages.has(currentPage) ? "store.html" : currentPage;

    document.querySelectorAll(".top-nav-link, .nav-btn").forEach((link) => {
        const href = link.getAttribute("href");
        if (href && href.toLowerCase() === activePage) {
            link.classList.add("active");
        }
    });
}

function initScrollReveal() {
    const revealTargets = document.querySelectorAll([
        ".home-hero",
        ".home-grid article",
        ".home-section",
        ".game-preview a",
        ".store-head",
        ".store-toolbar",
        ".store-card",
        ".game-hero",
        ".game-section",
        ".contact-head",
        ".contacts",
        "#title",
        "#text"
    ].join(","));

    if (!revealTargets.length) {
        return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
        revealTargets.forEach((target) => target.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12
    });

    revealTargets.forEach((target, index) => {
        target.classList.add("reveal-on-scroll");
        target.style.transitionDelay = `${Math.min(index * 35, 210)}ms`;
        observer.observe(target);
    });
}

window.initScrollReveal = initScrollReveal;
window.getSiteLanguage = getSiteLanguage;
window.translatePage = translatePage;

loadLayout();
