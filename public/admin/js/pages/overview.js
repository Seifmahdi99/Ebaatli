// pages/overview.js — Platform stats dashboard

async function renderOverview() {
    const stats = await api.get('/admin/stats');

    const smsPercent = stats.sms.allocated > 0
        ? Math.round((stats.sms.used / stats.sms.allocated) * 100) : 0;
    const waPercent = stats.whatsapp.allocated > 0
        ? Math.round((stats.whatsapp.used / stats.whatsapp.allocated) * 100) : 0;

    document.getElementById('pageContent').innerHTML = `
    <!-- Stat cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🏪</div>
        <div class="stat-value" style="background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${stats.totalStores}</div>
        <div class="stat-label">Total Stores</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-value" style="color:var(--success)">${stats.activeStores}</div>
        <div class="stat-label">Active Stores</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📱</div>
        <div class="stat-value" style="color:var(--accent-2)">${stats.totalMessages.toLocaleString()}</div>
        <div class="stat-label">Total Messages Sent</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-value">${stats.totalOrders.toLocaleString()}</div>
        <div class="stat-label">Total Orders Tracked</div>
      </div>
    </div>

    <!-- Usage overview -->
    <div class="grid-2">
      <div class="card">
        <div class="card-title">📱 SMS Usage (Platform-Wide)</div>
        <div style="font-size:1.6rem;font-weight:700;margin:8px 0">${stats.sms.used} <span style="font-size:1rem;color:var(--text-muted)">/ ${stats.sms.allocated}</span></div>
        <div class="progress-wrap">
          <div class="progress-header">
            <span>${smsPercent}% used</span>
            <span>${stats.sms.remaining} remaining</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${smsPercent > 90 ? 'danger' : smsPercent > 70 ? 'warning' : ''}" style="width:${smsPercent}%"></div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">💬 WhatsApp Usage (Platform-Wide)</div>
        <div style="font-size:1.6rem;font-weight:700;margin:8px 0">${stats.whatsapp.used} <span style="font-size:1rem;color:var(--text-muted)">/ ${stats.whatsapp.allocated}</span></div>
        <div class="progress-wrap">
          <div class="progress-header">
            <span>${waPercent}% used</span>
            <span>${stats.whatsapp.remaining} remaining</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${waPercent > 90 ? 'danger' : waPercent > 70 ? 'warning' : ''}" style="width:${waPercent}%"></div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6">
      <div class="flex justify-between items-center mb-4">
        <span class="section-title">Quick Actions</span>
      </div>
      <div class="grid-3">
        <button class="card" style="cursor:pointer;text-align:left;border:none;background:var(--card-bg)" onclick="navigateTo('stores')">
          <div style="font-size:1.5rem;margin-bottom:8px">🏪</div>
          <div style="font-weight:600;margin-bottom:4px">Manage Stores</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">View and update store quotas</div>
        </button>
        <button class="card" style="cursor:pointer;text-align:left;border:none;background:var(--card-bg)" onclick="navigateTo('whatsapp')">
          <div style="font-size:1.5rem;margin-bottom:8px">💬</div>
          <div style="font-weight:600;margin-bottom:4px">WhatsApp Setup</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">Configure merchant credentials</div>
        </button>
        <button class="card" style="cursor:pointer;text-align:left;border:none;background:var(--card-bg)" onclick="navigateTo('activity')">
          <div style="font-size:1.5rem;margin-bottom:8px">⚡</div>
          <div style="font-weight:600;margin-bottom:4px">Activity Log</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">Monitor recent events</div>
        </button>
      </div>
    </div>
  `;
}
