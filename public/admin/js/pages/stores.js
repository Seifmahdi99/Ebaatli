// pages/stores.js – Store list with quota bars

async function renderStores() {
    const stores = await api.get('/admin/stores');

    if (!stores || stores.length === 0) {
        document.getElementById('pageContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏪</div>
        <p>No stores connected yet.</p>
      </div>`;
        return;
    }

    const searchId = 'storeSearch_' + Date.now();

    document.getElementById('pageContent').innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <span class="section-title">All Stores <span style="font-size:0.9rem;font-weight:400;color:var(--text-muted)">(${stores.length})</span></span>
      <input type="text" id="${searchId}" class="form-control" placeholder="🔍 Search stores…" style="max-width:240px;padding:8px 14px" />
    </div>
    <div class="stores-grid" id="storesGrid"></div>
  `;

    function renderGrid(list) {
        document.getElementById('storesGrid').innerHTML = list.map(store => `
      <div class="store-card" onclick="window.navigateTo('store-detail', { storeId: '${store.id}' })">
        <div class="store-header">
          <div class="store-avatar">${store.name.charAt(0).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div class="store-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${store.name}</div>
            <div class="store-domain">${store.platformStoreId}</div>
          </div>
          <span class="badge ${store.status === 'active' ? 'badge-green' : 'badge-red'}">${store.status}</span>
        </div>

        <div style="margin-bottom:10px">
          <div class="progress-wrap">
            <div class="progress-header">
              <span style="font-size:0.75rem">📱 SMS</span>
              <span style="font-size:0.75rem">${store.smsQuotaUsed} / ${store.smsQuotaAllocated}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${store.smsPercentUsed > 90 ? 'danger' : store.smsPercentUsed > 70 ? 'warning' : ''}"
                   style="width:${Math.min(store.smsPercentUsed || 0, 100)}%"></div>
            </div>
          </div>
          <div class="progress-wrap" style="margin-top:8px">
            <div class="progress-header">
              <span style="font-size:0.75rem">💬 WhatsApp</span>
              <span style="font-size:0.75rem">${store.whatsappQuotaUsed} / ${store.whatsappQuotaAllocated}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${store.whatsappPercentUsed > 90 ? 'danger' : store.whatsappPercentUsed > 70 ? 'warning' : ''}"
                   style="width:${Math.min(store.whatsappPercentUsed || 0, 100)}%"></div>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center">
          <span style="font-size:0.75rem;color:var(--text-muted)">
            ${store.whatsappEnabled ? '✅ WhatsApp on' : '⭕ WhatsApp off'}
          </span>
          <span style="font-size:0.75rem;color:var(--text-muted)">
            ${new Date(store.installedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    `).join('');
    }

    renderGrid(stores);

    document.getElementById(searchId).addEventListener('input', e => {
        const q = e.target.value.toLowerCase();
        renderGrid(stores.filter(s =>
            s.name.toLowerCase().includes(q) || s.platformStoreId.toLowerCase().includes(q)
        ));
    });
}
