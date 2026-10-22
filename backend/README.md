# MediSync — Backend API Documentation

**Tagline:** *"Smarter Pharmacy. Healthier Tomorrow."*

This is the Node.js + Express + MongoDB REST API backend for the **MediSync** pharmacy management and intelligent inventory platform.

---

## ⚕️ Important Medical & Regulatory Notice

> **MediSync is an operational decision-support and pharmacy management tool.**
> It is **NOT** a medical diagnosis system. The backend never provides medical diagnosis or instructs patients to start or discontinue medication.

---

## 🛠️ Technology Stack

- **Runtime:** Node.js (>= 18.x)
- **Framework:** Express.js 4.x
- **Database:** MongoDB & Mongoose ORM
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs password hashing
- **Security:** Helmet (HTTP header protection), CORS, rate limiting
- **Logging:** Morgan

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── medicineController.js
│   │   ├── inventoryController.js
│   │   ├── supplierController.js
│   │   ├── billingController.js
│   │   ├── analyticsController.js
│   │   ├── aiController.js
│   │   └── profileController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Pharmacy.js
│   │   ├── Medicine.js
│   │   ├── Batch.js
│   │   ├── Supplier.js
│   │   ├── Sale.js
│   │   └── InventoryTransaction.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── medicineRoutes.js
│   │   ├── inventoryRoutes.js
│   │   ├── supplierRoutes.js
│   │   ├── billingRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── aiRoutes.js
│   │   └── profileRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── errorMiddleware.js
│   │   └── validationMiddleware.js
│   ├── services/
│   │   ├── inventoryService.js
│   │   ├── expiryService.js
│   │   ├── analyticsService.js
│   │   └── aiService.js
│   ├── utils/
│   │   ├── invoiceGenerator.js
│   │   └── responseFormatter.js
│   └── app.js
├── scripts/
│   └── seedDemo.js
├── server.js
├── .env
├── .env.example
├── package.json
└── README.md
```

---

## ⚙️ Environment Configuration (`.env`)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/pharmaflow
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:8000
CLIENT_URL=http://localhost:3000,http://localhost:5173
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Start the Backend API Server
```bash
# Start in development mode (with auto-restart)
npm run dev

# Or start in standard production mode
npm start
```

The API will listen at **`http://localhost:5000`**.

### 3. Optional Manual Seed Script (For Dev Testing)
> **Note:** Registration always starts with a pure 0-record clean database. To populate sample records for manual testing:
```bash
npm run seed:demo
```

---

## 📡 REST API Endpoints Overview

### 1. Health Check
- `GET /api/health` — System status check

### 2. Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new pharmacist & pharmacy profile
- `POST /api/auth/login` — Sign in and receive JWT token
- `POST /api/auth/logout` — Invalidate session
- `GET /api/auth/me` — Get authenticated user details & pharmacy
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Set new password

### 3. Dashboard (`/api/dashboard`)
- `GET /api/dashboard` — Live dynamically calculated KPIs (`totalMedicines`, `lowStockCount`, `expiringSoonCount`, `todaySales`, etc.)

### 4. Medicines & Batches (`/api/medicines`)
- `GET /api/medicines` — List medicines with search, category, and stock filters
- `GET /api/medicines/:id` — Get single medicine with full FEFO batch breakdown
- `POST /api/medicines` — Create new medicine + optional initial lot
- `PUT /api/medicines/:id` — Update medicine details
- `DELETE /api/medicines/:id` — Delete medicine and all its batches
- `GET /api/medicines/search?q=query` — Fast search
- `GET /api/medicines/barcode/:barcode` — Barcode scanner lookup
- `POST /api/medicines/:id/batches` — Add new batch to medicine
- `PUT /api/medicines/:id/batches/:batchId` — Update batch
- `DELETE /api/medicines/:id/batches/:batchId` — Delete batch

### 5. Inventory & Expiry (`/api/inventory`)
- `GET /api/inventory` — Full stock list with status indicators
- `GET /api/inventory/low-stock` — Items below safety reorder threshold
- `GET /api/inventory/out-of-stock` — Zero stock items
- `GET /api/inventory/expiry` — Dynamic expiry buckets (`expired`, `within30Days`, `within60Days`, `safe`)
- `POST /api/inventory/adjust` — Adjust stock and record audit transaction
- `POST /api/inventory/add-stock` — Receive stock shipment
- `POST /api/inventory/remove-stock` — Write off damaged/expired stock
- `GET /api/inventory/transactions` — Full inventory audit history

### 6. Billing & POS (`/api/billing`)
- `POST /api/billing/sales` — Checkout sale with **automated batch stock decrement** and unique invoice number generation
- `GET /api/billing/sales` — List all sales
- `GET /api/billing/sales/:id` — Get single invoice
- `GET /api/billing/today` — Today's turnover and volume
- `GET /api/billing/recent` — Recent 10 transactions

### 7. Suppliers (`/api/suppliers`)
- `GET /api/suppliers` — List suppliers
- `GET /api/suppliers/:id` — Get supplier
- `POST /api/suppliers` — Create supplier
- `PUT /api/suppliers/:id` — Update supplier
- `DELETE /api/suppliers/:id` — Delete supplier

### 8. Analytics (`/api/analytics`)
- `GET /api/analytics/sales?range=7days` — Sales trend
- `GET /api/analytics/top-medicines?limit=5` — Ranked top sellers
- `GET /api/analytics/inventory` — Asset valuation (retail value vs purchase cost)
- `GET /api/analytics/summary` — Full analytics overview

### 9. AI Insights & Predictions (`/api/ai`)
- `GET /api/ai/insights` — Overall proactive recommendations
- `GET /api/ai/demand/:medicineId` — Average daily velocity
- `GET /api/ai/stockout/:medicineId` — Stock-out prediction in days
- `GET /api/ai/purchase-recommendation/:medicineId` — Suggested purchase quantity

### 10. Profile & Settings (`/api/profile`, `/api/settings`)
- `GET /api/profile` — Pharmacist & pharmacy profile
- `PUT /api/profile` — Update details
- `PUT /api/profile/password` — Change password
- `GET /api/settings` — Pharmacy configuration & thresholds
- `PUT /api/settings` — Update tax rates, FEFO rules, alert windows

---

## 🔒 Security & Multi-Tenant Data Isolation

- Every database query strictly scopes by `req.pharmacyId` attached from the verified JWT.
- Pharmacists can only read and modify their own pharmacy's medicines, inventory, transactions, and sales.
