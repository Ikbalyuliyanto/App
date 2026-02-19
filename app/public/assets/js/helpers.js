
  // =========================
  // UTIL
  // =========================
  const formatRupiah = (n) => (n === null || n === undefined ? "" : "Rp " + Number(n).toLocaleString("id-ID"));
  const getQueryId = () => new URLSearchParams(window.location.search).get("id");
  const toAbsoluteUrl = (u) => (!u ? "" : u.startsWith("http") ? u : `${API_BASE}${u}`);

  function cariVarian(varianProduk, selectedValueIds) {
    for (const v of varianProduk || []) {
      const nilaiIdsVarian = (v.atribut || []).map((a) => a.nilaiId).filter(Boolean);
      const cocok = selectedValueIds.every((id) => nilaiIdsVarian.includes(id));
      if (cocok) return v;
    }
    return null;
  }

  
    function rupiah(n) {
      return "Rp " + Number(n || 0).toLocaleString("id-ID");
    }

    function formatDate(dateString) {
      if (!dateString) return "-";
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    function escapeHtml(str) {
      return String(str || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }




    
  // Header component - wrapped in DOMContentLoaded untuk memastikan semua element sudah ada
  window.addEventListener('headerLoaded', () => {
    initHeaderComponent();
  });
  

  function initHeaderComponent() {
    
    const userIcon = document.getElementById('userIcon');
    const keranjangIcon = document.getElementById('keranjangIcon');
    const userDropdown = document.getElementById('userDropdown');
    const cartDropdown = document.getElementById('cartDropdown');
    const dropdownOverlay = document.getElementById('dropdownOverlay');
    
    let activeDropdown = null;

    // ===== DROPDOWN TOGGLE =====
    function toggleDropdown(dropdown) {
      if (activeDropdown === dropdown) {
        closeAllDropdowns();
      } else {
        closeAllDropdowns();
        dropdown.classList.add('active');
        dropdownOverlay.classList.add('active');
        document.body.classList.add('dropdown-open');
        activeDropdown = dropdown;
      }
    }

    function closeAllDropdowns() {
      userDropdown?.classList.remove('active');
      cartDropdown?.classList.remove('active');
      dropdownOverlay?.classList.remove('active');
      document.body.classList.remove('dropdown-open');
      activeDropdown = null;
    }

    // Event listeners
    userIcon?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown(userDropdown);
    });

    keranjangIcon?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown(cartDropdown);
      loadCartDropdown();
    });

    dropdownOverlay?.addEventListener('click', closeAllDropdowns);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeDropdown) {
        closeAllDropdowns();
      }
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth > 768) {
        if (!userDropdown?.contains(e.target) && 
            !userIcon?.contains(e.target) &&
            !cartDropdown?.contains(e.target) &&
            !keranjangIcon?.contains(e.target)) {
          closeAllDropdowns();
        }
      }
    });

    // ===== AUTH HELPERS =====
    function getToken() {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    }

    function parseJWT(token) {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch {
        return null;
      }
    }

    function getUserNamaSafe() {
      const ls = localStorage.getItem("userNama") || sessionStorage.getItem("userNama");
      if (ls) return ls;

      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) return "User";

      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload?.nama || payload?.email?.split("@")[0] || "Useri";
      } catch {
        return "Users";
      }
    }
    // ===== USER DROPDOWN =====
    function renderUserDropdown() {
      const token = getToken();
      const nameEl = document.getElementById('userDropdownName');
      const subEl = document.getElementById('userDropdownSub');
      const itemsEl = document.getElementById('userDropdownItems');

      if (token) {
        const payload = parseJWT(token);
        const userName = getUserNamaSafe();
        
        nameEl.textContent = userName;
        subEl.textContent = 'Member';

        itemsEl.innerHTML = `
          <a href="/index.html" class="user-dropdown__item">
            <i class="fas fa-home"></i>
            <span>Home</span>
          </a>
          <a href="/profil.html" class="user-dropdown__item">
            <i class="far fa-user"></i>
            <span>Profil Saya</span>
          </a>
          <a href="/pesanan.html" class="user-dropdown__item">
            <i class="fas fa-box"></i>
            <span>Pesanan Saya</span>
          </a>
          <div class="user-dropdown__divider"></div>
          <a href="#" class="user-dropdown__item user-dropdown__danger" onclick="headerLogout(event)">
            <i class="fas fa-sign-out-alt"></i>
            <span>Keluar</span>
          </a>
        `;
      } else {
        nameEl.textContent = 'Guest';
        subEl.textContent = 'Belum login';

        itemsEl.innerHTML = `
          <a href="/index.html" class="user-dropdown__item">
            <i class="fas fa-home"></i>
            <span>Home</span>
          </a>
          <a href="auth/login.html" class="user-dropdown__item">
            <i class="fas fa-sign-in-alt"></i>
            <span>Masuk</span>
          </a>
          <a href="auth/daftar.html" class="user-dropdown__item">
            <i class="fas fa-user-plus"></i>
            <span>Daftar</span>
          </a>
          <div class="user-dropdown__divider"></div>
          <a href="/footer/bantuan.html" class="user-dropdown__item">
            <i class="fas fa-question-circle"></i>
            <span>Bantuan</span>
          </a>
        `;
      }
    }

    // ===== CART BADGE =====
    async function loadCartBadge() {
      const token = getToken();
      const badge = document.getElementById('keranjangBadge');
      
      if (!token) {
        badge.style.display = 'none';
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/keranjang`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          const itemCount = data.item?.length || 0;
          
          if (itemCount > 0) {
            badge.textContent = itemCount > 99 ? '99+' : itemCount;
            badge.style.display = 'block';
          } else {
            badge.style.display = 'none';
          }
        } else {
          badge.style.display = 'none';
        }
      } catch (err) {
        console.error('Error loading cart badge:', err);
        badge.style.display = 'none';
      }
    }

    // ===== CART DROPDOWN =====
    async function loadCartDropdown() {
      const token = getToken();
      const itemsEl = document.getElementById('cartDropdownItems');
      const footerEl = document.getElementById('cartDropdownFooter');
      const countEl = document.getElementById('cartDropdownCount');
      const totalEl = document.getElementById('cartDropdownTotal');

      if (!token) {
        itemsEl.innerHTML = `
          <div class="cart-dropdown__empty">
            <i class="fas fa-shopping-bag"></i>
            <p>Silakan login untuk melihat keranjang</p>
          </div>
        `;
        footerEl.style.display = 'none';
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/keranjang`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load cart');

        const data = await res.json();
        const items = data.item || [];

        if (items.length === 0) {
          itemsEl.innerHTML = `
            <div class="cart-dropdown__empty">
              <i class="fas fa-shopping-bag"></i>
              <p>Keranjang Anda masih kosong</p>
            </div>
          `;
          footerEl.style.display = 'none';
          countEl.textContent = '0 Item';
          return;
        }

        // Render items
        let totalPrice = 0;
        itemsEl.innerHTML = items.map(item => {
          const nama = item.produk?.nama || 'Produk';
          const harga = item.varian?.harga ?? item.produk?.harga ?? 0;
          const qty = item.jumlah || 1;
          const subtotal = harga * qty;
          totalPrice += subtotal;

          // Get variant attributes
          const attrs = [];
          if (item.varian?.atribut) {
            item.varian.atribut.forEach(a => {
              const label = a.nilai?.atribut?.nama;
              const value = a.nilai?.nilai;
              if (label && value) attrs.push(`${label}: ${value}`);
            });
          }
          const variantText = attrs.join(', ');

          const gambar = item.produk?.gambarUtama || '';
          const imgUrl = gambar.startsWith('http') ? gambar : `${API_BASE}${gambar}`;

          return `
            <div class="cart-item">
              <div class="cart-item__image">
                ${gambar ? `<img src="${imgUrl}" alt="${nama}">` : '📦'}
              </div>
              <div class="cart-item__info">
                <div class="cart-item__name">${nama}</div>
                ${variantText ? `<div class="cart-item__variant">${variantText}</div>` : ''}
                <div class="cart-item__bottom">
                  <div class="cart-item__price">Rp ${Number(harga).toLocaleString('id-ID')}</div>
                  <div class="cart-item__qty">x${qty}</div>
                </div>
              </div>
            </div>
          `;
        }).join('');

        countEl.textContent = `${items.length} Item${items.length > 1 ? 's' : ''}`;
        totalEl.textContent = `Rp ${Number(totalPrice).toLocaleString('id-ID')}`;
        footerEl.style.display = 'block';

      } catch (err) {
        console.error('Error loading cart dropdown:', err);
        itemsEl.innerHTML = `
          <div class="cart-dropdown__empty">
            <i class="fas fa-exclamation-circle"></i>
            <p>Gagal memuat keranjang</p>
          </div>
        `;
        footerEl.style.display = 'none';
      }
    }

    // ===== LOGOUT =====
    window.headerLogout = async function (e) {
      if (e) e.preventDefault();

      const ok = await showConfirm({
        title: "Keluar",
        message: "Apakah Anda yakin ingin keluar?",
        confirmText: "Keluar",
        cancelText: "Batal",
        type: "danger",
        closeOnBackdrop: true,
      });

      if (!ok) return;

      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      localStorage.removeItem("userNama");
      sessionStorage.removeItem("userNama");

      if (typeof showAlert === "function") showAlert("Berhasil logout", "success");

      // kalau kamu punya refresh header (di helpersindex.js)
      if (typeof window.refreshHeader === "function") window.refreshHeader();

      setTimeout(() => {
        window.location.href = "/index.html";
      }, 600);
    };


    // ===== INIT =====
    renderUserDropdown();
    loadCartBadge();

    if (getToken()) {
      setInterval(loadCartBadge, 30000);
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'token' || e.key === null) {
        renderUserDropdown();
        loadCartBadge();
      }
    });

    // Expose refresh function globally
    window.refreshHeader = function() {
      renderUserDropdown();
      loadCartBadge();
    };
  }

  // include-helper.js
// Helper untuk load header dan footer di semua halaman

(function() {
  'use strict';

  // Function untuk load header dan footer
  window.includeHeaderFooter = function(callback) {
    Promise.all([
      fetch('header.html').then(res => {
        if (!res.ok) throw new Error('Header not found');
        return res.text();
      }),
      fetch('footer.html').then(res => {
        if (!res.ok) throw new Error('Footer not found');
        return res.text();
      })
    ])
    .then(([headerHtml, footerHtml]) => {
      // Inject header
      const headerContainer = document.getElementById('header-container');
      if (headerContainer) {
        headerContainer.innerHTML = headerHtml;
      }

      // Inject footer
      const footerContainer = document.getElementById('footer-container');
      if (footerContainer) {
        footerContainer.innerHTML = footerHtml;
      }

      // Dispatch event bahwa header sudah loaded
      window.dispatchEvent(new Event('headerLoaded'));

      // Call callback jika ada
      if (typeof callback === 'function') {
        setTimeout(callback, 150); // Tunggu sebentar untuk script header execute
      }
    })
    .catch(err => {
      console.error('Error loading header/footer:', err);
    });
  };

  // Auto load saat DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.includeHeaderFooter();
    });
  } else {
    // DOM already loaded
    window.includeHeaderFooter();
  }
})();

  // ===== FLOATING ACTION MENU =====
  
  // Toggle floating menu
  function toggleFloatingMenu() {
    const btn = document.getElementById('floatingMainBtn');
    const items = document.getElementById('floatingMenuItems');
    
    btn.classList.toggle('active');
    items.classList.toggle('active');
    
    // Close kategori dropdown if open
    closeKategoriDropdown();
  }

  // Toggle kategori dropdown
  function toggleKategoriDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('kategoriDropdown');
    const isActive = dropdown.classList.contains('active');
    
    if (!isActive) {
      dropdown.classList.add('active');
      loadKategoriDropdown();
    } else {
      dropdown.classList.remove('active');
    }
  }

  // Close kategori dropdown
  function closeKategoriDropdown() {
    const dropdown = document.getElementById('kategoriDropdown');
    dropdown.classList.remove('active');
  }

  // Load kategori list
  async function loadKategoriDropdown() {
    const body = document.getElementById('kategoriDropdownBody');
    
    try {
      const response = await fetch(`${window.API_BASE || ''}/api/kategori`);
      if (!response.ok) throw new Error('Failed to load');
      
      const categories = await response.json();
      
      if (!categories || categories.length === 0) {
        body.innerHTML = '<div style="padding: 20px; text-align: center; color: #999; font-size: 14px;">Belum ada kategori</div>';
        return;
      }
      
      body.innerHTML = categories.map(cat => `
        <a href="/kategori.html?id=${cat.id}" class="kategori-item">
          <i class="fas fa-tag"></i>
          <span>${escapeHtml(cat.nama)}</span>
        </a>
      `).join('');
      
    } catch (error) {
      console.error('Error loading categories:', error);
      body.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff4444; font-size: 14px;">Gagal memuat kategori</div>';
    }
  }

  // Scroll to top
  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  window.addEventListener('scroll', function() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    if (!scrollBtn) return; // ← tambah ini, keluar jika elemen tidak ada
    if (window.pageYOffset > 300) {
      scrollBtn.classList.add('show');
    } else {
      scrollBtn.classList.remove('show');
    }
  });
  // Update cart badge
  function updateFloatingCartBadge() {
    const badge = document.getElementById('floatingCartBadge');
    // Get cart count from localStorage or API
    // This is a placeholder - adjust based on your implementation
    const cartCount = 0; // Replace with actual cart count
    if (badge) {
      badge.textContent = cartCount;
      badge.style.display = cartCount > 0 ? 'flex' : 'none';
    }
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('kategoriDropdown');
    const menu = document.getElementById('floatingMenu');
    
    if (!menu) return; // ← tambah ini  
    if (!menu.contains(event.target)) {
      closeKategoriDropdown();
    }
  });

  // Helper function
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', function() {
    updateFloatingCartBadge();
  });