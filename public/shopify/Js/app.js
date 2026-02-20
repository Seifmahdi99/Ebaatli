// ── app.js — Shopify Embedded App Bootstrap ───────────────────────────────────

window.APP = null;   // { storeId, name, ... } populated after lookup

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const shop   = params.get('shop');
  const host   = params.get('host') || '';

  // ── 1. Validate shop param ──────────────────────────────────────────────────
  if (!shop) {
    showFatalError('No shop parameter found. Please open this app from your Shopify Admin.');
    return;
  }

  // ── 2. Look up store by shop domain ────────────────────────────────────────
  let storeData;
  try {
    const res = await fetch(`/merchant/by-shop?shop=${encodeURIComponent(shop)}`);
    if (res.status === 404) {
      // Store not installed — trigger OAuth
      window.location.href = `/shopify/install?shop=${encodeURIComponent(shop)}`;
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    storeData = await res.json();
  } catch (err) {
    showFatalError(`Could not connect to your store: ${err.message}`);
    return;
  }

  window.APP = storeData;

  // ── 3. Initialize Shopify App Bridge ────────────────────────────────────────
  try {
    const cfgRes = await fetch('/shopify/config');
    if (cfgRes.ok) {
      const { apiKey } = await cfgRes.json();
      if (apiKey && host && window['@shopify/app-bridge']) {
        const { createApp } = window['@shopify/app-bridge'];
        createApp({ apiKey, host });
      }
    }
  } catch (_) { /* App Bridge is optional — continue without it */ }

  // ── 4. Render shell UI ───────────────────────────────────────────────────────
  document.getElementById('storeName').textContent = storeData.name || shop;
  document.getElementById('portalBtn').href =
    `/merchant/index.html?storeId=${storeData.storeId}`;

  document.getElementById('topbar').style.display = 'flex';
  document.getElementById('tabs').style.display   = 'flex';

  // ── 5. Wire tabs ─────────────────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.tab));
  });

  // ── 6. Load default tab ───────────────────────────────────────────────────────
  navigate('overview');
})();

// ── Navigation ─────────────────────────────────────────────────────────────────
function navigate(tab) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('pageContent').innerHTML =
    `<div class="loading"><div class="spinner"></div>Loading…</div>`;

  setTimeout(() => {
    try {
      if (tab === 'overview')  loadOverview?.();
      else if (tab === 'flows')     loadFlows?.();
      else if (tab === 'whatsapp')  loadWhatsapp?.();
    } catch (err) {
      document.getElementById('pageContent').innerHTML =
        `<div class="error-card">Failed to load page: ${err.message}</div>`;
    }
  }, 40);
}

// ── Fatal error ────────────────────────────────────────────────────────────────
function showFatalError(msg) {
  document.getElementById('pageContent').innerHTML =
    `<div style="display:flex;align-items:center;justify-content:center;height:80vh">
       <div class="error-card" style="max-width:400px">
         <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
         <div style="font-weight:600;margin-bottom:6px">Connection Error</div>
         <div style="font-size:0.85rem">${msg}</div>
       </div>
     </div>`;
}
