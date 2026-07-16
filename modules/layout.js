async function loadLayout() {
    const headerSlot = document.getElementById("header-slot");
    const footerSlot = document.getElementById("footer-slot");

    if (!headerSlot || !footerSlot) {
        return;
    }

    if (window.location.protocol === "file:") {
        const headerHtml = '<div class="header"><a class="brand" href="main.html" aria-label="Games Studio"><img src="../Games Studio.png" alt=""><span>Games Studio</span></a><nav class="top-nav" aria-label="Основная навигация"><a class="top-nav-link" href="main.html">Главная</a><a class="top-nav-link" href="store.html">Магазин</a><a class="top-nav-link" href="news.html">Новости</a><a class="top-nav-link" href="contacts.html">Контакты</a></nav></div>';
        const footerHtml = '<div class="bottom-nav"><a class="nav-btn" href="main.html">Главная</a><a class="nav-btn" href="store.html">Магазин</a><a class="nav-btn" href="news.html">Новости</a><a class="nav-btn" href="contacts.html">Контакты</a></div>';
        headerSlot.innerHTML = headerHtml;
        footerSlot.innerHTML = footerHtml;
        markActiveNav();
        return;
    }

    try {
        const [headerResponse, footerResponse] = await Promise.all([
            fetch("../modules/header.html"),
            fetch("../modules/footer.html")
        ]);

        if (!headerResponse.ok || !footerResponse.ok) {
            throw new Error("Не удалось загрузить layout.");
        }

        const headerHtml = await headerResponse.text();
        const footerHtml = await footerResponse.text();
        headerSlot.innerHTML = headerHtml;
        footerSlot.innerHTML = footerHtml;
        markActiveNav();
    } catch (error) {
        console.error(error);
    }
}

function markActiveNav() {
    const currentPage = window.location.pathname.split("/").pop().toLowerCase() || "main.html";
    const storePages = new Set(["store.html", "game-tanks-wars.html", "game-ashes-of-nations.html"]);
    const activePage = storePages.has(currentPage) ? "store.html" : currentPage;

    document.querySelectorAll(".top-nav-link, .nav-btn").forEach((link) => {
        const href = link.getAttribute("href");
        if (href && href.toLowerCase() === activePage) {
            link.classList.add("active");
        }
    });
}

loadLayout();
