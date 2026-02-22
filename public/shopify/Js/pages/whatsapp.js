// ── whatsapp.js — WhatsApp Tab (Shopify Embedded) ─────────────────────────────
// Fixed: Now uses credential entry form like merchant panel instead of OAuth

async function loadWhatsapp() {
  const { storeId } = window.APP;

  try {
    const store = await window.authFetch(`/merchant/store/${storeId}`).then(r => r.json());

    if (store.whatsappEnabled) {
      // Connected state - show status and disconnect option
      document.getElementById('pageContent').innerHTML = `
        <div class="section-heading">Connection Status</div>

        <div class="wa-status-card" style="margin-bottom:14px">
          <div class="wa-icon">💬</div>
          <div class="wa-info">
            <div class="wa-label">
              <span class="status-dot status-connected"></span>WhatsApp Connected
            </div>
            <div class="wa-sub">Your WhatsApp Business account is active</div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px">
          <div class="card-title">Connection Details</div>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:0.82rem">
            <div style="display:flex;justify-content:space-between">
              <span class="text-muted">Phone Number ID</span>
              <span style="font-family:monospace;font-size:0.78rem">${esc(store.whatsappPhoneNumberId || '—')}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span class="text-muted">Business Account ID</span>
              <span style="font-family:monospace;font-size:0.78rem">${esc(store.whatsappBusinessAccountId || '—')}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span class="text-muted">Status</span>
              <span class="text-success">● Active</span>
            </div>
          </div>
        </div>

        <button class="btn btn-ghost btn-sm"
                style="color:var(--danger);border-color:rgba(239,68,68,0.3)"
                onclick="disconnectWhatsApp()">
          Disconnect WhatsApp
        </button>`;

    } else {
      // Not connected - show credential entry form
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

        <div class="card" style="margin-bottom:16px">
          <div class="card-title">Connect Your WhatsApp Business Account</div>
          
          <div id="wa-alerts" style="margin-bottom:12px"></div>
          
          <form id="whatsappForm" style="display:flex;flex-direction:column;gap:12px">
            <div>
              <label style="font-size:0.75rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">
                PHONE NUMBER ID
              </label>
              <input type="text" id="phoneNumberId" 
                     placeholder="1234567890123"
                     style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;background:var(--input-bg)" 
                     required />
              <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">Found in Meta Business Settings</div>
            </div>
            
            <div>
              <label style="font-size:0.75rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">
                BUSINESS ACCOUNT ID (WABA)
              </label>
              <input type="text" id="wabaId" 
                     placeholder="2143319519832175"
                     style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;background:var(--input-bg)" 
                     required />
            </div>
            
            <div>
              <label style="font-size:0.75rem;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">
                ACCESS TOKEN
              </label>
              <input type="password" id="accessToken" 
                     placeholder="EAAxxxxx..."
                     style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;background:var(--input-bg)" 
                     required />
              <div style="font-size:0.7rem;color:var(--text-muted);margin-top:4px">System User Token from Meta</div>
            </div>
            
            <button type="submit" class="btn btn-primary" id="connectBtn" style="margin-top:8px">
              🔗 Connect WhatsApp
            </button>
          </form>
        </div>

        <div class="info-banner">
          <span>📚</span>
          <div>
            <strong style="display:block;margin-bottom:4px">How to get credentials:</strong>
            <ol style="margin:0;padding-left:16px;font-size:0.75rem;line-height:1.6">
              <li>Go to Meta Business Settings</li>
              <li>System Users → Create System User</li>
              <li>Generate Token with WhatsApp permissions</li>
              <li>Copy credentials above</li>
            </ol>
          </div>
        </div>`;

      // Attach form handler
      document.getElementById('whatsappForm').addEventListener('submit', handleWhatsAppSubmit);
    }

  } catch (err) {
    document.getElementById('pageContent').innerHTML =
      `<div class="error-card">Failed to load WhatsApp status: ${err.message}</div>`;
  }
}

async function handleWhatsAppSubmit(e) {
  e.preventDefault();
  
  const { storeId } = window.APP;
  const alertsEl = document.getElementById('wa-alerts');
  const btn = document.getElementById('connectBtn');

  const phoneNumberId = document.getElementById('phoneNumberId').value.trim();
  const wabaId = document.getElementById('wabaId').value.trim();
  const accessToken = document.getElementById('accessToken').value.trim();

  // Clear previous alerts
  alertsEl.innerHTML = '';

  // Validation
  if (!phoneNumberId || !wabaId || !accessToken) {
    alertsEl.innerHTML = `<div style="background:var(--danger-lt);color:var(--danger);padding:10px;border-radius:6px;font-size:0.8rem">
      ❌ All fields are required
    </div>`;
    return;
  }

  if (!/^\d+$/.test(phoneNumberId)) {
    alertsEl.innerHTML = `<div style="background:var(--danger-lt);color:var(--danger);padding:10px;border-radius:6px;font-size:0.8rem">
      ❌ Phone Number ID should contain only numbers
    </div>`;
    return;
  }

  if (!/^\d+$/.test(wabaId)) {
    alertsEl.innerHTML = `<div style="background:var(--danger-lt);color:var(--danger);padding:10px;border-radius:6px;font-size:0.8rem">
      ❌ Business Account ID should contain only numbers
    </div>`;
    return;
  }

  if (!accessToken.startsWith('EAA')) {
    alertsEl.innerHTML = `<div style="background:var(--danger-lt);color:var(--danger);padding:10px;border-radius:6px;font-size:0.8rem">
      ❌ Access Token should start with "EAA"
    </div>`;
    return;
  }

  // Submit
  try {
    btn.textContent = '⏳ Validating...';
    btn.disabled = true;

    const res = await window.authFetch(`/admin/store/${storeId}/whatsapp-credentials`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        whatsappAccessToken: accessToken,
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: wabaId,
        whatsappEnabled: true,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Validation failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    alertsEl.innerHTML = `<div style="background:var(--success-lt);color:var(--success);padding:10px;border-radius:6px;font-size:0.8rem">
      ✅ Credentials validated! Connecting...
    </div>`;

    setTimeout(() => loadWhatsapp(), 1500);

  } catch (err) {
    btn.textContent = '🔗 Connect WhatsApp';
    btn.disabled = false;

    alertsEl.innerHTML = `<div style="background:var(--danger-lt);color:var(--danger);padding:10px;border-radius:6px;font-size:0.8rem">
      <strong>❌ Connection Failed</strong><br>
      ${esc(err.message)}<br>
      <small style="opacity:0.8">Please verify your credentials in Meta Business Settings.</small>
    </div>`;
  }
}

async function disconnectWhatsApp() {
  if (!confirm('Disconnect WhatsApp? Automated WhatsApp messages will stop.')) return;
  
  const { storeId } = window.APP;
  
  try {
    const res = await window.authFetch(`/admin/store/${storeId}/whatsapp`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    await loadWhatsapp(); // Refresh
  } catch (err) {
    alert('Failed to disconnect: ' + err.message);
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
