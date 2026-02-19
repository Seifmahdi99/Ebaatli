// auth.js — session management
function checkAuth() {
    if (!localStorage.getItem('adminKey')) {
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.removeItem('adminKey');
    window.location.href = 'index.html';
}
