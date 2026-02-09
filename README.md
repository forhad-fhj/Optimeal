# OptiMeal: Optimized Food Rescue & Delivery Platform 🌍

> **Connect. Rescue. Impact.**
> Bridging the gap between food surplus and community needs through intelligent logistics.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Visit_OptiMeal-2ecc71?style=for-the-badge&logo=vercel)](https://optimeal-amber.vercel.app/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

---

## 🚀 Live Application
Access the platform here: **[https://optimeal-amber.vercel.app/](https://optimeal-amber.vercel.app/)**

---

## 📖 Overview

**OptiMeal** tackles the dual challenge of food waste and hunger by creating a seamless digital infrastructure for food rescue. Our platform empowers:
- **Donors** (Restaurants, Grocers) to list surplus food in seconds.
- **Volunteers** to find efficient rescue routes and track deliveries in real-time.
- **Charities** to receive notifications and manage incoming donations.

By optimizing the "last mile" of food rescue, we ensure fresh food reaches those who need it most, faster and more reliably.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| **🍎 Real-time Listings** | Instant food availability updates with expiration tracking. |
| **📍 Smart Logistics** | Geospatial search helps volunteers find closest pickups. |
| **📊 Impact Analytics** | Visualize kgs saved, meals provided, and CO₂ reduction. |
| **🛡️ Role-Based Access** | Dedicated dashboards for Donors, Volunteers, and Charities. |
| **📱 Mobile First** | Fully responsive design for volunteers on the go. |

---

## 🛠 Tech Architecture

### **Frontend Client**
- **Framework**: `Next.js 14` (App Router, Server Components)
- **Styling**: `Tailwind CSS`, `Shadcn UI`, `Lucide Icons`
- **State**: `React Query` (TanStack), `Zustand`
- **Maps**: `Leaflet`, `React-Leaflet`
- **Auth**: `NextAuth.js` (Google OAuth)

### **Backend API**
- **Core**: `FastAPI` (High-performance Python framework)
- **Database**: `PostgreSQL` with `PostGIS` (Spatial extensions)
- **ORM**: `SQLAlchemy` (Async)
- **Validation**: `Pydantic` schemas
- **Hosting**: `Render` (Containerized)

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL (or Access to Neon/Supabase)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/optimeal.git
cd optimeal
```

### 2. Backend Setup
```bash
cd api
python -m venv venv
# Windows: .\venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```
Create `.env` in `api/`:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/optimeal
ALLOWED_ORIGINS=http://localhost:3000
```
Run Server:
```bash
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd ../web
npm install
```
Create `.env.local` in `web/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
```
Run Client:
```bash
npm run dev
```
Visit `http://localhost:3000` to see the app!

---

## 🔮 Roadmap
- [ ] **AI Route Optimization**: Integrate NetworkX for multi-stop route planning.
- [ ] **Push Notifications**: Real-time alerts for urgent rescues.
- [ ] **Charity Inventory**: Better tracking of received goods.

---

## 🤝 Contribution
Open to contributions! Please fork the repo and submit a PR. 

## 📄 License
MIT License © 2026 OptiMeal Team
