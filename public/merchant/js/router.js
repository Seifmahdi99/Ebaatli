// router.js — simple SPA router for merchant panel

const routes = {
    overview: {
        title: "Overview",
        load: () => loadOverview?.()
    },
    usage: {
        title: "Usage",
        load: () => renderPlaceholder("Usage page coming soon")
    },
    whatsapp: {
        title: "WhatsApp",
        load: () => loadWhatsApp?.()
    },
    messages: {
        title: "Messages",
        load: () => renderPlaceholder("Message history coming soon")
    },
    settings: {
        title: "Settings",
        load: () => renderPlaceholder("Settings page coming soon")
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
    setTimeout(route.load, 50);
}

// default page
navigate("overview");


// fallback UI
function renderPlaceholder(text) {
    document.getElementById("pageContent").innerHTML = `
        <div style="padding:40px;text-align:center;color:var(--text-muted)">
            <h3>${text}</h3>
        </div>
    `;
}

// refresh button
document.getElementById("refreshBtn")?.addEventListener("click", () => {
    const active = document.querySelector(".nav-item.active")?.dataset.page;
    if (active) navigate(active);
});
