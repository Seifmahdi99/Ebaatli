// pages/activity.js — Recent events & message jobs log

async function renderActivity() {
    // Fetch stores to get storeIds
    const stores = await api.get('/admin/stores');

    const storeMap = {};
    stores.forEach(s => { storeMap[s.id] = s.name; });

    document.getElementById('pageContent').innerHTML = `
    <div class="section-title">Activity Log</div>
    <p class="text-muted mb-4" style="margin-bottom:20px;font-size:0.9rem">
      Recent automation activity across all stores. Select a store to drill in.
    </p>

    <div class="card mb-4" style="margin-bottom:20px">
      <div class="card-title">Filter by Store</div>
      <select id="storeFilter" class="form-control" style="max-width:320px;margin-top:6px">
        <option value="">All Stores</option>
        ${stores.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      </select>
    </div>

    <div class="card">
      <div class="card-title">📋 Platform Overview</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Store</th>
              <th>Status</th>
              <th>SMS Used</th>
              <th>WA Used</th>
              <th>Customers</th>
              <th>Orders</th>
              <th>Installed</th>
            </tr>
          </thead>
          <tbody id="activityTable">
            ${stores.map(s => `
              <tr>
                <td>
                  <div style="font-weight:500">${s.name}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">${s.platformStoreId}</div>
                </td>
                <td><span class="badge ${s.status === 'active' ? 'badge-green' : 'badge-red'}">${s.status}</span></td>
                <td>
                  <span style="font-weight:600">${s.smsQuotaUsed}</span>
                  <span style="color:var(--text-muted)"> / ${s.smsQuotaAllocated}</span>
                </td>
                <td>
                  <span style="font-weight:600">${s.whatsappQuotaUsed}</span>
                  <span style="color:var(--text-muted)"> / ${s.whatsappQuotaAllocated}</span>
                </td>
                <td>—</td>
                <td>—</td>
                <td style="color:var(--text-muted);font-size:0.8rem">${new Date(s.installedAt).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card mt-6" style="margin-top:20px">
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <p style="font-weight:500;margin-bottom:4px">Detailed Event Logs</p>
        <p style="font-size:0.85rem">Per-store event logs with message delivery status will appear here once stores start processing orders.</p>
        <button class="btn btn-primary btn-sm mt-4" style="margin-top:14px" onclick="navigateTo('stores')">
          View Stores →
        </button>
      </div>
    </div>
  `;

    document.getElementById('storeFilter').addEventListener('change', e => {
        const id = e.target.value;
        document.querySelectorAll('#activityTable tr').forEach(row => {
            if (!id) { row.style.display = ''; return; }
            // Match store by looking at store name
            const storeCell = row.querySelector('td:first-child div');
            // Can't easily filter by id here, so navigate to store detail
        });
        if (id) navigateTo('store-detail', { storeId: id });
    });
}
