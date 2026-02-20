// ── overview.js — Overview Tab ────────────────────────────────────────────────

async function loadOverview() {
  const { storeId } = window.APP;

  try {
    const [store, flows] = await Promise.all([
      fetch(`/merchant/store/${storeId}`).then(r => r.json()),
      fetch(`/flows?storeId=${storeId}`).then(r => r.json()).catch(() => []),
    ]);

    const activeFlows  = Array.isArray(flows) ? flows.filter(f => f.isActive).length : 0;
    const totalFlows   = Array.isArray(flows) ? flows.length : 0;

    const smsUsed      = store.smsQuotaUsed      ?? 0;
    const smsTotal     = store.smsQuotaAllocated  ?? 0;
    const smsPct       = smsTotal > 0 ? Math.min(100, Math.round(smsUsed / smsTotal * 100)) : 0;
    const smsFill      = smsPct >= 90 ? 'danger' : smsPct >= 70 ? 'warn' : '';

    const waUsed       = store.whatsappQuotaUsed      ?? 0;
    const waTotal      = store.whatsappQuotaAllocated  ?? 0;
    const waPct        = waTotal > 0 ? Math.min(100, Math.round(waUsed / waTotal * 100)) : 0;
    const waFill       = waPct >= 90 ? 'danger' : waPct >= 70 ? 'warn' : '';

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
          <div class="stat-value">${(store.counts ?? store._count)?.customers ?? 0}</div>
          <div class="stat-label">Customers</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${(store.counts ?? store._count)?.orders ?? 0}</div>
          <div class="stat-label">Orders</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${(store.counts ?? store._count)?.messageJobs ?? 0}</div>
          <div class="stat-label">Messages Sent</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:${activeFlows > 0 ? 'var(--success)' : 'var(--text-muted)'}">${activeFlows}<span style="font-size:0.78rem;color:var(--text-muted);font-weight:400"> / ${totalFlows}</span></div>
          <div class="stat-label">Active Flows</div>
        </div>
      </div>

      <!-- Quick links -->
      <div class="section-heading">Quick Actions</div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="navigate('flows')">⚡ Flows</button>
        <button class="btn btn-ghost btn-sm" onclick="navigate('whatsapp')">💬 WhatsApp</button>
        <a class="btn btn-primary btn-sm" href="${document.getElementById('portalBtn').href}" target="_blank">
          Full Portal ↗
        </a>
      </div>`;

  } catch (err) {
    document.getElementById('pageContent').innerHTML =
      `<div class="error-card">Failed to load overview: ${err.message}</div>`;
  }
}
