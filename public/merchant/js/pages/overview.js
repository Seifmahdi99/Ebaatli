async function loadOverview() {
    const storeId = localStorage.getItem('storeId');

    if (!storeId) return;

    try {
        const store = await api.get(`/admin/store/${storeId}`);

        document.getElementById('pageContent').innerHTML = `
            <div class="card-grid">

                <div class="card">
                    <h3>SMS Usage</h3>
                    <p>${store.smsQuotaUsed} / ${store.smsQuotaAllocated}</p>
                </div>

                <div class="card">
                    <h3>WhatsApp Usage</h3>
                    <p>${store.whatsappQuotaUsed} / ${store.whatsappQuotaAllocated}</p>
                </div>

                <div class="card">
                    <h3>Customers</h3>
                    <p>${store._count?.customers || 0}</p>
                </div>

                <div class="card">
                    <h3>Orders</h3>
                    <p>${store._count?.orders || 0}</p>
                </div>

                <div class="card">
                    <h3>Messages Sent</h3>
                    <p>${store._count?.messageJobs || 0}</p>
                </div>

            </div>
        `;

        document.getElementById('lastUpdated').innerText =
            "Updated: " + new Date().toLocaleTimeString();

    } catch (err) {
        document.getElementById('pageContent').innerHTML =
            `<div style="color:#f87171">Failed to load store data</div>`;
    }
}

loadOverview();
