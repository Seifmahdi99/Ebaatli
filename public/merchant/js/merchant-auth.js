// merchant-auth.js
// Ensures merchant entered via ?storeId=...

function checkMerchantAuth() {
    const storeId = localStorage.getItem('storeId');

    if (!storeId) {
        // not authenticated -> go back to entry page
        window.location.href = 'index.html';
        return;
    }
}

// run immediately when dashboard loads
checkMerchantAuth();


// Logout / Exit store
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('storeId');
        window.location.href = 'index.html';
    });
}
