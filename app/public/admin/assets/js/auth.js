// Authentication Helper
const Auth = {
    // Get token
    getToken: function() {
        return localStorage.getItem('token') || sessionStorage.getItem('token');
    },
    
    // Get user data
    getUser: function() {
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    
    // Check if logged in
    isLoggedIn: function() {
        return !!this.getToken();
    },
    
    // Check if admin
    isAdmin: function() {
        const user = this.getUser();
        return user && user.peran === 'ADMIN';
    },
    
    // Logout
    logout: function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
    },
    
    // Check authentication
    checkAuth: function() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        
        if (!this.isAdmin()) {
            alert('Akses ditolak. Hanya admin yang dapat mengakses halaman ini.');
            this.logout();
            return false;
        }
        
        return true;
    },
    
    // Update user info in topbar
    updateUserInfo: function() {
        const user = this.getUser();
        if (user) {
            // Update user name in topbar
            const userNameElements = document.querySelectorAll('.user-menu span');
            userNameElements.forEach(el => {
                if (el.textContent === 'Admin') {
                    el.textContent = user.nama;
                }
            });
            
            // Update avatar
            const avatarElements = document.querySelectorAll('.user-menu img');
            avatarElements.forEach(el => {
                el.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=667eea&color=fff`;
                el.alt = user.nama;
            });
        }
    },
    
    // Get auth headers for API requests
    getHeaders: function() {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }
};

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    // Skip auth check on login page
    if (!window.location.pathname.includes('login.html')) {
        if (Auth.checkAuth()) {
            Auth.updateUserInfo();
            
            // Add logout handler
            const logoutLinks = document.querySelectorAll('a[href="#logout"], .btn-logout');
            logoutLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Yakin ingin logout?')) {
                        Auth.logout();
                    }
                });
            });
        }
    }
});

// Update apiRequest to include auth headers
const authenticatedApiRequest = async (endpoint, options = {}) => {
    const token = Auth.getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, mergedOptions);
        
        // Handle unauthorized
        if (response.status === 401) {
            Auth.logout();
            return;
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Request failed');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Auth, authenticatedApiRequest };
}