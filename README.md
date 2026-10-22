# MediSync

<p align="center">
  <img src="./public/medisync-logo.png" alt="MediSync Logo" width="180" />
</p>

<p align="center">
  <strong>Smarter Pharmacy. Healthier Tomorrow.</strong>
</p>

<p align="center">
  <a href="https://github.com/Pranali-20/MediSync"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github" alt="GitHub Repo" /></a>
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-Express-43853D?style=flat-square&logo=node.js&logoColor=white" alt="Node Express" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB" />
</p>

---

## 📌 About MediSync

**MediSync** is an all-in-one pharmacy operations and intelligent inventory platform designed for pharmacists, medical store owners, and hospital dispensaries.

Unlike basic CRUD tools, MediSync mirrors real pharmaceutical workflows:
* **Batch-Level Tracking & FEFO Engine:** Clinical drug masters are separated from incoming batches. Sales and dispensing automatically consume the earliest-expiring batch (**First Expiry, First Out**), preventing medication wastage.
* **3 Adaptive Pharmacy Modes:** Dynamically adapts its UI and features for **Retail Shops**, **Hospital-Attached Pharmacies**, and **Hybrid Pharmacies**.
* **Zero Fake Data Policy:** Operational insights and restocking forecasts are calculated from actual sales velocity and real stock levels.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 💊 **Medicine & Batch Catalog** | Create drug formulations once; track individual physical batches with lot numbers, expiry dates, purchase rates, and MRPs. |
| ⚡ **FEFO Counter POS Billing** | Quick barcode scanning and billing with automatic First-Expiry, First-Out stock deduction and printable invoices. |
| 🏥 **Hospital Prescriptions & Dispensing** | Manage clinical doctor orders, patient admissions, dose verification, and partial inpatient dispensing. |
| 📦 **Purchase Orders & Restocking** | Manage the full PO lifecycle (`Draft` → `Ordered` → `Received`) with one-click shipment inwarding. |
| ⏳ **5-Tier Expiry Radar** | Color-coded expiry alerts: Expired, Critical ($\le$ 7 days), High Priority ($\le$ 30 days), Moderate ($\le$ 60 days), and Safe ($>$ 60 days). |
| 🤖 **AI Decision Support** | Restocking recommendations calculated from sales velocity and supplier lead times. |
| 🔄 **Returns & Stock Adjustments** | Audit-backed stock adjustments (Damaged, Expired, Correction) and customer returns routing. |
| 🛡️ **Role-Based Security** | Separate permission tiers for Administrator, Pharmacist, and Cashier with complete audit logs. |

---

## 🏥 Pharmacy Modes

MediSync configures its dashboard and workflows based on your facility type:

1. 🏪 **Retail Pharmacy:** Fast POS barcode checkout, OTC sales, customer returns, supplier purchases, and expiry tracking.
2. 🏥 **Hospital Pharmacy:** Inpatient/outpatient prescriptions queue, patient records, and bedside dispensing vouchers.
3. 🔄 **Hybrid Pharmacy:** Unified management of clinical hospital dispensing and front-counter retail POS.

---

## 🛠️ Tech Stack

* **Frontend:** JavaScript (React.js), Vite, Tailwind CSS, Lucide React, Recharts
* **Backend:** Node.js, Express.js, REST APIs, JSON Web Tokens (JWT), bcryptjs
* **Database:** MongoDB with Mongoose ORM
* **Security & Utilities:** Helmet, CORS, Morgan

---

## 📁 Project Structure

```text
MediSync/
├── public/                     # Static assets & MediSync logo
├── src/                        # React Frontend (JavaScript)
│   ├── components/             # Reusable UI components (Navbar, Sidebar, StatCards, Modals)
│   ├── context/                # AuthContext, AppContext, ToastContext
│   ├── pages/                  # Dashboard, Medicines, Billing, Expiry, Purchases, Prescriptions, AI
│   ├── services/               # API clients (Axios)
│   ├── types/                  # Data models & schemas
│   └── App.tsx                 # Route definitions & guards
│
├── backend/                    # Node.js + Express REST API
│   ├── src/
│   │   ├── config/             # MongoDB database connection
│   │   ├── controllers/        # Billing, Medicines, Purchases, AI, Prescriptions
│   │   ├── middleware/         # JWT Authentication & role permissions
│   │   ├── models/             # Mongoose schemas (Medicine, Batch, PO, Sale, Pharmacy, User)
│   │   └── routes/             # REST API endpoints
│   ├── scripts/                # Database seed script (seedDemo.js)
│   └── server.js               # Backend entry point (Port 5000)
│
├── .gitignore                  # Git ignore rules (.env, node_modules, dist)
└── README.md                   # Project documentation
```

---

## 🚀 Quick Start Guide

Follow these simple steps to run MediSync locally:

### 1. Clone the Repository
```bash
git clone https://github.com/Pranali-20/MediSync.git
cd MediSync
```

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# (Optional) Seed demo medicines, batches, and users
node scripts/seedDemo.js

# Start backend server
npm start
```
The backend API will run on **`http://localhost:5000`**  
Verify health check at: `http://localhost:5000/api/health`

### 3. Frontend Setup
Open a new terminal in the project root (`MediSync/`):
```bash
# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend application will open on **`http://localhost:5173`** (or `http://localhost:3000`).

---

## 🔑 Demo Login Credentials

You can test the application using any of the pre-configured accounts:

| Pharmacy Mode | Email | Password | Role | Included Workflows |
|---|---|---|---|---|
| 🏪 **Retail Pharmacy** | `retail@medisync.ai` | `password123` | Administrator | POS Billing, Purchases, Batches, Expiry, AI |
| 🏥 **Hospital Pharmacy** | `hospital@medisync.ai` | `password123` | Administrator | Inpatient Rx Queue, Dispensing, Patient Records |
| 🔄 **Hybrid Pharmacy** | `hybrid@medisync.ai` | `password123` | Administrator | Unified Counter POS + Hospital Dispensing |

> **Tip:** You can also click the quick-login buttons on the login page for one-click access.

---

## ⚕️ Regulatory & Medical Disclaimer

MediSync is an **operational inventory and pharmacy management decision-support tool**. It does **not** provide medical diagnoses or prescribe medication. Clinical decisions and dispensing remain under the professional supervision of licensed pharmacists and healthcare practitioners.

---

## 👥 Author

* **Pranali** — [GitHub Profile](https://github.com/Pranali-20)
* **MediSync** — *Smarter Pharmacy. Healthier Tomorrow.*
