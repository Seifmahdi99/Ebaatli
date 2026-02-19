// pages/store-detail.js — Single store with quota management & WhatsApp credentials

// Register "store-detail" as a page in router
if (typeof pages !== 'undefined') {
    pages['store-detail'] = { title: 'Store Detail', render: renderStoreDetail };
}

function showAlert(container, type, msg) {
    const el = document.createElement('div');
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    container.prepend(el);
    setTimeout(() => el.remove(), 4000);
}

async function renderStoreDetail({ storeId } = {}) {
    if (!storeId) {
        document.getElementById('pageContent').innerHTML = `<div class="alert alert-error">No store selected.</div>`;
        return;
    }

    const store = await api.get(`/admin/store/${storeId}`);

    const smsPercent = store.smsQuotaAllocated > 0
        ? Math.round((store.smsQuotaUsed / store.smsQuotaAllocated) * 100) : 0;
    const waPercent = store.whatsappQuotaAllocated > 0
        ? Math.round((store.whatsappQuotaUsed / store.whatsappQuotaAllocated) * 100) : 0;

    document.getElementById('pageTitle').textContent = store.name;

    document.getElementById('pageContent').innerHTML = `
    <!-- Back -->
    <button class="btn btn-ghost btn-sm mb-4" onclick="navigateTo('stores')">← Back to Stores</button>
    <div id="alerts"></div>

    <!-- Info grid -->
    <div class="grid-3 mb-4" style="margin-bottom:20px">
      <div class="card">
        <div class="card-title">Customers</div>
        <div style="font-size:1.8rem;font-weight:700;color:var(--accent)">${store._count?.customers ?? 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Orders</div>
        <div style="font-size:1.8rem;font-weight:700;color:var(--accent-2)">${store._count?.orders ?? 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Message Jobs</div>
        <div style="font-size:1.8rem;font-weight:700">${store._count?.messageJobs ?? 0}</div>
      </div>
    </div>

    <!-- Store meta -->
    <div class="card mb-4" style="margin-bottom:20px">
      <div class="flex justify-between items-center mb-4">
        <span class="section-title" style="margin:0">Store Info</span>
        <span class="badge ${store.status === 'active' ? 'badge-green' : 'badge-red'}">${store.status}</span>
      </div>
      <div class="grid-2">
        <div><div class="card-title">Platform Store ID</div><code style="color:var(--text-dim);font-size:0.85rem">${store.platformStoreId}</code></div>
        <div><div class="card-title">Platform</div><span>${store.platform}</span></div>
        <div><div class="card-title">Timezone</div><span>${store.timezone}</span></div>
        <div><div class="card-title">Currency</div><span>${store.currency}</span></div>
        <div><div class="card-title">Installed</div><span>${new Date(store.installedAt).toLocaleString()}</span></div>
        <div><div class="card-title">SMS Sender ID</div><span>${store.smsSenderId || '(default)'}</span></div>
      </div>
    </div>

    <!-- Quota management -->
    <div class="grid-2" style="gap:16px;margin-bottom:20px">
      <!-- SMS -->
      <div class="card">
        <div class="card-title">📱 SMS Quota</div>
        <div style="margin:10px 0">
          <div class="progress-wrap">
            <div class="progress-header">
              <span>${store.smsQuotaUsed} used / ${store.smsQuotaAllocated} allocated</span>
              <span>${smsPercent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${smsPercent > 90 ? 'danger' : smsPercent > 70 ? 'warning' : ''}" style="width:${Math.min(smsPercent, 100)}%"></div>
            </div>
          </div>
        </div>
        <form id="smsQuotaForm" class="flex gap-2 mt-4" style="margin-top:12px">
          <input type="number" id="smsQuotaInput" class="form-control" placeholder="New quota…" min="0" value="${store.smsQuotaAllocated}" />
          <button type="submit" class="btn btn-primary btn-sm">Save</button>
        </form>
        <div class="mt-4" style="margin-top:10px">
          <button class="btn btn-danger btn-sm" id="resetSmsBtn">Reset Usage to 0</button>
        </div>
      </div>

      <!-- WhatsApp -->
      <div class="card">
        <div class="card-title">💬 WhatsApp Quota</div>
        <div style="margin:10px 0">
          <div class="progress-wrap">
            <div class="progress-header">
              <span>${store.whatsappQuotaUsed} used / ${store.whatsappQuotaAllocated} allocated</span>
              <span>${waPercent}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${waPercent > 90 ? 'danger' : waPercent > 70 ? 'warning' : ''}" style="width:${Math.min(waPercent, 100)}%"></div>
            </div>
          </div>
        </div>
        <form id="waQuotaForm" class="flex gap-2 mt-4" style="margin-top:12px">
          <input type="number" id="waQuotaInput" class="form-control" placeholder="New quota…" min="0" value="${store.whatsappQuotaAllocated}" />
          <button type="submit" class="btn btn-primary btn-sm">Save</button>
        </form>
        <div class="flex items-center gap-2 mt-4" style="margin-top:10px">
          <label class="toggle">
            <input type="checkbox" id="waToggle" ${store.whatsappEnabled ? 'checked' : ''} />
            <div class="toggle-track"></div>
            <div class="toggle-thumb"></div>
          </label>
          <span style="font-size:0.85rem">WhatsApp ${store.whatsappEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>
    </div>

    <!-- WhatsApp credentials -->
    <div class="card">
      <div class="card-title">🔑 WhatsApp API Credentials</div>
      <p style="font-size:0.85rem;color:var(--text-muted);margin:6px 0 16px">
        Enter the merchant's Meta System User token to enable WhatsApp messaging for this store.
      </p>
      <form id="waCredForm">
        <div class="form-group">
          <label>Access Token</label>
          <input type="password" id="waToken" class="form-control" placeholder="EAAxxxxxxx…" value="${store.whatsappAccessToken || ''}" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Phone Number ID</label>
            <input type="text" id="waPhoneId" class="form-control" placeholder="123456789" value="${store.whatsappPhoneNumberId || ''}" />
          </div>
          <div class="form-group">
            <label>Business Account ID</label>
            <input type="text" id="waBusinessId" class="form-control" placeholder="987654321" value="${store.whatsappBusinessAccountId || ''}" />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">💾 Save WhatsApp Credentials</button>
      </form>
    </div>
  `;

    const alertsEl = document.getElementById('alerts');

    // SMS quota form
    document.getElementById('smsQuotaForm').addEventListener('submit', async e => {
        e.preventDefault();
        const quota = parseInt(document.getElementById('smsQuotaInput').value);
        try {
            await api.post(`/admin/store/${storeId}/sms-quota`, { quota });
            showAlert(alertsEl, 'success', `✅ SMS quota set to ${quota}`);
        } catch (err) { showAlert(alertsEl, 'error', err.message); }
    });

    // WA quota form
    document.getElementById('waQuotaForm').addEventListener('submit', async e => {
        e.preventDefault();
        const quota = parseInt(document.getElementById('waQuotaInput').value);
        try {
            await api.post(`/admin/store/${storeId}/whatsapp-quota`, { quota });
            showAlert(alertsEl, 'success', `✅ WhatsApp quota set to ${quota}`);
        } catch (err) { showAlert(alertsEl, 'error', err.message); }
    });

    // Reset usage
    document.getElementById('resetSmsBtn').addEventListener('click', async () => {
        if (!confirm('Reset all quota usage for this store?')) return;
        try {
            await api.post(`/admin/store/${storeId}/reset-quotas`, {});
            showAlert(alertsEl, 'success', '✅ Quotas reset successfully');
            setTimeout(() => renderStoreDetail({ storeId }), 1500);
        } catch (err) { showAlert(alertsEl, 'error', err.message); }
    });

    // WA toggle
    document.getElementById('waToggle').addEventListener('change', async e => {
        try {
            await api.patch(`/admin/store/${storeId}/whatsapp`, { enabled: e.target.checked });
            showAlert(alertsEl, 'success', `✅ WhatsApp ${e.target.checked ? 'enabled' : 'disabled'}`);
        } catch (err) { showAlert(alertsEl, 'error', err.message); }
    });

    // WA credentials form
    document.getElementById('waCredForm').addEventListener('submit', async e => {
        e.preventDefault();
        try {
            await api.patch(`/admin/store/${storeId}/whatsapp-credentials`, {
                whatsappAccessToken: document.getElementById('waToken').value,
                whatsappPhoneNumberId: document.getElementById('waPhoneId').value,
                whatsappBusinessAccountId: document.getElementById('waBusinessId').value,
            });
            showAlert(alertsEl, 'success', '✅ WhatsApp credentials saved');
        } catch (err) { showAlert(alertsEl, 'error', err.message); }
    });
}
