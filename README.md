# 💊 Pharmacy Management System

A full-stack **Medical Shop & Pharmacy Management System** built with React, Vite, Node.js/Express, PostgreSQL, and Clerk authentication. Designed to streamline pharmacy operations including inventory tracking, drug schedule compliance, point-of-sale billing, purchase orders, wholesale/supplier management, prescription OCR, and PDF report generation.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [OCR Setup](#-ocr-setup)
- [Running the App](#-running-the-app)
- [Running Tests](#-running-tests)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

- 🔐 **Multi-Tenant Authentication & RBAC** — Clerk-synced roles (Admin, Shopkeeper, Employee) with isolated tenant data and fail-closed security.
- 📦 **Inventory Management** — Track stock levels, batch numbers, expiry dates, and Indian Drug Schedule tags (`OTC`, `H`, `H1`, `X`, `G`).
- 🛒 **Point of Sale (POS)** — Fast retail billing with customer autofill, instant receipt calculation, and branded PDF invoice generation.
- 📥 **Purchases & Suppliers** — Manage purchase entries, supplier directories, and wholesale transactions.
- 🔍 **Prescription & Invoice OCR** — Extract medicine names and details directly from uploaded prescription images and bills.
- 🛡️ **Security Hardened** — Multi-tier rate limiting with exponential backoff, strict schema input validation, magic-byte upload verification, and sanitized error responses.
- 📊 **Reports & Analytics** — Interactive dashboards, sales/purchase graphs, and Excel/PDF export pipelines.

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + Vite | UI framework & modern build tool |
| Tailwind CSS | Responsive utility-first styling |
| Lucide React | Icon system |
| Zustand | Global client state management |
| Axios | HTTP client with auth interceptors |
| Vitest + React Testing Library + MSW | Automated frontend test suite |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API framework |
| PostgreSQL (`pg`) | Relational database persistence |
| Clerk SDK | Authentication & identity verification |
| Express Validator | Strict schema input validation |
| Express Rate Limit | Configurable multi-tier rate limiting |
| Tesseract.js | OCR prescription processing |
| jsPDF / PDFKit / xlsx | Document & spreadsheet generation |

---

## ✅ Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [PostgreSQL](https://www.postgresql.org/) v14+ (or a cloud provider like Supabase)
- A [Clerk](https://clerk.com/) account for authentication keys

---

## 🚀 Getting Started

### 1. Environment Variables

#### Backend
Copy the example environment file:
```bash
cp backend/.env.example backend/.env
```
Configure your database connection (`DB_USER`, `DB_HOST`, `DB_PASSWORD`, `DB_NAME`) and Clerk keys (`CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`).

#### Frontend
Copy the example environment file:
```bash
cp frontend/.env.example frontend/.env
```
Configure `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_BASE_URL`.

---

## 🔍 OCR Setup

The prescription/invoice scanner uses Tesseract OCR. Download the trained data model into the `backend/` directory:

```bash
wget https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata -O backend/eng.traineddata
```

*(On Windows PowerShell)*:
```powershell
Invoke-WebRequest -Uri "https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata" -OutFile "backend/eng.traineddata"
```

---

## ▶️ Running the App

### 1. Start the Backend API
```bash
cd backend
npm install
npm run dev
```
The API server runs at `http://localhost:5000`.

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:5174`.

---

## 🧪 Running Tests

### Backend API Tests (236 tests across 17 suites)
```bash
cd backend
npm test
```

### Frontend Tests (169 tests across 26 suites)
```bash
cd frontend
npm test
```

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).
