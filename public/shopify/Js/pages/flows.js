// ── flows.js — Flows Tab (embedded app, toggle only) ─────────────────────────

const EMBEDDED_TRIGGERS = {
  order_created:   { label: 'Order Created',   color: '#10b981' },
  order_fulfilled: { label: 'Order Fulfilled',  color: '#8b5cf6' },
  order_cancelled: { label: 'Order Cancelled',  color: '#ef4444' },
  cart_abandoned:  { label: 'Abandoned Cart',   color: '#f59e0b' },
  cart_created:    { label: 'Cart Created',     color: '#06b6d4' },
};

async function loadFlows() {
  const { storeId } = window.APP;

  try {
    // ── 1. Subscription gate ────────────────────────────────────────────────
    const subRes  = await fetch(`/merchant/subscription/${storeId}`);
    const subData = subRes.ok ? await subRes.json() : { isSubscribed: false };

    if (!subData.isSubscribed) {
      document.getElementById('pageContent').innerHTML = `
        <div class="card" style="text-align:center;padding:40px 24px">
          <div style="font-size:2.5rem;margin-bottom:12px">🔒</div>
          <div style="font-weight:700;margin-bottom:8px">Subscription Required</div>
          <div class="text-muted text-sm" style="margin-bottom:20px;max-width:300px;margin-left:auto;margin-right:auto">
            Subscribe to <strong>Ebaatli Pro ($20/month)</strong> to create and activate automation flows.
          </div>
          <button class="btn btn-primary btn-sm"
                  onclick="document.querySelector('[data-tab=billing]').click()">
            Subscribe Now ↗
          </button>
        </div>`;
      return;
    }

    // ── 2. Load flows ───────────────────────────────────────────────────────
    const flows = await fetch(`/flows?storeId=${storeId}`).then(r => r.json());

    if (!flows || flows.length === 0) {
      document.getElementById('pageContent').innerHTML = `
        <div class="card" style="text-align:center;padding:40px 24px">
          <div style="font-size:2.5rem;margin-bottom:12px">⚡</div>
          <div style="font-weight:600;margin-bottom:6px">No flows yet</div>
          <div class="text-muted text-sm" style="margin-bottom:16px">
            Create automation flows in the Full Portal.
          </div>
          <a class="btn btn-primary btn-sm"
             href="${document.getElementById('portalBtn').href}" target="_blank">
            Open Full Portal ↗
          </a>
        </div>`;
      return;
    }

    const rows = flows.map(f => {
      const t = EMBEDDED_TRIGGERS[f.trigger] || { label: f.trigger, color: '#6b7280' };
      const steps = f.automationSteps?.length ?? 0;
      return `
      <div class="flow-row">
        <div class="flow-dot"
             style="background:${f.isActive ? 'var(--success)' : 'var(--text-muted)'};
                    box-shadow:${f.isActive ? '0 0 6px rgba(16,185,129,.4)' : 'none'}">
        </div>
        <div class="flow-info">
          <div class="flow-name">${esc(f.name)}</div>
          <div class="flow-meta">
            <span class="trigger-badge"
                  style="background:${t.color}22;color:${t.color}">
              ${t.label}
            </span>
            <span>${steps} step${steps !== 1 ? 's' : ''}</span>
            <span>${f.triggerCount ?? 0} run${(f.triggerCount ?? 0) !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <label class="toggle" title="${f.isActive ? 'Disable' : 'Enable'} flow">
          <input type="checkbox" id="ftoggle-${f.id}" ${f.isActive ? 'checked' : ''}>
          <div class="toggle-track"></div>
        </label>
      </div>`;
    }).join('');

    document.getElementById('pageContent').innerHTML = `
      <div class="card" style="padding:0 20px">
        ${rows}
      </div>
      <div class="text-muted text-sm mt-4" style="text-align:center">
        To create or edit flows, use the
        <a href="${document.getElementById('portalBtn').href}" target="_blank"
           style="color:var(--accent);text-decoration:none">Full Portal ↗</a>
      </div>`;

    // Attach toggle listeners
    flows.forEach(f => {
      const el = document.getElementById(`ftoggle-${f.id}`);
      if (el) el.addEventListener('change', () => handleFlowToggle(f.id, el.checked, el));
    });

  } catch (err) {
    document.getElementById('pageContent').innerHTML =
      `<div class="error-card">Failed to load flows: ${err.message}</div>`;
  }
}

async function handleFlowToggle(flowId, isActive, el) {
  el.disabled = true;
  try {
    const res = await fetch(`/flows/${flowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    if (res.status === 403) {
      el.checked = !isActive;
      alert('An active subscription is required to enable flows.');
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    el.checked = !isActive;
    alert('Failed to update flow: ' + err.message);
  } finally {
    el.disabled = false;
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
