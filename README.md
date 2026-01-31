# CryoCommand - Cold Chain Logistics API

NestJS backend for cold chain logistics monitoring system.

## Tech Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: MongoDB
- **ORM**: Prisma
- **Authentication**: JWT (Bearer token)
- **Authorization**: Role-based (admin, operator, viewer)

## Project Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── config/
│   ├── index.ts
│   ├── jwt.config.ts          # JWT configuration
│   └── mongo.config.ts        # MongoDB configuration
├── common/
│   ├── index.ts
│   ├── constants/
│   │   └── roles.ts           # Role definitions
│   ├── decorators/
│   │   ├── roles.decorator.ts # @Roles() decorator
│   │   └── current-user.decorator.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts  # JWT authentication guard
│   │   └── roles.guard.ts     # Role-based authorization guard
│   └── interfaces/
│       └── user.interface.ts  # User type definitions
└── prisma/
    ├── prisma.module.ts       # Prisma module
    └── prisma.service.ts      # Prisma service
prisma/
└── schema.prisma              # Database schema
```

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017/coldchain

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Server
PORT=8000
```

### Running the Application

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

All endpoints are prefixed with `/api`

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Vehicles
- `GET /api/vehicles` - List vehicles
- `GET /api/vehicles/:id` - Get vehicle
- `POST /api/vehicles` - Create vehicle (admin, operator)
- `DELETE /api/vehicles/:id` - Delete vehicle (admin)

### Sensor Readings
- `GET /api/vehicles/:id/readings` - Get vehicle readings

### Alerts
- `GET /api/alerts` - List alerts
- `PUT /api/alerts/:id/resolve` - Resolve alert (admin, operator)

### Alert Rules
- `GET /api/alert-rules` - List rules
- `POST /api/alert-rules` - Create rule (admin, operator)
- `PUT /api/alert-rules/:id` - Update rule (admin, operator)
- `DELETE /api/alert-rules/:id` - Delete rule (admin)

### Trips
- `GET /api/trips` - List trips
- `GET /api/trips/:id` - Get trip
- `POST /api/trips` - Create trip (admin, operator)
- `PUT /api/trips/:id` - Update trip (admin, operator)
- `DELETE /api/trips/:id` - Delete trip (admin)
- `POST /api/trips/:id/start` - Start trip (admin, operator)
- `POST /api/trips/:id/complete` - Complete trip (admin, operator)
- `GET /api/trips/:id/readings` - Get trip readings
- `GET /api/trips/:id/alerts` - Get trip alerts
- `GET /api/trips/:id/summary` - Get trip summary

### Compliance
- `GET /api/compliance/standards` - List standards
- `POST /api/compliance/standards` - Create standard (admin)
- `GET /api/compliance/results` - List results
- `GET /api/compliance/results/:tripId` - Get trip compliance
- `POST /api/compliance/evaluate/:tripId` - Evaluate trip (admin, operator)
- `POST /api/compliance/evaluate-all` - Evaluate all trips (admin)
- `GET /api/compliance/summary` - Get compliance summary
- `GET /api/compliance/report/:tripId/pdf` - Download PDF report

### Reports
- `GET /api/reports` - List reports
- `POST /api/reports` - Create report (admin, operator)
- `GET /api/reports/:id/download` - Download report

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard stats
- `GET /api/dashboard/recent-alerts` - Get recent alerts
- `GET /api/dashboard/risky-vehicles` - Get risky vehicles

### Seed Data
- `POST /api/seed` - Seed demo data

## Roles

| Role     | Description |
|----------|-------------|
| admin    | Full access to all resources |
| operator | Can manage vehicles, trips, alerts, reports |
| viewer   | Read-only access |

## Authentication

All endpoints (except auth) require JWT Bearer token:

```
Authorization: Bearer <token>
```

JWT Payload:
```json
{
  "sub": "user-id",
  "role": "admin|operator|viewer"
}
```
