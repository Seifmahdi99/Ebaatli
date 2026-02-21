// pages/whatsapp.js - WhatsApp credential management for merchants

async function loadWhatsApp() {
  const storeId = localStorage.getItem('storeId');
  
  try {
    const store = await api.get(`/admin/store/${storeId}`);
    
    if (store.whatsappEnabled && store.whatsappAccessToken) {
      // Already connected - show status
      document.getElementById('pageContent').innerHTML = `
        <div class="card" style="max-width:700px;margin:0 auto">
          <h2 style="color:var(--success);margin-bottom:25px">✅ WhatsApp Connected</h2>
          
          <div style="padding:25px;background:rgba(16,185,129,0.08);border-radius:12px;margin-bottom:25px">
            <div style="margin-bottom:15px">
              <strong style="color:var(--text-muted);font-size:0.85rem">Phone Number ID:</strong>
              <div style="font-family:monospace;margin-top:5px">${store.whatsappPhoneNumberId || 'Not set'}</div>
            </div>
            <div style="margin-bottom:15px">
              <strong style="color:var(--text-muted);font-size:0.85rm">Business Account ID:</strong>
              <div style="font-family:monospace;margin-top:5px">${store.whatsappBusinessAccountId || 'Not set'}</div>
            </div>
            <div>
              <strong style="color:var(--text-muted);font-size:0.85rem">Status:</strong>
              <div style="margin-top:5px"><span style="color:var(--success)">● Active</span></div>
            </div>
          </div>
          
          <button class="btn btn-danger" onclick="disconnectWhatsApp()">
            Disconnect WhatsApp
          </button>
        </div>
      `;
    } else {
      // Not connected - show credential entry form
      document.getElementById('pageContent').innerHTML = `
        <div class="card" style="max-width:900px;margin:0 auto">
          <div style="text-align:center;padding:20px 20px 40px">
            <div style="font-size:3rem;margin-bottom:15px">💬</div>
            <h2>Connect Your WhatsApp Business Account</h2>
            <p style="color:var(--text-muted);margin:15px 0">
              Enter your WhatsApp Business API credentials to start sending automated messages
            </p>
          </div>
          
          <div id="alerts"></div>
          
          <form id="whatsappForm">
            <div class="form-group">
              <label>Phone Number ID</label>
              <input type="text" id="phoneNumberId" class="form-control" 
                     placeholder="1234567890123" required />
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">
                Found in: Meta Business Settings → WhatsApp Accounts → Phone Numbers
              </p>
            </div>
            
            <div class="form-group">
              <label>WhatsApp Business Account ID (WABA)</label>
              <input type="text" id="wabaId" class="form-control" 
                     placeholder="9876543210987" required />
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">
                Found in: Meta Business Settings → WhatsApp Accounts → Account ID
              </p>
            </div>
            
            <div class="form-group">
              <label>Access Token</label>
              <input type="password" id="accessToken" class="form-control" 
                     placeholder="EAA..." required />
              <p style="font-size:0.75rem;color:var(--text-muted);margin-top:6px">
                System User Token from Meta Business Settings → System Users
              </p>
            </div>
            
            <div style="background:rgba(139,92,246,0.08);padding:20px;border-radius:10px;margin:20px 0">
              <h4 style="font-size:0.9rem;margin-bottom:12px;color:var(--accent)">📚 How to get these credentials:</h4>
              <ol style="margin:0;padding-left:20px;font-size:0.85rem;line-height:1.8">
                <li>Go to <a href="https://business.facebook.com" target="_blank" style="color:var(--accent)">Meta Business Settings</a></li>
                <li>Navigate to System Users → Add new System User</li>
                <li>Click Generate Token → Select WhatsApp Business Account</li>
                <li>Check permissions: whatsapp_business_management + whatsapp_business_messaging</li>
                <li>Copy the token and credentials above</li>
              </ol>
            </div>
            
            <button type="submit" class="btn btn-primary" style="width:100%">
              🔗 Connect WhatsApp Account
            </button>
          </form>
        </div>
      `;
      
      document.getElementById('whatsappForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveWhatsAppCredentials();
      });
    }
  } catch (err) {
    document.getElementById('pageContent').innerHTML = `
      <div class="alert alert-error">Failed to load: ${err.message}</div>
    `;
  }
}

async function saveWhatsAppCredentials() {
  const storeId = localStorage.getItem('storeId');
  const alertsEl = document.getElementById('alerts');
  
  const credentials = {
    whatsappAccessToken: document.getElementById('accessToken').value,
    whatsappPhoneNumberId: document.getElementById('phoneNumberId').value,
    whatsappBusinessAccountId: document.getElementById('wabaId').value,
    whatsappEnabled: true
  };
  
  try {
    const submitBtn = document.querySelector('.btn-primary');
    submitBtn.textContent = '⏳ Connecting...';
    submitBtn.disabled = true;
    
    await api.patch(`/admin/store/${storeId}/whatsapp-credentials`, credentials);
    
    alertsEl.innerHTML = '<div class="alert alert-success">✅ Connected successfully!</div>';
    setTimeout(() => loadWhatsApp(), 2000);
  } catch (err) {
    alertsEl.innerHTML = `<div class="alert alert-error">❌ Failed: ${err.message}</div>`;
    const submitBtn = document.querySelector('.btn-primary');
    submitBtn.textContent = '🔗 Connect WhatsApp Account';
    submitBtn.disabled = false;
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

loadWhatsApp();
