async function loadLayout() {
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:"pre-fix",hypothesisId:"H1",location:"modules/layout.js:2",message:"loadLayout start",data:{pathname:window.location.pathname,protocol:window.location.protocol},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const headerSlot = document.getElementById("header-slot");
    const footerSlot = document.getElementById("footer-slot");

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:"pre-fix",hypothesisId:"H2",location:"modules/layout.js:8",message:"slots lookup",data:{hasHeaderSlot:Boolean(headerSlot),hasFooterSlot:Boolean(footerSlot)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!headerSlot || !footerSlot) {
        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:"pre-fix",hypothesisId:"H2",location:"modules/layout.js:12",message:"early return missing slot",data:{hasHeaderSlot:Boolean(headerSlot),hasFooterSlot:Boolean(footerSlot)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return;
    }

    if (window.location.protocol === "file:") {
        const headerHtml = '<div class="header"><h1>Games Studio</h1></div>';
        const footerHtml = '<div class="bottom-nav"><a class="nav-btn" href="main.html">Главная</a><a class="nav-btn" href="store.html">GSstore</a><a class="nav-btn" href="lessons.html">GSlessons</a><a class="nav-btn" href="contacts.html">Контакты</a></div>';
        headerSlot.innerHTML = headerHtml;
        footerSlot.innerHTML = footerHtml;
        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:"post-fix",hypothesisId:"H1",location:"modules/layout.js:19",message:"file protocol fallback injected",data:{headerLength:headerHtml.length,footerLength:footerHtml.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        markActiveNav();
        return;
    }

    try {
        const [headerResponse, footerResponse] = await Promise.all([
            fetch("../modules/header.html"),
            fetch("../modules/footer.html")
        ]);
        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:"pre-fix",hypothesisId:"H3",location:"modules/layout.js:22",message:"fetch responses",data:{headerOk:headerResponse.ok,footerOk:footerResponse.ok,headerStatus:headerResponse.status,footerStatus:footerResponse.status},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        if (!headerResponse.ok || !footerResponse.ok) {
            throw new Error("Не удалось загрузить layout.");
        }

        const headerHtml = await headerResponse.text();
        const footerHtml = await footerResponse.text();
        headerSlot.innerHTML = headerHtml;
        footerSlot.innerHTML = footerHtml;
        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:"pre-fix",hypothesisId:"H4",location:"modules/layout.js:33",message:"layout injected",data:{headerLength:headerHtml.length,footerLength:footerHtml.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        markActiveNav();
    } catch (error) {
        // #region agent log
        fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:"pre-fix",hypothesisId:"H1",location:"modules/layout.js:38",message:"loadLayout error",data:{errorMessage:error && error.message ? error.message : "unknown"},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.error(error);
    }
}

function markActiveNav() {
    const pageToLink = {
        "main.html": "main.html",
        "news.html": "main.html",
        "store.html": "store.html",
        "lessons.html": "lessons.html",
        "contacts.html": "contacts.html"
    };

    const currentPage = window.location.pathname.split("/").pop().toLowerCase();
    const activeHref = pageToLink[currentPage];
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:"pre-fix",hypothesisId:"H5",location:"modules/layout.js:54",message:"markActiveNav input",data:{currentPage,activeHref:activeHref || null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (!activeHref) {
        return;
    }

    document.querySelectorAll(".bottom-nav .nav-btn").forEach((link) => {
        const href = link.getAttribute("href");
        if (href && href.toLowerCase() === activeHref) {
            link.classList.add("active");
        }
    });
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:"pre-fix",hypothesisId:"H5",location:"modules/layout.js:67",message:"markActiveNav complete",data:{activeCount:document.querySelectorAll(".bottom-nav .nav-btn.active").length},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
}

function logLayoutMetrics(runIdValue) {
    const header = document.querySelector(".header");
    const firstPage = document.querySelector(".page");
    const footer = document.querySelector(".bottom-nav");
    const headerRect = header ? header.getBoundingClientRect() : null;
    const firstPageRect = firstPage ? firstPage.getBoundingClientRect() : null;
    const footerRect = footer ? footer.getBoundingClientRect() : null;
    const overlapTop = Boolean(headerRect && firstPageRect && firstPageRect.top < headerRect.bottom);
    const overlapBottom = Boolean(footerRect && firstPageRect && firstPageRect.bottom > footerRect.top);
    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/e5310ead-e837-4665-a660-13c38a9c6dbc",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:runIdValue,hypothesisId:"H6",location:"modules/layout.js:86",message:"layout metrics",data:{headerHeight:headerRect?headerRect.height:null,firstPageTop:firstPageRect?firstPageRect.top:null,firstPageBottom:firstPageRect?firstPageRect.bottom:null,footerTop:footerRect?footerRect.top:null,overlapTop,overlapBottom},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
}

loadLayout();
window.addEventListener("load", () => logLayoutMetrics("pre-fix"));