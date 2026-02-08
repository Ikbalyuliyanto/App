# Ashanum Authentication System

Sistem autentikasi lengkap untuk aplikasi Ashanum dengan desain yang konsisten dan responsif.

## 📁 Struktur File

```
ashanum-auth/
├── css/
│   └── auth-style.css       # CSS universal untuk semua halaman
├── js/
│   ├── alert.js            # Sistem notifikasi
│   ├── config.js           # Konfigurasi API
│   └── reset-password.js   # Logic untuk reset password
├── login.html              # Halaman login
├── register.html           # Halaman registrasi
├── reset-password.html     # Halaman reset password
└── README.md               # Dokumentasi
```

## 🎨 Fitur

### 1. **Login (login.html)**
- Input email dan password
- Checkbox "Ingat saya"
- Link lupa password
- Login dengan Google & Facebook
- Link ke halaman registrasi
- Validasi form
- Integrasi API login

### 2. **Register (register.html)**
- Form lengkap: Nama depan, nama belakang, email, telepon, jenis kelamin
- Password dengan indikator kekuatan
- Konfirmasi password
- Checkbox syarat & ketentuan
- Checkbox newsletter
- Validasi form real-time
- Integrasi API registrasi

### 3. **Reset Password (reset-password.html)**
Proses 3 langkah dengan step indicator:

**Step 1 - Lupa Password:**
- Input email untuk menerima kode

**Step 2 - Verifikasi Kode:**
- Input 6 digit kode dengan auto-focus
- Timer countdown 10 menit
- Resend kode dengan cooldown 60 detik

**Step 3 - Password Baru:**
- Input password baru dengan indikator kekuatan
- Konfirmasi password
- Validasi requirements (minimal 8 karakter, huruf besar, huruf kecil, angka)

**Success Page:**
- Konfirmasi berhasil reset password
- Tombol kembali ke login

## 🎯 CSS Universal (auth-style.css)

File CSS tunggal yang mengatur semua halaman dengan class yang konsisten:

### Class Utama:
- `.auth-container` - Container utama
- `.auth-left` - Sisi kiri (branding)
- `.auth-right` - Sisi kanan (form)
- `.auth-header` - Header halaman
- `.auth-form` - Form wrapper
- `.form-group` - Group input
- `.btn-primary` - Tombol utama
- `.btn-secondary` - Tombol sekunder

### Responsive:
- Desktop: 2 kolom (branding + form)
- Tablet (≤768px): 1 kolom (hanya form)
- Mobile (≤480px): Optimized untuk layar kecil

## 🔧 Konfigurasi

### API Base URL
Edit `js/config.js`:
```javascript
const API_BASE = `${location.protocol}//${location.hostname}:9876`;
```

### API Endpoints yang Digunakan:

**Login:**
- `POST /api/auth/login`
- Body: `{ email, password }`

**Register:**
- `POST /api/auth/register`
- Body: `{ firstname, lastname, email, phone, gender, password }`

**Forgot Password:**
- `POST /api/auth/forgot-password`
- Body: `{ email }`

**Verify Code:**
- `POST /api/auth/verify-code`
- Body: `{ email, code }`

**Reset Password:**
- `POST /api/auth/reset-password`
- Body: `{ email, code, newPassword }`

## 🚀 Cara Pakai

1. **Upload semua file** ke server/hosting Anda dengan struktur folder yang sama

2. **Sesuaikan API_BASE** di `js/config.js` dengan URL backend Anda

3. **Akses halaman:**
   - Login: `login.html`
   - Register: `register.html`
   - Reset Password: `reset-password.html`

4. **Navigasi antar halaman:**
   - Semua halaman sudah ter-link satu sama lain
   - Link "Lupa password?" di login → reset-password.html
   - Link "Daftar sekarang" di login → register.html
   - Link "Masuk sekarang" di register → login.html
   - Link "Kembali ke halaman login" di reset password → login.html

## 📱 Fitur JavaScript

### Alert System (alert.js)
```javascript
showAlert('Pesan', 'success'); // success, error, warning, info
```

### Password Strength Checker
- Otomatis cek kekuatan password
- Indikator visual: Lemah, Sedang, Kuat, Sangat Kuat
- Requirements checker untuk reset password

### Form Validation
- Real-time validation
- Email format check
- Password matching
- Required fields

## 🎨 Tema Warna

- Primary Gradient: `#667eea` → `#764ba2`
- Logo Color: `#8b5a00`
- Success: `#4caf50`
- Error: `#f44336`
- Warning: `#ff9800`
- Info: `#2196f3`

## 📝 Catatan

- Font Awesome 6.4.0 digunakan untuk icons
- Semua form terintegrasi dengan API backend
- Responsive untuk semua ukuran layar
- Cross-browser compatible
- Animasi smooth pada transisi

## 🔐 Keamanan

- Password minimal 8 karakter
- Validasi email format
- Token disimpan di localStorage/sessionStorage
- HTTPS recommended untuk production

## 📄 Lisensi

Created for Ashanum E-commerce Platform
