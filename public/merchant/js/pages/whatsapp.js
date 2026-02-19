async function loadWhatsapp() {
    const storeId = localStorage.getItem('storeId');
    if (!storeId) return;

    try {
        const status = await api.get(`/merchant/whatsapp/${storeId}`);

        document.getElementById('pageContent').innerHTML = `
            <div class="card">

                <h3>WhatsApp Connection</h3>

                <p>Status:
                    <strong style="color:${status.connected ? '#4ade80' : '#f87171'}">
                        ${status.connected ? 'Connected' : 'Not Connected'}
                    </strong>
                </p>

                ${status.connected
                ? `
                        <button class="btn btn-danger" id="disconnectBtn">
                            Disconnect
                        </button>
                      `
                : `
                        <button class="btn btn-primary" id="connectBtn">
                            Connect WhatsApp
                        </button>
                      `
            }

            </div>
        `;

        if (status.connected) {
            document.getElementById('disconnectBtn')
                ?.addEventListener('click', () => {
                    window.location.href =
                        `/whatsapp/disconnect?storeId=${storeId}`;
                });
        } else {
            document.getElementById('connectBtn')
                ?.addEventListener('click', () => {
                    window.location.href =
                        `/whatsapp/connect?storeId=${storeId}`;
                });
        }

    } catch {
        document.getElementById('pageContent').innerHTML =
            `<div style="color:#f87171">Failed to load WhatsApp status</div>`;
    }
}