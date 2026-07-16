async function loadLayout() {
    const headerSlot = document.getElementById("header-slot");

    if (!headerSlot) {
        return;
    }

    if (window.location.protocol === "file:") {
        const headerHtml = '<div class="header"><a class="brand" href="main.html" aria-label="Games Studio"><img src="../Games Studio.png" alt=""><span>Games Studio</span></a><nav class="top-nav" aria-label="Основная навигация"><a class="top-nav-link" href="main.html">Главная</a><a class="top-nav-link" href="store.html">Магазин</a><a class="top-nav-link" href="news.html">Новости</a><a class="top-nav-link" href="contacts.html">Контакты</a></nav></div>';
        headerSlot.innerHTML = headerHtml;
        markActiveNav();
        return;
    }

    try {
        const headerResponse = await fetch("../modules/header.html");

        if (!headerResponse.ok) {
            throw new Error("Не удалось загрузить layout.");
        }

        const headerHtml = await headerResponse.text();
        headerSlot.innerHTML = headerHtml;
        markActiveNav();
    } catch (error) {
        console.error(error);
    }
}

function markActiveNav() {
    const currentPage = window.location.pathname.split("/").pop().toLowerCase() || "main.html";
    const storePages = new Set(["store.html", "game-tanks-wars.html", "game-tanks-wars-new-era.html", "game-savage-zone.html", "game-ashes-of-nations.html"]);
    const activePage = storePages.has(currentPage) ? "store.html" : currentPage;

    document.querySelectorAll(".top-nav-link, .nav-btn").forEach((link) => {
        const href = link.getAttribute("href");
        if (href && href.toLowerCase() === activePage) {
            link.classList.add("active");
        }
    });
}

loadLayout();
