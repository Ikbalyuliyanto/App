//   // Header component - wrapped in DOMContentLoaded untuk memastikan semua element sudah ada
//   document.addEventListener('DOMContentLoaded', function() {
//     // Tunggu sebentar agar header sudah ter-inject ke DOM
//     setTimeout(function() {
//       initHeaderComponent();
//     }, 100);
//   });

//   function initHeaderComponent() {
//     const API_BASE = `${location.protocol}//${location.hostname}:9876`;
    
//     const userIcon = document.getElementById('userIcon');
//     const keranjangIcon = document.getElementById('keranjangIcon');
//     const userDropdown = document.getElementById('userDropdown');
//     const cartDropdown = document.getElementById('cartDropdown');
//     const dropdownOverlay = document.getElementById('dropdownOverlay');
    
//     let activeDropdown = null;

//     // ===== DROPDOWN TOGGLE =====
//     function toggleDropdown(dropdown) {
//       if (activeDropdown === dropdown) {
//         closeAllDropdowns();
//       } else {
//         closeAllDropdowns();
//         dropdown.classList.add('active');
//         dropdownOverlay.classList.add('active');
//         document.body.classList.add('dropdown-open');
//         activeDropdown = dropdown;
//       }
//     }

//     function closeAllDropdowns() {
//       userDropdown?.classList.remove('active');
//       cartDropdown?.classList.remove('active');
//       dropdownOverlay?.classList.remove('active');
//       document.body.classList.remove('dropdown-open');
//       activeDropdown = null;
//     }

//     // Event listeners
//     userIcon?.addEventListener('click', (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//       toggleDropdown(userDropdown);
//     });

//     keranjangIcon?.addEventListener('click', (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//       toggleDropdown(cartDropdown);
//       loadCartDropdown();
//     });

//     dropdownOverlay?.addEventListener('click', closeAllDropdowns);

//     document.addEventListener('keydown', (e) => {
//       if (e.key === 'Escape' && activeDropdown) {
//         closeAllDropdowns();
//       }
//     });

//     document.addEventListener('click', (e) => {
//       if (window.innerWidth > 768) {
//         if (!userDropdown?.contains(e.target) && 
//             !userIcon?.contains(e.target) &&
//             !cartDropdown?.contains(e.target) &&
//             !keranjangIcon?.contains(e.target)) {
//           closeAllDropdowns();
//         }
//       }
//     });

//     // ===== AUTH HELPERS =====
//     function getToken() {
//       return localStorage.getItem('token') || sessionStorage.getItem('token');
//     }

//     function parseJWT(token) {
//       try {
//         return JSON.parse(atob(token.split('.')[1]));
//       } catch {
//         return null;
//       }
//     }

//     // ===== USER DROPDOWN =====
//     function renderUserDropdown() {
//       const token = getToken();
//       const nameEl = document.getElementById('userDropdownName');
//       const subEl = document.getElementById('userDropdownSub');
//       const itemsEl = document.getElementById('userDropdownItems');

//       if (token) {
//         const payload = parseJWT(token);
//         const userName = payload?.nama || payload?.email?.split('@')[0] || 'User';
        
//         nameEl.textContent = userName;
//         subEl.textContent = 'Member';

//         itemsEl.innerHTML = `
//           <a href="/profil.html" class="user-dropdown__item">
//             <i class="far fa-user"></i>
//             <span>Profil Saya</span>
//           </a>
//           <a href="/pesanan.html" class="user-dropdown__item">
//             <i class="fas fa-box"></i>
//             <span>Pesanan Saya</span>
//           </a>
//           <a href="/alamat.html" class="user-dropdown__item">
//             <i class="fas fa-map-marker-alt"></i>
//             <span>Alamat</span>
//           </a>
//           <a href="/wishlist.html" class="user-dropdown__item">
//             <i class="far fa-heart"></i>
//             <span>Wishlist</span>
//           </a>
//           <div class="user-dropdown__divider"></div>
//           <a href="#" class="user-dropdown__item user-dropdown__danger" onclick="headerLogout(event)">
//             <i class="fas fa-sign-out-alt"></i>
//             <span>Keluar</span>
//           </a>
//         `;
//       } else {
//         nameEl.textContent = 'Guest';
//         subEl.textContent = 'Belum login';

//         itemsEl.innerHTML = `
//           <a href="/login.html" class="user-dropdown__item">
//             <i class="fas fa-sign-in-alt"></i>
//             <span>Masuk</span>
//           </a>
//           <a href="/register.html" class="user-dropdown__item">
//             <i class="fas fa-user-plus"></i>
//             <span>Daftar</span>
//           </a>
//           <div class="user-dropdown__divider"></div>
//           <a href="/bantuan.html" class="user-dropdown__item">
//             <i class="fas fa-question-circle"></i>
//             <span>Bantuan</span>
//           </a>
//         `;
//       }
//     }

//     // ===== CART BADGE =====
//     async function loadCartBadge() {
//       const token = getToken();
//       const badge = document.getElementById('keranjangBadge');
      
//       if (!token) {
//         badge.style.display = 'none';
//         return;
//       }

//       try {
//         const res = await fetch(`${API_BASE}/api/keranjang`, {
//           headers: { 'Authorization': `Bearer ${token}` }
//         });

//         if (res.ok) {
//           const data = await res.json();
//           const itemCount = data.item?.length || 0;
          
//           if (itemCount > 0) {
//             badge.textContent = itemCount > 99 ? '99+' : itemCount;
//             badge.style.display = 'block';
//           } else {
//             badge.style.display = 'none';
//           }
//         } else {
//           badge.style.display = 'none';
//         }
//       } catch (err) {
//         console.error('Error loading cart badge:', err);
//         badge.style.display = 'none';
//       }
//     }

//     // ===== CART DROPDOWN =====
//     async function loadCartDropdown() {
//       const token = getToken();
//       const itemsEl = document.getElementById('cartDropdownItems');
//       const footerEl = document.getElementById('cartDropdownFooter');
//       const countEl = document.getElementById('cartDropdownCount');
//       const totalEl = document.getElementById('cartDropdownTotal');

//       if (!token) {
//         itemsEl.innerHTML = `
//           <div class="cart-dropdown__empty">
//             <i class="fas fa-shopping-bag"></i>
//             <p>Silakan login untuk melihat keranjang</p>
//           </div>
//         `;
//         footerEl.style.display = 'none';
//         return;
//       }

//       try {
//         const res = await fetch(`${API_BASE}/api/keranjang`, {
//           headers: { 'Authorization': `Bearer ${token}` }
//         });

//         if (!res.ok) throw new Error('Failed to load cart');

//         const data = await res.json();
//         const items = data.item || [];

//         if (items.length === 0) {
//           itemsEl.innerHTML = `
//             <div class="cart-dropdown__empty">
//               <i class="fas fa-shopping-bag"></i>
//               <p>Keranjang Anda masih kosong</p>
//             </div>
//           `;
//           footerEl.style.display = 'none';
//           countEl.textContent = '0 Item';
//           return;
//         }

//         // Render items
//         let totalPrice = 0;
//         itemsEl.innerHTML = items.map(item => {
//           const nama = item.produk?.nama || 'Produk';
//           const harga = item.varian?.harga ?? item.produk?.harga ?? 0;
//           const qty = item.jumlah || 1;
//           const subtotal = harga * qty;
//           totalPrice += subtotal;

//           // Get variant attributes
//           const attrs = [];
//           if (item.varian?.atribut) {
//             item.varian.atribut.forEach(a => {
//               const label = a.nilai?.atribut?.nama;
//               const value = a.nilai?.nilai;
//               if (label && value) attrs.push(`${label}: ${value}`);
//             });
//           }
//           const variantText = attrs.join(', ');

//           const gambar = item.produk?.gambarUtama || '';
//           const imgUrl = gambar.startsWith('http') ? gambar : `${API_BASE}${gambar}`;

//           return `
//             <div class="cart-item">
//               <div class="cart-item__image">
//                 ${gambar ? `<img src="${imgUrl}" alt="${nama}">` : '📦'}
//               </div>
//               <div class="cart-item__info">
//                 <div class="cart-item__name">${nama}</div>
//                 ${variantText ? `<div class="cart-item__variant">${variantText}</div>` : ''}
//                 <div class="cart-item__bottom">
//                   <div class="cart-item__price">Rp ${Number(harga).toLocaleString('id-ID')}</div>
//                   <div class="cart-item__qty">x${qty}</div>
//                 </div>
//               </div>
//             </div>
//           `;
//         }).join('');

//         countEl.textContent = `${items.length} Item${items.length > 1 ? 's' : ''}`;
//         totalEl.textContent = `Rp ${Number(totalPrice).toLocaleString('id-ID')}`;
//         footerEl.style.display = 'block';

//       } catch (err) {
//         console.error('Error loading cart dropdown:', err);
//         itemsEl.innerHTML = `
//           <div class="cart-dropdown__empty">
//             <i class="fas fa-exclamation-circle"></i>
//             <p>Gagal memuat keranjang</p>
//           </div>
//         `;
//         footerEl.style.display = 'none';
//       }
//     }

//     // ===== LOGOUT =====
//     window.headerLogout = function(e) {
//       if (e) e.preventDefault();
      
//       if (confirm('Apakah Anda yakin ingin keluar?')) {
//         localStorage.removeItem('token');
//         sessionStorage.removeItem('token');
//         window.location.href = '/login.html';
//       }
//     };

//     // ===== INIT =====
//     renderUserDropdown();
//     loadCartBadge();

//     if (getToken()) {
//       setInterval(loadCartBadge, 30000);
//     }

//     window.addEventListener('storage', (e) => {
//       if (e.key === 'token' || e.key === null) {
//         renderUserDropdown();
//         loadCartBadge();
//       }
//     });

//     // Expose refresh function globally
//     window.refreshHeader = function() {
//       renderUserDropdown();
//       loadCartBadge();
//     };
//   }

//   // include-helper.js
// // Helper untuk load header dan footer di semua halaman

// (function() {
//   'use strict';

//   // Function untuk load header dan footer
//   window.includeHeaderFooter = function(callback) {
//     Promise.all([
//       fetch('header.html').then(res => {
//         if (!res.ok) throw new Error('Header not found');
//         return res.text();
//       }),
//       fetch('footer.html').then(res => {
//         if (!res.ok) throw new Error('Footer not found');
//         return res.text();
//       })
//     ])
//     .then(([headerHtml, footerHtml]) => {
//       // Inject header
//       const headerContainer = document.getElementById('header-container');
//       if (headerContainer) {
//         headerContainer.innerHTML = headerHtml;
//       }

//       // Inject footer
//       const footerContainer = document.getElementById('footer-container');
//       if (footerContainer) {
//         footerContainer.innerHTML = footerHtml;
//       }

//       // Dispatch event bahwa header sudah loaded
//       window.dispatchEvent(new Event('headerLoaded'));

//       // Call callback jika ada
//       if (typeof callback === 'function') {
//         setTimeout(callback, 150); // Tunggu sebentar untuk script header execute
//       }
//     })
//     .catch(err => {
//       console.error('Error loading header/footer:', err);
//     });
//   };

//   // Auto load saat DOM ready
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', function() {
//       window.includeHeaderFooter();
//     });
//   } else {
//     // DOM already loaded
//     window.includeHeaderFooter();
//   }
// })();
