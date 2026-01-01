# OffSite Backend API

A robust, production-ready backend system for the OffSite construction field management platform.

## Features

- ✅ Role-based access control (Engineer, Manager, Owner)
- ✅ Offline-first syncing with conflict resolution
- ✅ AI-assisted insights (rule-based, extensible to ML)
- ✅ Construction-specific workflows (DPRs, attendance, materials)
- ✅ GST-ready invoicing (18% GST)
- ✅ Scalable multi-project architecture
- ✅ Background jobs for health scores and alerts
- ✅ Comprehensive logging and auditing

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (Access + Refresh tokens)
- **File Storage**: Cloudinary
- **Validation**: Zod
- **Background Jobs**: node-cron

## Project Structure

```
src/
 ├── app.ts                 # Express app configuration
 ├── server.ts             # Server entry point
 ├── config/               # Configuration files
 │    ├── db.ts           # MongoDB connection
 │    ├── env.ts          # Environment variables
 │    └── cloudinary.ts   # Cloudinary config
 ├── modules/             # Feature modules
 │    ├── auth/           # Authentication
 │    ├── users/          # User management
 │    ├── projects/       # Project management
 │    ├── tasks/          # Task management
 │    ├── dpr/            # Daily Progress Reports
 │    ├── attendance/     # GPS attendance
 │    ├── materials/      # Material requests
 │    ├── approvals/      # Approval workflows
 │    ├── insights/       # AI insights
 │    ├── invoices/       # GST invoicing
 │    └── sync/           # Offline sync
 ├── middlewares/         # Express middlewares
 │    ├── auth.middleware.ts
 │    ├── role.middleware.ts
 │    └── error.middleware.ts
 ├── utils/               # Utility functions
 │    ├── jwt.ts
 │    ├── permissions.ts
 │    ├── siteHealth.ts
 │    ├── delayPredictor.ts
 │    ├── anomalyDetector.ts
 │    ├── logger.ts
 │    └── cronJobs.ts
 └── types/               # TypeScript types
```

## Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (for image storage)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/offsite
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CORS_ORIGIN=http://localhost:8080
```

### Running

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/signup` - Create new user with email and password
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users/:id` - Get user by ID

### Projects
- `POST /api/projects` - Create project (Owner only)
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project details

### Tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id/status` - Update task status

### DPR
- `POST /api/dpr` - Create DPR with photos
- `GET /api/dpr/project/:projectId` - Get DPRs by project

### Attendance
- `POST /api/attendance/checkin` - Check in
- `POST /api/attendance/checkout` - Check out
- `GET /api/attendance/project/:projectId` - Get attendance by project

### Materials
- `POST /api/materials/request` - Create material request
- `GET /api/materials/pending` - Get pending requests
- `POST /api/materials/:id/approve` - Approve request
- `POST /api/materials/:id/reject` - Reject request

### Insights
- `GET /api/insights/site-health` - Get site health score
- `GET /api/insights/delay-risk` - Get delay risk predictions
- `GET /api/insights/material-anomalies` - Get material anomalies

### Invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id` - Get invoice details

### Sync
- `POST /api/sync/batch` - Batch sync offline data

## Intelligence Logic

### Site Health Score
- Attendance % → 30%
- Task completion → 40%
- Pending approvals → -20% (penalty)
- Delay risk → -10% (penalty)

### Delay Risk Predictor
Triggers HIGH risk if:
- Tasks overdue > 2 days
- Material approvals pending > 48 hours
- Attendance < 70%

### Material Anomaly Detector
Anomaly if: `quantity > avgLast7Days * 1.3` (30% higher than average)

## Background Jobs

- **Daily 2 AM**: Recalculate site health scores
- **Daily 8 AM**: Generate delay risk alerts
- **Weekly Sunday 3 AM**: Cleanup old unsynced data

## Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting on auth routes
- JWT token authentication
- Role-based access control
- Input validation with Zod
- Secure file uploads

## Error Handling

All errors follow consistent format:
```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

## Logging

Comprehensive logging for:
- API requests
- Authentication events
- Approval actions
- Error tracking
- Background job execution

---

## Project status & Roadmap

### Quick status
- **Backend features**: Most core modules implemented (Auth, Users, Projects, Tasks, DPR, Attendance, Materials, Insights, Invoices, Sync) — **Mostly ✅**
- **Tests**: Unit and integration tests are minimal or missing — **⚠️**
- **API docs**: OpenAPI / Postman collection not added — **⚠️**
- **CI/CD**: Not configured — **⚠️**

### Per-module checklist
- **Auth**
  - [x] Routes, controller, service, JWT access/refresh
  - [ ] Add comprehensive unit & integration tests
- **Users**
  - [x] Model, routes, controller
  - [ ] Add pagination/filtering endpoints
- **Projects**
  - [x] Create / list / detail
  - [ ] Add project-level role management APIs
- **Tasks**
  - [x] Create, update status
  - [ ] Add bulk update endpoints, tests
- **DPR**
  - [x] Create with photo upload
  - [ ] Attach AI-backend integration for real summaries
- **Attendance**
  - [x] GPS checkin/checkout & project queries
  - [ ] Add geofencing validation (optional)
- **Materials (includes approvals)**
  - [x] Request, approve, reject logic (via Materials routes)
  - [ ] Add approval SLA enforcement & audit trails
- **Insights**
  - [x] Site health, delay risk, anomalies utilities
  - [ ] Expose full metrics & history endpoints
- **Invoices**
  - [x] Create/list/get invoice endpoints (GST-ready)
  - [ ] Export / download as PDF generator
- **Sync**
  - [x] Batch sync endpoint with basic conflict-resolution
  - [ ] Document sync protocol & add edge-case tests

### Roadmap (next priorities)
1. Add unit & integration tests (Jest + supertest) across critical endpoints ✅
2. Create OpenAPI spec / Postman collection for frontend integration
3. Implement CI pipeline (lint, build, test)
4. Harden security: rate-limiting, monitoring, secrets rotation
5. Finalize sync contract and add e2e sync tests
6. Add example environment & deployment docs (Docker, Kubernetes / Azure)

---

If you want, I can:
- Generate an OpenAPI spec from current routes
- Add a `TODO.md` with actionable issues per module
- Create initial test scaffolding for backend routes

## License

MIT

