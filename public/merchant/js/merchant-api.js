// merchant-api.js
// API wrapper for merchant panel (uses storeId instead of admin key)

const API_BASE = '';

const api = {
    getStoreId() {
        return localStorage.getItem('storeId') || '';
    },

    async request(path, options = {}) {
        const storeId = this.getStoreId();

        if (!storeId) {
            window.location.href = 'index.html';
            return;
        }

        const res = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });

        if (res.status === 401) {
            localStorage.removeItem('storeId');
            window.location.href = 'index.html';
            return;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(err.message || `HTTP ${res.status}`);
        }

        return res.json();
    },

    get(path) {
        return this.request(path, { method: 'GET' });
    },

    post(path, body) {
        return this.request(path, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },

    patch(path, body) {
        return this.request(path, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    },

    delete(path) {
        return this.request(path, { method: 'DELETE' });
    }
};
