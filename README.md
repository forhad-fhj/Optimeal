# 🍽️ OptiMeal

**Rescue Food. Feed People.**

OptiMeal is a full-stack food rescue platform that connects restaurants and food donors with volunteer drivers and local charities to reduce food waste and fight hunger. The platform provides real-time food listing management, optimized delivery routing, and seamless coordination between all stakeholders.

---

## 🌟 Features

### For Donors (Restaurants & Food Businesses)
- 📝 **Quick Food Listings** - Post surplus food in seconds with quantity, expiration, and pickup windows
- ⏰ **Flexible Scheduling** - Set custom pickup time windows that work for your business
- 📊 **Track Impact** - Monitor rescue status and see how much food you've saved from waste

### For Volunteers (Delivery Drivers)
- 🗺️ **Interactive Map** - View all available food pickups near you in real-time
- 🚗 **Optimized Routes** - Get the most efficient multi-stop routes for pickups and deliveries
- 📍 **Live Tracking** - Navigate with turn-by-turn directions to pickup and drop-off locations

### For Charities (Food Banks & Shelters)
- 🔔 **Real-time Notifications** - Receive alerts when food is on the way
- ✅ **Digital Confirmations** - Confirm deliveries and track incoming donations
- 📈 **Donation History** - View all received food donations and their details

---

## 🏗️ Architecture

OptiMeal is built with a modern, scalable architecture:

### Frontend
- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4 with custom design system
- **UI Components**: Radix UI primitives with shadcn/ui
- **Maps**: Leaflet with React-Leaflet for interactive mapping
- **Authentication**: NextAuth.js for secure user authentication
- **Language**: TypeScript for type safety

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with PostGIS extension for geospatial queries
- **ORM**: SQLAlchemy with async support
- **Validation**: Pydantic schemas
- **Routing Algorithm**: NetworkX for optimized delivery routes
- **API Documentation**: Auto-generated with OpenAPI/Swagger

### Infrastructure
- **Containerization**: Docker Compose for local development
- **Database**: PostgreSQL 15 with PostGIS 3.3
- **CORS**: Configured for cross-origin requests

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or higher)
- **Python** (v3.10 or higher)
- **Docker** and **Docker Compose**
- **Git**

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/optimeal.git
cd optimeal
```

### 2. Environment Setup

#### Backend Environment
Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5434/optimeal
```

#### Frontend Environment
Create a `.env.local` file in the `web` directory:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Automated Setup (Windows)

Run the setup script:

```bash
setup.bat
```

This will:
- Start the PostgreSQL database with Docker
- Create and activate Python virtual environment
- Install backend dependencies
- Initialize the database schema
- Start the FastAPI backend server
- Install frontend dependencies
- Start the Next.js development server

### 4. Manual Setup (All Platforms)

#### Start the Database

```bash
docker-compose up -d
```

#### Setup Backend

```bash
cd api
python -m venv venv_prod
source venv_prod/bin/activate  # On Windows: venv_prod\Scripts\activate
pip install -r requirements.txt
python init_db.py
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Setup Frontend

```bash
cd web
npm install
npm run dev
```

---

## 🌐 Access the Application

Once running, access the application at:

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Database**: `localhost:5434` (PostgreSQL)

---

## 📁 Project Structure

```
optimeal/
├── api/                      # FastAPI Backend
│   ├── routers/             # API route handlers
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── users.py         # User management
│   │   ├── listings.py      # Food listing CRUD
│   │   ├── routes.py        # Route optimization
│   │   └── deliveries.py    # Delivery management
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic validation schemas
│   ├── db.py                # Database connection
│   ├── main.py              # FastAPI application entry
│   ├── init_db.py           # Database initialization
│   └── requirements.txt     # Python dependencies
│
├── web/                     # Next.js Frontend
│   ├── app/                 # App router pages
│   │   ├── donor/          # Donor dashboard
│   │   ├── volunteer/      # Volunteer map interface
│   │   ├── charity/        # Charity hub
│   │   ├── profile/        # User profile
│   │   └── api/            # API routes (NextAuth)
│   ├── components/         # Reusable React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── Header.tsx      # Navigation header
│   │   └── Footer.tsx      # Page footer
│   ├── lib/                # Utility functions
│   ├── types.ts            # TypeScript type definitions
│   └── package.json        # Node dependencies
│
├── docker-compose.yml       # Docker services configuration
├── setup.bat               # Windows setup script
└── README.md               # This file
```

---

## 🗄️ Database Schema

### Users Table
- **id**: UUID (Primary Key)
- **email**: String (Unique)
- **name**: String
- **role**: Enum (donor, volunteer, charity)
- **location_lat**: Float
- **location_lng**: Float
- **phone**: String
- **image_url**: String
- **auth_provider**: String
- **auth_provider_id**: String

### Food Listings Table
- **id**: UUID (Primary Key)
- **donor_id**: UUID (Foreign Key → Users)
- **title**: String
- **quantity_kg**: Float
- **expires_at**: DateTime
- **pickup_window_start**: DateTime
- **pickup_window_end**: DateTime
- **status**: Enum (available, reserved, picked_up, delivered, expired)

### Deliveries Table
- **id**: UUID (Primary Key)
- **volunteer_id**: UUID (Foreign Key → Users)
- **charity_id**: UUID (Foreign Key → Users)
- **listing_ids**: Array of UUIDs
- **optimized_route_data**: JSON
- **status**: Enum (en_route, completed, failed)
- **completed_at**: DateTime

---

## 🔧 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Users
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update user profile
- `GET /users/{id}` - Get user by ID

### Food Listings
- `GET /listings` - Get all available listings
- `POST /listings` - Create new listing (donors only)
- `PUT /listings/{id}` - Update listing
- `DELETE /listings/{id}` - Delete listing

### Routes
- `POST /routes/optimize` - Calculate optimized delivery route

### Deliveries
- `GET /deliveries` - Get user's deliveries
- `POST /deliveries` - Create new delivery
- `PUT /deliveries/{id}` - Update delivery status

For complete API documentation, visit [http://localhost:8000/docs](http://localhost:8000/docs) when the backend is running.

---

## 🧪 Development

### Backend Development

```bash
cd api
source venv_prod/bin/activate  # On Windows: venv_prod\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
cd web
npm run dev
```

### Database Inspection

```bash
cd api
python inspect_db.py
```

### Linting

```bash
cd web
npm run lint
```

---

## 🐳 Docker Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

### Reset Database
```bash
docker-compose down -v
docker-compose up -d
cd api && python init_db.py
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Team

Built with ❤️ by the OptiMeal team

---

## 🙏 Acknowledgments

- **shadcn/ui** for beautiful UI components
- **FastAPI** for the excellent Python web framework
- **Next.js** for the powerful React framework
- **Leaflet** for interactive mapping capabilities
- **PostGIS** for geospatial database support

---

## 📧 Support

For support, email support@optimeal.com or open an issue in the repository.

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] SMS notifications for charities
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Integration with food safety certification systems
- [ ] Automated expiration reminders
- [ ] Carbon footprint tracking

---

**Made with 💚 to reduce food waste and fight hunger**
