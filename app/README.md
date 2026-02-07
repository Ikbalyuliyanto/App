# Zawawiya Backend (Express + Prisma + PostgreSQL)

Starter backend e-commerce sederhana: Auth (JWT), Categories, Products, Cart, Checkout/Orders.

## 1) Setup
```bash
npm install
cp .env.example .env
# edit .env: DATABASE_URL, JWT_SECRET
```

## 2) Migrate DB
```bash
npm run db:migrate -- --name init
```

## 3) Seed contoh data (opsional)
```bash
npm run db:seed
```

## 4) Run
```bash
npm run dev
```

API base: `http://localhost:9876`

## Endpoints
- GET `/health`
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/categories`
- GET `/api/products?q=&category=&flashSale=true&page=1&limit=12`
- GET `/api/products/:slug`
- GET `/api/cart` (Bearer token)
- POST `/api/cart/items` (Bearer token) { productId, qty }
- PATCH `/api/cart/items/:id` (Bearer token) { qty }
- DELETE `/api/cart/items/:id` (Bearer token)
- POST `/api/orders/checkout` (Bearer token)
- GET `/api/orders` (Bearer token)

## Notes
- Harga disimpan integer (rupiah).
- File image sementara disimpan sebagai URL string (nanti bisa pakai upload ke S3/Cloudinary).
