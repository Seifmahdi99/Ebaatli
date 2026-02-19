// router.js – SPA-style navigation for the dashboard
checkAuth();

// Pages will be registered here by each page script
const pages = {};

let currentPage = 'overview';

function navigateTo(page, params = {}) {
    const def = pages[page];
    if (!def) {
        console.error('Page not found:', page, 'Available pages:', Object.keys(pages));
        return;
    }

    currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-item[data-page]').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${page}`);
    if (navEl) navEl.classList.add('active');

    document.getElementById('pageTitle').textContent = def.title;
    document.getElementById('pageContent').innerHTML = '<div class="loading">⏳ Loading…</div>';

    def.render(params).catch(err => {
        document.getElementById('pageContent').innerHTML = `
      <div class="alert alert-error">Error loading page: ${err.message}</div>
    `;
    });

    document.getElementById('lastUpdated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

// Sidebar clicks
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(el.dataset.page);
    });
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => logout());

// Refresh  
document.getElementById('refreshBtn').addEventListener('click', () => navigateTo(currentPage));

// Make navigateTo available globally
window.navigateTo = navigateTo;

// Manually register pages (since self-registration timing is unreliable)
window.addEventListener('load', () => {
    // Give page scripts time to define their functions
    setTimeout(() => {
        if (typeof renderOverview !== 'undefined') {
            pages.overview = { title: 'Overview', render: renderOverview };
        }
        if (typeof renderStores !== 'undefined') {
            pages.stores = { title: 'Stores', render: renderStores };
        }
        if (typeof renderStoreDetail !== 'undefined') {
            pages['store-detail'] = { title: 'Store Detail', render: renderStoreDetail };
        }
        if (typeof renderWhatsApp !== 'undefined') {
            pages.whatsapp = { title: 'WhatsApp Credentials', render: renderWhatsApp };
        }
        if (typeof renderActivity !== 'undefined') {
            pages.activity = { title: 'Activity Log', render: renderActivity };
        }

        console.log('Registered pages:', Object.keys(pages));
        navigateTo('overview');
    }, 300);
});
