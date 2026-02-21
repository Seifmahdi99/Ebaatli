// ── overview.js — Merchant Panel Overview ─────────────────────────────────────
// Fixed: Consistent data access with proper fallbacks

async function loadOverview() {
    const storeId = localStorage.getItem('storeId');

    if (!storeId) return;

    try {
        const store = await api.get(`/merchant/store/${storeId}`);
        
        // Handle both _count and counts formats from API
        const counts = store._count || store.counts || {};
        const customerCount = counts.customers ?? 0;
        const orderCount = counts.orders ?? 0;
        const messageCount = counts.messageJobs ?? 0;

        // Quota values with fallbacks
        const smsUsed = store.smsQuotaUsed ?? 0;
        const smsTotal = store.smsQuotaAllocated ?? 0;
        const waUsed = store.whatsappQuotaUsed ?? 0;
        const waTotal = store.whatsappQuotaAllocated ?? 0;

        document.getElementById('pageContent').innerHTML = `
            <div class="card-grid">

                <div class="card">
                    <h3>SMS Usage</h3>
                    <p>${smsUsed} / ${smsTotal}</p>
                </div>

                <div class="card">
                    <h3>WhatsApp Usage</h3>
                    <p>${waUsed} / ${waTotal}</p>
                </div>

                <div class="card">
                    <h3>Customers</h3>
                    <p>${customerCount}</p>
                </div>

                <div class="card">
                    <h3>Orders</h3>
                    <p>${orderCount}</p>
                </div>

                <div class="card">
                    <h3>Messages Sent</h3>
                    <p>${messageCount}</p>
                </div>

            </div>
        `;

        document.getElementById('lastUpdated').innerText =
            "Updated: " + new Date().toLocaleTimeString();

    } catch (err) {
        document.getElementById('pageContent').innerHTML =
            `<div style="color:#f87171">Failed to load store data: ${err.message}</div>`;
    }
}

// Don't auto-load here - let router handle it
// loadOverview();
