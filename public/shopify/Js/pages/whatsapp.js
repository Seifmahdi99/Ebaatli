// ── whatsapp.js — WhatsApp Tab (Shopify Embedded) ─────────────────────────────
// Meta Embedded Signup: FB.login gives us the auth code; postMessage gives us
// waba_id + phone_number_id. Both must arrive before we call the backend.

// Shared state — populated from two async sources
let _signupData = {};

// Register postMessage listener once at load time (not inside loadWhatsapp)
window.addEventListener('message', function(event) {
  if (!event.origin || !event.origin.endsWith('facebook.com')) return;

  try {
    const data = JSON.parse(event.data);
    if (data.type !== 'WA_EMBEDDED_SIGNUP') return;

    if (data.event === 'FINISH') {
      _signupData.phone_number_id = data.data.phone_number_id;
      _signupData.waba_id         = data.data.waba_id;
      console.log('[WhatsApp] postMessage FINISH:', data.data);
      tryCompleteSignup();
    } else if (data.event === 'CANCEL') {
      showWaAlert('error', 'Signup cancelled at step: ' + data.data.current_step);
    } else if (data.event === 'ERROR') {
      showWaAlert('error', 'Signup error: ' + data.data.error_message);
    }
  } catch (e) {
    // Non-JSON message from another origin — ignore
  }
});

// Called by the Connect button
function launchWhatsAppSignup() {
  _signupData = {}; // reset on each new attempt

  FB.login(function(response) {
    if (response.authResponse) {
      _signupData.code = response.authResponse.code;
      console.log('[WhatsApp] FB.login auth code received');
      tryCompleteSignup();
    } else {
      showWaAlert('error', 'Facebook login was cancelled or not authorized.');
    }
  }, {
    config_id: '26422865924018466',
    response_type: 'code',
    override_default_response_type: true,
    extras: { sessionInfoVersion: '3' },
  });
}

// Fires once BOTH the auth code AND the WABA data have arrived
async function tryCompleteSignup() {
  if (!_signupData.code || !_signupData.waba_id || !_signupData.phone_number_id) return;

  const { storeId } = window.APP;
  showWaAlert('info', '⏳ Connecting your WhatsApp Business account…');

  try {
    const res = await window.authFetch(`/admin/store/${storeId}/whatsapp-embedded-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code:            _signupData.code,
        phone_number_id: _signupData.phone_number_id,
        waba_id:         _signupData.waba_id,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Connection failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    showWaAlert('success', '✅ WhatsApp connected! Refreshing…');
    setTimeout(() => loadWhatsapp(), 1500);
  } catch (err) {
    showWaAlert('error', '❌ ' + err.message);
  }
}

function showWaAlert(type, message) {
  const el = document.getElementById('wa-alerts');
  if (!el) return;
  const styles = {
    info:    'background:rgba(0,0,0,0.04);color:var(--text-muted)',
    success: 'background:var(--success-lt);color:var(--success)',
    error:   'background:var(--danger-lt);color:var(--danger)',
  };
  el.innerHTML = `<div style="${styles[type]};padding:10px;border-radius:6px;font-size:0.8rem">${esc(message)}</div>`;
}

async function loadWhatsapp() {
  const { storeId } = window.APP;

  try {
    const store = await window.authFetch(`/merchant/store/${storeId}`).then(r => r.json());

    if (store.whatsappEnabled) {
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
          <p style="font-size:0.82rem;color:var(--text-muted);margin:0 0 16px">
            Click the button below to log in with Facebook and connect your WhatsApp Business account.
          </p>

          <div id="wa-alerts" style="margin-bottom:12px"></div>

          <button class="btn btn-primary" onclick="launchWhatsAppSignup()">
            Connect with Facebook
          </button>
        </div>`;
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
    const res = await window.authFetch(`/admin/store/${storeId}/whatsapp`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await loadWhatsapp();
  } catch (err) {
    alert('Failed to disconnect: ' + err.message);
  }
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
