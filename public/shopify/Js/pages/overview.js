// ── overview.js — Overview Tab (Shopify Embedded) ─────────────────────────────
// Fixed: Consistent data access matching merchant panel

async function loadOverview() {
  const { storeId } = window.APP;

  try {
    const [store, flows] = await Promise.all([
      window.authFetch(`/merchant/store/${storeId}`).then(r => r.json()),
      window.authFetch(`/flows?storeId=${storeId}`).then(r => r.json()).catch(() => []),
    ]);

    const activeFlows  = Array.isArray(flows) ? flows.filter(f => f.isActive).length : 0;
    const totalFlows   = Array.isArray(flows) ? flows.length : 0;

    // SMS quota - handle both formats
    const smsUsed      = store.smsQuotaUsed ?? 0;
    const smsTotal     = store.smsQuotaAllocated ?? 0;
    const smsPct       = smsTotal > 0 ? Math.min(100, Math.round(smsUsed / smsTotal * 100)) : 0;
    const smsFill      = smsPct >= 90 ? 'danger' : smsPct >= 70 ? 'warn' : '';

    // WhatsApp quota - handle both formats
    const waUsed       = store.whatsappQuotaUsed ?? 0;
    const waTotal      = store.whatsappQuotaAllocated ?? 0;
    const waPct        = waTotal > 0 ? Math.min(100, Math.round(waUsed / waTotal * 100)) : 0;
    const waFill       = waPct >= 90 ? 'danger' : waPct >= 70 ? 'warn' : '';

    // Counts - handle both _count and counts formats from API
    const counts = store._count || store.counts || {};
    const customerCount = counts.customers ?? 0;
    const orderCount = counts.orders ?? 0;
    const messageCount = counts.messageJobs ?? 0;

    document.getElementById('pageContent').innerHTML = `

      <!-- Quota cards -->
      <div class="section-heading">Message Quotas</div>
      <div class="grid-2" style="margin-bottom:20px">

        <div class="card">
          <div class="card-title">📱 SMS</div>
          <div style="font-size:1.4rem;font-weight:700">${smsUsed}<span style="font-size:0.85rem;color:var(--text-muted);font-weight:400"> / ${smsTotal}</span></div>
          <div class="progress-wrap">
            <div class="progress-header"><span>Used</span><span>${smsPct}%</span></div>
            <div class="progress-track">
              <div class="progress-fill ${smsFill}" style="width:${smsPct}%"></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">💬 WhatsApp</div>
          <div style="font-size:1.4rem;font-weight:700">${waUsed}<span style="font-size:0.85rem;color:var(--text-muted);font-weight:400"> / ${waTotal}</span></div>
          <div class="progress-wrap">
            <div class="progress-header"><span>Used</span><span>${waPct}%</span></div>
            <div class="progress-track">
              <div class="progress-fill ${waFill}" style="width:${waPct}%"></div>
            </div>
          </div>
        </div>

      </div>

      <!-- Stats row -->
      <div class="section-heading">Store Stats</div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${customerCount}</div>
          <div class="stat-label">Customers</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${orderCount}</div>
          <div class="stat-label">Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${messageCount}</div>
          <div class="stat-label">Messages Sent</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:${activeFlows > 0 ? 'var(--success)' : 'var(--text-muted)'}">${activeFlows}<span style="font-size:0.78rem;color:var(--text-muted);font-weight:400"> / ${totalFlows}</span></div>
          <div class="stat-label">Active Flows</div>
        </div>
      </div>

      <!-- Connection Status -->
      <div class="section-heading">Connection Status</div>
      <div class="grid-2" style="margin-bottom:20px">
        <div class="card" style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.2rem">💬</span>
          <div>
            <div style="font-weight:600;font-size:0.85rem">WhatsApp</div>
            <div style="font-size:0.75rem;color:${store.whatsappEnabled ? 'var(--success)' : 'var(--text-muted)'}">
              ${store.whatsappEnabled ? '● Connected' : '○ Not connected'}
            </div>
          </div>
        </div>
        <div class="card" style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.2rem">📱</span>
          <div>
            <div style="font-weight:600;font-size:0.85rem">SMS</div>
            <div style="font-size:0.75rem;color:${smsTotal > 0 ? 'var(--success)' : 'var(--text-muted)'}">
              ${smsTotal > 0 ? '● Active' : '○ No quota'}
            </div>
          </div>
        </div>
      </div>

      <!-- Quick links -->
      <div class="section-heading">Quick Actions</div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="navigate('flows')">⚡ Manage Flows</button>
        <button class="btn btn-ghost btn-sm" onclick="navigate('whatsapp')">💬 WhatsApp Settings</button>
        <a class="btn btn-primary btn-sm" href="${document.getElementById('portalBtn').href}" target="_blank">
          Full Portal ↗
        </a>
      </div>`;

  } catch (err) {
    document.getElementById('pageContent').innerHTML =
      `<div class="error-card">Failed to load overview: ${err.message}</div>`;
  }
}
