async function loadSettings() {
    const storeId = localStorage.getItem('storeId');
    if (!storeId) return;

    try {
        const store = await api.get(`/merchant/store/${storeId}`);

        document.getElementById('pageContent').innerHTML = `
            <div class="card">

                <h3>Store Information</h3>

                <p><strong>Name:</strong> ${store.name}</p>
                <p><strong>Store ID:</strong> ${store.id}</p>

                <hr style="margin:20px 0;border-color:var(--border)" />

                <h4>Subscription & Quotas</h4>
                <p>SMS Allocated: ${store.smsQuotaAllocated}</p>
                <p>WhatsApp Allocated: ${store.whatsappQuotaAllocated}</p>

            </div>
        `;

    } catch {
        document.getElementById('pageContent').innerHTML =
            `<div style="color:#f87171">Failed to load store settings</div>`;
    }
}