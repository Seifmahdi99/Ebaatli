// API client — attaches admin key from localStorage to every request
const API_BASE = '';

const api = {
    getKey() {
        return localStorage.getItem('adminKey') || '';
    },

    async request(path, options = {}) {
        const key = this.getKey();
        const headers = {
            'Content-Type': 'application/json',
            'x-admin-key': key,
            ...(options.headers || {}),
        };

        const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

        if (res.status === 401) {
            localStorage.removeItem('adminKey');
            window.location.href = 'index.html';
            return;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(err.message || `HTTP ${res.status}`);
        }

        return res.json();
    },

    get(path) { return this.request(path, { method: 'GET' }); },
    post(path, body) { return this.request(path, { method: 'POST', body: JSON.stringify(body) }); },
    patch(path, body) { return this.request(path, { method: 'PATCH', body: JSON.stringify(body) }); },
};
