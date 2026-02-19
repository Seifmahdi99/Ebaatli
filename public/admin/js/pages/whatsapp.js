// pages/whatsapp.js — WhatsApp credential management across all stores

async function renderWhatsApp() {
    const stores = await api.get('/admin/stores');

    document.getElementById('pageContent').innerHTML = `
    <div class="section-title">WhatsApp Credential Management</div>
    <p class="text-muted mb-4" style="margin-bottom:20px;font-size:0.9rem">
      Configure Meta WhatsApp Business API credentials for each merchant store.
      Each store needs its own System User access token.
    </p>

    <div id="waStoreList">
      ${stores.map(store => `
        <div class="card mb-4" style="margin-bottom:16px" id="wa-card-${store.id}">
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-3">
              <div class="store-avatar" style="width:36px;height:36px;font-size:14px">${store.name.charAt(0).toUpperCase()}</div>
              <div>
                <div style="font-weight:600">${store.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${store.platformStoreId}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="badge ${store.whatsappEnabled ? 'badge-green' : 'badge-yellow'}">
                ${store.whatsappEnabled ? '✅ Connected' : '⚠️ Not Set'}
              </span>
            </div>
          </div>

          <div id="alerts-${store.id}"></div>

          <form id="form-${store.id}" style="display:${store.whatsappEnabled ? 'none' : 'block'}">
            <div class="form-group">
              <label>System User Access Token</label>
              <input type="password" id="token-${store.id}" class="form-control" placeholder="EAAxxxxxxx…" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Phone Number ID</label>
                <input type="text" id="phoneId-${store.id}" class="form-control" placeholder="123456789" />
              </div>
              <div class="form-group">
                <label>Business Account ID</label>
                <input type="text" id="businessId-${store.id}" class="form-control" placeholder="987654321" />
              </div>
            </div>
            <div class="flex gap-2">
              <button type="submit" class="btn btn-primary btn-sm">💾 Save Credentials</button>
            </div>
          </form>

          ${store.whatsappEnabled ? `
            <div class="flex gap-2">
              <button class="btn btn-ghost btn-sm" onclick="toggleWaForm('${store.id}')">✏️ Edit Credentials</button>
              <button class="btn btn-danger btn-sm" onclick="disableWhatsApp('${store.id}', '${store.name}')">Disable</button>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;

    // Attach form submit handlers
    stores.forEach(store => {
        const form = document.getElementById(`form-${store.id}`);
        if (!form) return;
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const alertsEl = document.getElementById(`alerts-${store.id}`);
            try {
                await api.patch(`/admin/store/${store.id}/whatsapp-credentials`, {
                    whatsappAccessToken: document.getElementById(`token-${store.id}`).value,
                    whatsappPhoneNumberId: document.getElementById(`phoneId-${store.id}`).value,
                    whatsappBusinessAccountId: document.getElementById(`businessId-${store.id}`).value,
                    whatsappEnabled: true,
                });
                const el = document.createElement('div');
                el.className = 'alert alert-success';
                el.textContent = `✅ Credentials saved for ${store.name}`;
                alertsEl.prepend(el);
                setTimeout(() => renderWhatsApp(), 1500);
            } catch (err) {
                const el = document.createElement('div');
                el.className = 'alert alert-error';
                el.textContent = err.message;
                alertsEl.prepend(el);
            }
        });
    });
}

function toggleWaForm(storeId) {
    const form = document.getElementById(`form-${storeId}`);
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function disableWhatsApp(storeId, storeName) {
    if (!confirm(`Disable WhatsApp for ${storeName}?`)) return;
    try {
        await api.patch(`/admin/store/${storeId}/whatsapp`, { enabled: false });
        renderWhatsApp();
    } catch (err) { alert(err.message); }
}
