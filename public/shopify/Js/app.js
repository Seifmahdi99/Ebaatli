// ── app.js — Shopify Embedded App Bootstrap ───────────────────────────────────

window.APP = null;

// Populated once App Bridge is ready; used by all page scripts.
window.authFetch = fetch.bind(window); // plain fetch fallback

(async function init() {
  const params = new URLSearchParams(window.location.search);
  const shop   = params.get('shop');
  const host   = params.get('host') || '';

  // ── 1. Validate shop param ──────────────────────────────────────────────────
  if (!shop) {
    showFatalError('No shop parameter found. Please open this app from your Shopify Admin.');
    return;
  }

  // ── 2. Load Shopify App Bridge from Shopify's CDN + session-token fetch ─────
  try {
    const cfgRes = await fetch('/shopify/config');
    if (cfgRes.ok) {
      const { apiKey } = await cfgRes.json();
      if (apiKey) {
        await loadAppBridge(apiKey);

        // Use the new App Bridge CDN session token API
        if (window.shopify?.auth?.getSessionToken) {
          window.authFetch = async (url, options = {}) => {
            try {
              const token = await window.shopify.auth.getSessionToken();
              const headers = {
                ...(options.headers || {}),
                Authorization: `Bearer ${token}`,
              };
              return fetch(url, { ...options, headers });
            } catch (e) {
              console.warn('Session token fetch failed, falling back:', e.message);
              return fetch(url, options);
            }
          };
        }
      }
    }
  } catch (e) {
    console.log('App Bridge init:', e.message);
  }

  // ── 3. Look up store by shop domain ────────────────────────────────────────
  let storeData;
  try {
    const res = await window.authFetch(`/merchant/by-shop?shop=${encodeURIComponent(shop)}`);
    if (res.status === 404) {
      // Store not installed — redirect to install endpoint
      const installUrl = `/shopify/install?shop=${encodeURIComponent(shop)}`;
      if (window.top && window.top !== window.self) {
        window.top.location.href = window.location.origin + installUrl;
      } else {
        window.location.href = installUrl;
      }
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    storeData = await res.json();
  } catch (err) {
    showFatalError(`Could not connect to your store: ${err.message}`);
    return;
  }

  window.APP = storeData;

  // ── 4. Render shell UI ───────────────────────────────────────────────────────
  // Shell is always rendered first so tabs remain visible regardless of
  // subscription state. Unsubscribed users land on the billing tab but can
  // still navigate once they subscribe (or once the billing page syncs their
  // Shopify subscription back into the local DB).
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

// Loads App Bridge from Shopify's CDN with the API key embedded in the script tag.
// The CDN script auto-initializes and exposes window.shopify.
function loadAppBridge(apiKey) {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
    script.setAttribute('data-api-key', apiKey);
    script.onload = resolve;
    script.onerror = resolve; // degrade gracefully if CDN unreachable
    document.head.appendChild(script);
  });
}

// ── Navigation ─────────────────────────────────────────────────────────────────
function navigate(tab) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('pageContent').innerHTML =
    `<div class="loading"><div class="spinner"></div>Loading…</div>`;

  setTimeout(() => {
    try {
      if (tab === 'overview')       loadOverview?.();
      else if (tab === 'flows')     loadFlows?.();
      else if (tab === 'whatsapp')  loadWhatsapp?.();
      else if (tab === 'billing')   loadBilling?.();
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
