async function loadUsage() {
    const storeId = localStorage.getItem('storeId');
    if (!storeId) return;

    try {
        const store = await api.get(`/merchant/usage/${storeId}`);
        const smsPercent =
            (store.smsQuotaUsed / store.smsQuotaAllocated) * 100 || 0;

        const waPercent =
            (store.whatsappQuotaUsed / store.whatsappQuotaAllocated) * 100 || 0;

        document.getElementById('pageContent').innerHTML = `
            <div class="card-grid">

                <div class="card">
                    <h3>SMS Usage</h3>
                    <p>${store.smsQuotaUsed} / ${store.smsQuotaAllocated}</p>
                    <div class="progress">
                        <div class="progress-bar" style="width:${smsPercent}%"></div>
                    </div>
                </div>

                <div class="card">
                    <h3>WhatsApp Usage</h3>
                    <p>${store.whatsappQuotaUsed} / ${store.whatsappQuotaAllocated}</p>
                    <div class="progress">
                        <div class="progress-bar" style="width:${waPercent}%"></div>
                    </div>
                </div>

            </div>
        `;

    } catch {
        document.getElementById('pageContent').innerHTML =
            `<div style="color:#f87171">Failed to load usage data</div>`;
    }
}