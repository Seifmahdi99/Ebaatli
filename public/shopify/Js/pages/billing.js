// ── billing.js — Shopify Embedded App Billing Page ───────────────────────────

async function loadBilling() {
  const el   = document.getElementById('pageContent');
  const shop = window.APP?.platformStoreId;

  if (!shop) {
    el.innerHTML = `<div class="error-card">Unable to identify store. Please reload the page.</div>`;
    return;
  }

  el.innerHTML = `<div class="loading"><div class="spinner"></div>Loading subscription info…</div>`;

  // ── Fetch current subscription status ───────────────────────────────────────
  let subscriptions = [];
  try {
    const res = await fetch(`/shopify/billing/status?shop=${encodeURIComponent(shop)}`);
    if (res.ok) {
      const data = await res.json();
      subscriptions = data.subscriptions || [];
    }
  } catch (_) { /* render as no active subscription */ }

  const active = subscriptions.find(s => s.status === 'ACTIVE');

  // ── Render ───────────────────────────────────────────────────────────────────
  el.innerHTML = `
    <div style="max-width:520px;margin:0 auto;">

      <!-- Plan card -->
      <div class="card" style="margin-bottom:12px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--accent-2));"></div>
        <div style="padding:4px 0 14px;">
          <div class="card-title">Current Plan</div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <span style="font-size:1.6rem;font-weight:800;color:var(--accent);">$20</span>
            <span style="font-size:0.85rem;color:var(--text-muted);">/ month</span>
            ${active
              ? `<span style="margin-left:auto;font-size:0.7rem;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(0,135,90,0.12);color:var(--success);text-transform:uppercase;letter-spacing:.05em;">Active</span>`
              : `<span style="margin-left:auto;font-size:0.7rem;font-weight:700;padding:3px 10px;border-radius:99px;background:rgba(209,44,13,0.1);color:var(--danger);text-transform:uppercase;letter-spacing:.05em;">No Active Plan</span>`
            }
          </div>
          <div style="font-size:0.8rem;font-weight:600;color:var(--text-muted);margin-bottom:16px;">Ebaatli Pro · billed every 30 days</div>
          ${active ? `
            <div class="info-banner" style="margin-bottom:12px;">
              ✅ Your subscription is active. Renewal: <strong>${active.currentPeriodEnd ? new Date(active.currentPeriodEnd).toLocaleDateString() : '—'}</strong>
            </div>` : ''}
        </div>

        <!-- Features included -->
        <div class="section-heading">What's included</div>
        <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:18px;">
          ${[
            'Unlimited automation flows',
            'SMS messaging (quota assigned by admin)',
            'WhatsApp Business messaging',
            'Cart abandonment recovery',
            'Order & fulfillment notifications',
            'Real-time usage dashboard',
            'Message history & logs',
          ].map(f => `
            <div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:var(--text-muted);">
              <span style="color:var(--success);font-weight:700;flex-shrink:0;">✓</span> ${f}
            </div>`).join('')}
        </div>

        ${!active ? `
          <button
            class="btn btn-primary"
            id="subscribeBtn"
            onclick="startSubscription()"
            style="width:100%;justify-content:center;padding:10px;">
            Subscribe Now — $20/month
          </button>
          <p style="font-size:0.72rem;color:var(--text-muted);text-align:center;margin-top:8px;">
            You will be redirected to Shopify to confirm your subscription.
          </p>
        ` : `
          <div style="font-size:0.78rem;color:var(--text-muted);text-align:center;">
            Manage or cancel your subscription from your Shopify Admin under <strong>Apps &amp; sales channels → Ebaatli</strong>.
          </div>
        `}
      </div>

      <!-- Error/status message slot -->
      <div id="billingMsg"></div>

    </div>
  `;
}

// ── Trigger subscription flow ─────────────────────────────────────────────────
async function startSubscription() {
  const shop = window.APP?.platformStoreId;
  const btn  = document.getElementById('subscribeBtn');
  const msg  = document.getElementById('billingMsg');

  if (!shop) return;

  btn.disabled    = true;
  btn.textContent = 'Creating subscription…';
  msg.innerHTML   = '';

  try {
    const res = await fetch(`/shopify/billing/subscribe?shop=${encodeURIComponent(shop)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Server error (${res.status})`);
    }

    if (data.confirmationUrl) {
      // Redirect merchant to Shopify's billing confirmation page
      window.top.location.href = data.confirmationUrl;
    } else {
      throw new Error('No confirmation URL returned. Please try again.');
    }
  } catch (err) {
    msg.innerHTML = `
      <div class="error-card" style="margin-top:10px;font-size:0.82rem;">
        ⚠️ ${err.message}
      </div>`;
    btn.disabled    = false;
    btn.textContent = 'Subscribe Now — $20/month';
  }
}
