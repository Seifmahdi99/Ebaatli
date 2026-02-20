// ── whatsapp.js — WhatsApp Tab ────────────────────────────────────────────────

async function loadWhatsapp() {
  const { storeId } = window.APP;

  try {
    const data = await fetch(`/merchant/whatsapp/${storeId}`).then(r => r.json());
    const { connected, connection } = data;

    if (connected && connection) {
      document.getElementById('pageContent').innerHTML = `
        <div class="section-heading">Connection Status</div>

        <div class="wa-status-card" style="margin-bottom:14px">
          <div class="wa-icon">💬</div>
          <div class="wa-info">
            <div class="wa-label">
              <span class="status-dot status-connected"></span>WhatsApp Connected
            </div>
            <div class="wa-sub">${esc(connection.displayPhoneNumber || connection.phoneNumber || '')}</div>
          </div>
        </div>

        ${connection.qualityRating ? `
        <div class="card" style="margin-bottom:14px">
          <div class="card-title">Quality Rating</div>
          <div style="font-size:1.2rem;font-weight:700;color:${ratingColor(connection.qualityRating)}">
            ${connection.qualityRating.toUpperCase()}
          </div>
        </div>` : ''}

        <div class="card" style="margin-bottom:20px">
          <div class="card-title">Details</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between">
              <span class="text-muted">Phone Number ID</span>
              <span style="font-family:monospace;font-size:0.78rem">${esc(connection.phoneNumberId || '—')}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span class="text-muted">Business Account</span>
              <span style="font-family:monospace;font-size:0.78rem">${esc(connection.businessAccountId || '—')}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span class="text-muted">Status</span>
              <span class="text-success">${esc(connection.status || 'active')}</span>
            </div>
          </div>
        </div>

        <button class="btn btn-ghost btn-sm"
                style="color:var(--danger);border-color:rgba(239,68,68,0.3)"
                onclick="disconnectWhatsApp()">
          Disconnect WhatsApp
        </button>`;

    } else {
      document.getElementById('pageContent').innerHTML = `
        <div class="section-heading">Connection Status</div>

        <div class="wa-status-card" style="margin-bottom:20px">
          <div class="wa-icon">💬</div>
          <div class="wa-info">
            <div class="wa-label">
              <span class="status-dot status-disconnected"></span>Not Connected
            </div>
            <div class="wa-sub">Connect your WhatsApp Business account to send automated messages.</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;font-size:0.85rem;color:var(--text-muted)">
          <div style="margin-bottom:10px;font-weight:600;color:var(--text)">How to connect</div>
          <ol style="padding-left:18px;display:flex;flex-direction:column;gap:6px">
            <li>Click "Connect WhatsApp" below</li>
            <li>Enter your WhatsApp Business API credentials</li>
            <li>Verify your phone number</li>
            <li>Come back here to see your connection status</li>
          </ol>
        </div>

        <a class="btn btn-primary"
           href="/whatsapp/connect?storeId=${storeId}" target="_blank">
          Connect WhatsApp ↗
        </a>`;
    }

  } catch (err) {
    document.getElementById('pageContent').innerHTML =
      `<div class="error-card">Failed to load WhatsApp status: ${err.message}</div>`;
  }
}

async function disconnectWhatsApp() {
  if (!confirm('Disconnect WhatsApp? Automated WhatsApp messages will stop.')) return;
  const { storeId } = window.APP;
  try {
    const res = await fetch(`/whatsapp-oauth/disconnect?storeId=${storeId}`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await loadWhatsapp(); // Refresh
  } catch (err) {
    alert('Failed to disconnect: ' + err.message);
  }
}

function ratingColor(rating) {
  const r = (rating || '').toLowerCase();
  if (r === 'green' || r === 'high')   return 'var(--success)';
  if (r === 'yellow' || r === 'medium') return 'var(--warning)';
  return 'var(--danger)';
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
