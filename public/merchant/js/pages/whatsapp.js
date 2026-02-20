async function loadWhatsApp() {
    const storeId = localStorage.getItem('storeId');

    try {
        const store = await api.get(`/admin/store/${storeId}`);

        if (store.whatsappEnabled && store.whatsappAccessToken) {
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
            <p style="color:var(--text-muted);margin:15px 0">Enter your WhatsApp Business API credentials</p>
          </div>
          <div id="alerts"></div>
          <form id="whatsappForm">
            <div class="form-group">
              <label>Phone Number ID</label>
              <input type="text" id="phoneNumberId" class="form-control" placeholder="1234567890123" required />
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">Found in Meta Business Settings</p>
            </div>
            <div class="form-group">
              <label>Business Account ID (WABA)</label>
              <input type="text" id="wabaId" class="form-control" placeholder="9876543210987" required />
            </div>
            <div class="form-group">
              <label>Access Token</label>
              <input type="password" id="accessToken" class="form-control" placeholder="EAA..." required />
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">System User Token from Meta</p>
            </div>
            <div style="background:rgba(139,92,246,0.08);padding:20px;border-radius:10px;margin:20px 0">
              <h4 style="font-size:0.9rem;margin-bottom:12px">📚 How to get credentials:</h4>
              <ol style="margin:0;padding-left:20px;font-size:0.85rem;line-height:1.8">
                <li>Go to Meta Business Settings</li>
                <li>System Users → Create System User</li>
                <li>Generate Token with WhatsApp permissions</li>
                <li>Copy credentials above</li>
              </ol>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%">🔗 Connect WhatsApp</button>
          </form>
        </div>
      `;
            document.getElementById('whatsappForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveWhatsAppCredentials();
            });
        }
    } catch (err) {
        document.getElementById('pageContent').innerHTML = `<div class="alert alert-error">Failed: ${err.message}</div>`;
    }
}

async function saveWhatsAppCredentials() {
    const storeId = localStorage.getItem('storeId');
    const alertsEl = document.getElementById('alerts');

    const phoneNumberId = document.getElementById('phoneNumberId').value;
    const wabaId = document.getElementById('wabaId').value;
    const accessToken = document.getElementById('accessToken').value;

    // Frontend validation
    if (!phoneNumberId || !wabaId || !accessToken) {
        alertsEl.innerHTML = '<div class="alert alert-error">❌ All fields are required</div>';
        return;
    }

    // Validate Phone Number ID format
    if (!/^\d+$/.test(phoneNumberId)) {
        alertsEl.innerHTML = '<div class="alert alert-error">❌ Phone Number ID should contain only numbers</div>';
        return;
    }

    // Validate WABA ID format
    if (!/^\d+$/.test(wabaId)) {
        alertsEl.innerHTML = '<div class="alert alert-error">❌ Business Account ID should contain only numbers</div>';
        return;
    }

    // Validate token format
    if (!accessToken.startsWith('EAA')) {
        alertsEl.innerHTML = '<div class="alert alert-error">❌ Access Token should start with "EAA"</div>';
        return;
    }

    const credentials = {
        whatsappAccessToken: accessToken,
        whatsappPhoneNumberId: phoneNumberId,
        whatsappBusinessAccountId: wabaId,
        whatsappEnabled: true
    };

    try {
        const btn = document.querySelector('.btn-primary');
        btn.textContent = '⏳ Validating credentials...';
        btn.disabled = true;

        const response = await api.patch(`/admin/store/${storeId}/whatsapp-credentials`, credentials);

        alertsEl.innerHTML = '<div class="alert alert-success">✅ Credentials validated successfully! Connecting...</div>';
        setTimeout(() => loadWhatsApp(), 2000);
    } catch (err) {
        console.error('Failed to save credentials:', err);

        // Show detailed error message
        let errorMessage = 'Failed to connect WhatsApp';
        if (err.message) {
            errorMessage = err.message;
        }

        alertsEl.innerHTML = `
      <div class="alert alert-error">
        <strong>❌ Connection Failed</strong><br>
        ${errorMessage}
        <br><br>
        <small>Please verify your credentials in Meta Business Settings and try again.</small>
      </div>
    `;

        const btn = document.querySelector('.btn-primary');
        btn.textContent = '🔗 Connect WhatsApp';
        btn.disabled = false;
    }
}


async function disconnectWhatsApp() {
    if (!confirm('Disconnect WhatsApp?')) return;
    const storeId = localStorage.getItem('storeId');
    try {
        await api.patch(`/admin/store/${storeId}/whatsapp`, { enabled: false });
        alert('✅ Disconnected');
        loadWhatsApp();
    } catch (err) {
        alert('❌ Failed: ' + err.message);
    }
}
