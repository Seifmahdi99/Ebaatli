// router.js — simple SPA router for merchant panel

const routes = {
    overview: {
        title: "Overview",
        load: () => loadOverview?.()
    },
    usage: {
        title: "Usage",
        load: () => loadUsage?.()
    },
    whatsapp: {
        title: "WhatsApp",
        load: () => loadWhatsapp?.()
    },
    flows: {
        title: "Flows",
        load: () => loadFlows?.()
    },
    messages: {
        title: "Messages",
        load: () => loadMessages?.()
    },
    settings: {
        title: "Settings",
        load: () => loadSettings?.()
    }
};

// Sidebar navigation
document.querySelectorAll(".nav-item[data-page]").forEach(item => {
    item.addEventListener("click", () => {
        navigate(item.dataset.page);
    });
});

function navigate(page) {
    const route = routes[page];
    if (!route) return;

    // highlight active
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelector(`[data-page="${page}"]`)?.classList.add("active");

    // set title
    document.getElementById("pageTitle").innerText = route.title;

    // show loading
    document.getElementById("pageContent").innerHTML =
        `<div class="loading">Loading…</div>`;

    // load page
    setTimeout(() => {
        try {
            route.load();
        } catch (err) {
            document.getElementById("pageContent").innerHTML =
                `<div style="color:#f87171">Page failed to load</div>`;
        }
    }, 50);
}

// default page
navigate("overview");

// refresh button
document.getElementById("refreshBtn")?.addEventListener("click", () => {
    const active = document.querySelector(".nav-item.active")?.dataset.page;
    if (active) navigate(active);
});