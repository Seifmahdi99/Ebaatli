// ── whatsapp.js — Merchant Portal ─────────────────────────────────────────────
// Meta Embedded Signup: FB.login gives us the auth code; postMessage gives us
// waba_id + phone_number_id. Both must arrive before we call the backend.

// Shared state — populated from two async sources
let _signupData = {};

// Register postMessage listener once at load time
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

  const storeId = localStorage.getItem('storeId');
  showWaAlert('info', '⏳ Connecting your WhatsApp Business account…');

  try {
    await api.post(`/admin/store/${storeId}/whatsapp-embedded-signup`, {
      code:            _signupData.code,
      phone_number_id: _signupData.phone_number_id,
      waba_id:         _signupData.waba_id,
    });

    showWaAlert('success', '✅ WhatsApp connected! Refreshing…');
    setTimeout(() => loadWhatsapp(), 1500);
  } catch (err) {
    showWaAlert('error', '❌ ' + err.message);
  }
}

function showWaAlert(type, message) {
  const el = document.getElementById('alerts');
  if (!el) return;
  const cls = { info: '', success: 'alert-success', error: 'alert-error' };
  el.innerHTML = `<div class="alert ${cls[type]}">${message}</div>`;
}

async function loadWhatsapp() {
    const storeId = localStorage.getItem('storeId');
    if (!storeId) return;

    try {
        const store = await api.get(`/merchant/store/${storeId}`);

        if (store.whatsappEnabled) {
            document.getElementById('pageContent').innerHTML = `
        <div class="card" style="max-width:700px;margin:0 auto">
          <h2 style="color:var(--success);margin-bottom:25px">✅ WhatsApp Connected</h2>
          <div style="padding:25px;background:rgba(16,185,129,0.08);border-radius:12px;margin-bottom:25px">
            <div style="margin-bottom:15px">
              <strong>Phone Number ID:</strong>
              <div style="font-family:monospace;margin-top:5px">${store.whatsappPhoneNumberId || 'Not set'}</div>
            </div>
            <div style="margin-bottom:15px">
              <strong>Business Account ID:</strong>
              <div style="font-family:monospace;margin-top:5px">${store.whatsappBusinessAccountId || 'Not set'}</div>
            </div>
            <div>
              <strong>Status:</strong>
              <span style="color:var(--success);margin-left:10px">● Active</span>
            </div>
          </div>
          <button class="btn btn-danger" onclick="disconnectWhatsApp()">Disconnect WhatsApp</button>
        </div>
      `;
        } else {
            document.getElementById('pageContent').innerHTML = `
        <div class="card" style="max-width:900px;margin:0 auto">
          <div style="text-align:center;padding:20px 20px 40px">
            <div style="font-size:3rem;margin-bottom:15px">💬</div>
            <h2>Connect Your WhatsApp Business Account</h2>
            <p style="color:var(--text-muted);margin:15px 0">Click the button below to connect via Facebook</p>
          </div>
          <div id="alerts" style="margin-bottom:16px"></div>
          <div style="text-align:center">
            <button class="btn btn-primary" onclick="launchWhatsAppSignup()">
              Connect with Facebook
            </button>
          </div>
        </div>
      `;
        }
    } catch (err) {
        document.getElementById('pageContent').innerHTML =
            `<div class="alert alert-error">Failed to load WhatsApp status: ${err.message}</div>`;
    }
}

async function disconnectWhatsApp() {
    if (!confirm('Disconnect WhatsApp?')) return;
    const storeId = localStorage.getItem('storeId');
    try {
        await api.patch(`/admin/store/${storeId}/whatsapp`, { enabled: false });
        alert('✅ Disconnected');
        loadWhatsapp();
    } catch (err) {
        alert('❌ Failed: ' + err.message);
    }
}
