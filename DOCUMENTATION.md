# OffSite - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Features](#backend-features)
4. [Frontend Features](#frontend-features)
5. [Database Models](#database-models)
6. [Authentication & Authorization](#authentication--authorization)
7. [Offline Support](#offline-support)
8. [AI Features](#ai-features)
9. [API Endpoints](#api-endpoints)
10. [Configuration](#configuration)

---

## Overview

OffSite is a mobile-first full-stack application designed for construction field operations management. It provides comprehensive tools for managing daily progress reports (DPRs), GPS-based attendance tracking, material requests and approvals, AI-assisted insights, GST-aware invoicing, and offline-first synchronization.

### Key Technologies
- **Backend**: Express.js + TypeScript, MongoDB (Mongoose), JWT authentication
- **Frontend**: React + Vite + TypeScript, PWA with IndexedDB for offline support
- **Mobile**: Capacitor for native Android app
- **Media Storage**: Cloudinary for photo uploads
- **AI Services**: Support for OpenAI, Azure OpenAI, Gemini, and HuggingFace
- **Maps**: MapTiler for geocoding and location services
- **i18n**: react-i18next for multilingual support (English, Hindi, Marathi, Tamil)
- **Deployment**: Render (backend), Vercel (frontend)

---

## Architecture

### Backend Structure
```
backend/
├── src/
│   ├── app.ts              # Express app configuration
│   ├── server.ts           # Server entry point
│   ├── config/             # Configuration files (DB, Cloudinary, env)
│   ├── middlewares/        # Auth, error handling, role-based access
│   ├── modules/            # Feature modules (auth, users, projects, etc.)
│   ├── services/           # Business logic services (AI, insights, etc.)
│   ├── utils/              # Utilities (logger, mailer, cron jobs, etc.)
│   └── types/              # TypeScript type definitions
```

### Frontend Structure
```
frontend/
├── src/
│   ├── App.tsx             # Main app component with routing
│   ├── pages/              # Page components
│   ├── components/         # Reusable UI components
│   ├── services/api/       # API service functions
│   ├── lib/                # Utilities (API client, IndexedDB, permissions)
│   ├── store/              # Redux store and slices
│   └── hooks/              # Custom React hooks
```

---

## Backend Features

### 1. Authentication Module (`/api/auth`)

**Features:**
- User registration (signup) with role assignment
- User login with JWT access and refresh tokens
- Password reset flow (forgot password → email with reset token → reset password)
- Get current authenticated user profile
- Logout functionality

**Routes:**
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password with token

**User Roles:**
- `engineer` - Field workers who create DPRs, mark attendance, raise material requests
- `manager` - Approve material requests, view insights, monitor progress
- `owner` - Full system access including project creation, invoicing, user management, contractor management
- `purchase_manager` - View approved material requests, send materials to site, track purchase history
- `contractor` - Register labourers, mark daily attendance, generate weekly invoices

### 2. Users Module (`/api/users`)

**Features:**
- Get current user profile
- Update own profile
- Get user by ID
- Search user by OffSite ID (unique identifier format: OSSE0023, OSPM0042, OSOW0001)

**Routes:**
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update own profile
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/offsite/:offsiteId` - Search user by OffSite ID

**User Model Fields:**
- `name`, `email`, `password` (hashed), `phone` (optional)
- `role` (engineer/manager/owner)
- `offsiteId` (unique, immutable)
- `assignedProjects` (array of project IDs)
- `isActive` (boolean)
- Password reset fields: `resetPasswordToken`, `resetPasswordExpires`

### 3. Projects Module (`/api/projects`)

**Features:**
- Create projects (owner only)
- Get all projects (filtered by user's assigned projects)
- Get project by ID with full details
- Add members to projects (owner only)
- Project invitations system (invite users by OffSite ID)
- Accept/reject project invitations

**Routes:**
- `POST /api/projects` - Create project (owner only)
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects/:id/members` - Add members to project (owner only)
- `GET /api/projects/invitations/me` - Get my invitations
- `POST /api/projects/invitations/:id/accept` - Accept invitation
- `POST /api/projects/invitations/:id/reject` - Reject invitation

**Project Model Fields:**
- `name`, `location`, `startDate`, `endDate` (optional)
- `status` (planning/active/on-hold/completed/archived)
- `members` (array of user IDs)
- `progress` (0-100)
- `healthScore` (0-100, calculated automatically)

### 4. Tasks Module (`/api/tasks`)

**Features:**
- Create tasks (managers/owners)
- Get all tasks (filtered by project and status)
- Update task status (pending/in-progress/completed)

**Routes:**
- `GET /api/tasks` - Get all tasks (with optional project filter)
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id/status` - Update task status

**Task Model Fields:**
- `projectId`, `title`, `description` (optional)
- `status` (pending/in-progress/completed)
- `assignedTo` (user ID)
- `dueDate` (optional)
- `plannedLabourCount` (number of labourers planned per day)

### 5. DPR (Daily Progress Report) Module (`/api/dpr`)

**Features:**
- Create DPRs with photos (up to 6 photos, 5MB each)
- Upload photos to Cloudinary
- Track work stoppages with reasons and evidence
- Get DPRs by project
- AI-generated summaries (optional)

**Routes:**
- `POST /api/dpr` - Create DPR (requires canCreateDPR permission, accepts multipart/form-data)
- `GET /api/dpr/project/:projectId` - Get DPRs by project

**DPR Model Fields:**
- `projectId`, `taskId`, `createdBy`
- `photos` (array of Cloudinary URLs)
- `notes` (optional text)
- `aiSummary` (optional, AI-generated)
- `workStoppage` (optional object with):
  - `occurred` (boolean)
  - `reason` (MATERIAL_DELAY/LABOUR_SHORTAGE/WEATHER/MACHINE_BREAKDOWN/APPROVAL_PENDING/SAFETY_ISSUE)
  - `durationHours` (number)
  - `remarks` (string)
  - `evidencePhotos` (array of Cloudinary URLs)
- `synced` (boolean, for offline support)

### 6. Attendance Module (`/api/attendance`)

**Features:**
- GPS-based check-in and check-out
- Location reverse geocoding using MapTiler
- Get attendance records by project
- Track attendance with GPS coordinates

**Routes:**
- `POST /api/attendance/checkin` - Mark check-in (requires canMarkAttendance permission)
- `POST /api/attendance/checkout` - Mark check-out (requires canMarkAttendance permission)
- `GET /api/attendance/project/:projectId` - Get attendance by project

**Attendance Model Fields:**
- `userId`, `projectId`
- `type` (checkin/checkout)
- `location` (formatted address string)
- `latitude`, `longitude` (GPS coordinates)
- `timestamp` (Date)
- `synced` (boolean, for offline support)

### 7. Materials Module (`/api/materials`)

**Features:**
- Create material requests
- Get materials catalog (with Indian construction materials and prices)
- Get pending material requests
- Approve/reject material requests (managers only)
- Anomaly detection for material requests
- Estimated cost calculation for requests

**Routes:**
- `POST /api/materials/request` - Create material request (requires canRaiseMaterialRequests permission)
- `GET /api/materials/catalog` - Get materials catalog (grouped by category, includes prices)
- `GET /api/materials/pending` - Get pending requests
- `POST /api/materials/:id/approve` - Approve request (requires canApproveMaterialRequests permission)
- `POST /api/materials/:id/reject` - Reject request (requires canApproveMaterialRequests permission)

**Material Request Model Fields:**
- `projectId`, `materialId`, `materialName`
- `quantity`, `unit`, `reason`
- `requestedBy`
- `status` (pending/approved/rejected)
- `anomalyDetected` (boolean)
- `anomalyReason` (optional string)
- `estimatedCost` (calculated: quantity × approxPriceINR)
- `approvedBy`, `rejectedBy` (optional user IDs)
- `rejectionReason` (optional string)
- `approvedAt`, `rejectedAt` (optional dates)

**Material Catalog Features:**
- Pre-seeded with 24+ realistic Indian construction materials
- Categories: Cement & Aggregates, Steel & Metals, Bricks & Blocks, Concrete & Chemicals, Wood & Fixtures, Electrical, Plumbing
- Each material includes:
  - Name
  - Category
  - Unit (bag, kg, ton, nos, meter, sqm, cum, liter)
  - Approximate price in INR
  - Price unit
  - Active status
- Quantity validation based on unit type (integer for bag/nos, decimal for others)
- Estimated cost automatically calculated when creating requests

### 8. Insights Module (`/api/insights`)

**Features:**
- Site health score calculation
- Delay risk assessment
- Material anomaly detection
- Pending material requests summary
- Labour gap analysis
- Approval delay tracking
- AI-powered explanations for insights

**Routes:**
- `GET /api/insights/site-health` - Get site health score (requires canViewAIInsights permission)
- `GET /api/insights/delay-risk` - Get delay risk assessment
- `GET /api/insights/material-anomalies` - Get material anomalies
- `GET /api/insights/pending-materials` - Get pending material requests summary
- `GET /api/insights/labour-gap` - Get labour gap analysis
- `GET /api/insights/approval-delays` - Get approval delay tracking
- `GET /api/insights/ai/dpr-summary` - Get AI-generated DPR summary
- `GET /api/insights/ai/health-explanation` - Get AI explanation for health score
- `GET /api/insights/ai/delay-risk-explanation` - Get AI explanation for delay risk
- `GET /api/insights/ai/material-anomaly-explanation` - Get AI explanation for material anomalies

### 9. Invoices Module (`/api/invoices`)

**Features:**
- Create GST-compliant invoices (owner only)
- Support for CGST/SGST (intra-state) and IGST (inter-state)
- Invoice number generation (format: OS/INV/2024-25/0001)
- Finalize invoices (makes them immutable)
- Download invoice PDF
- Track payment status (UNPAID/PARTIALLY_PAID/PAID)

**Routes:**
- `POST /api/invoices` - Create invoice (owner only)
- `GET /api/invoices` - Get all invoices (owner only)
- `GET /api/invoices/:id` - Get invoice by ID (owner only)
- `POST /api/invoices/:id/finalize` - Finalize invoice (owner only)
- `GET /api/invoices/:id/pdf` - Download invoice PDF (owner only)
- `PATCH /api/invoices/:id/payment-status` - Update payment status (owner only)

**Invoice Model Fields:**
- `projectId`, `ownerId`
- `billingPeriod` (from/to dates)
- `taxableAmount`, `gstRate` (default 18%)
- `gstType` (CGST_SGST/IGST)
- `cgstAmount`, `sgstAmount`, `igstAmount`
- `totalAmount`
- `invoiceNumber` (assigned after finalization)
- `status` (DRAFT/FINALIZED)
- `paymentStatus` (UNPAID/PARTIALLY_PAID/PAID)
- `supplier` (companyName, address, gstin, state)
- `client` (name, address, gstin optional, state)
- `notes` (optional)
- `finalizedBy`, `finalizedAt` (audit fields)

**Important:** Finalized invoices are immutable (except payment status).

### 10. Sync Module (`/api/sync`)

**Features:**
- Batch synchronization for offline data
- Sync DPRs, attendance, and material requests
- Handles conflict resolution

**Routes:**
- `POST /api/sync/batch` - Batch sync offline data (requires auth)

### 11. Events Module (`/api/events`)

**Features:**
- Create events (meetings, inspections, deliveries, safety, maintenance, other)
- Get all events (filtered by project)
- Get event by ID
- Update event
- Delete event

**Routes:**
- `POST /api/events` - Create event
- `GET /api/events` - Get all events (with optional project filter)
- `GET /api/events/:id` - Get event by ID
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

**Event Model Fields:**
- `projectId`, `title`, `description` (optional)
- `type` (meeting/inspection/delivery/safety/maintenance/other)
- `status` (scheduled/in-progress/completed/cancelled)
- `startDate`, `endDate` (optional)
- `location` (optional string)
- `createdBy`
- `attendees` (array of user IDs)
- `reminders` (array of dates)

### 12. Notifications Module (`/api/notifications`)

**Features:**
- Get user's notifications
- Mark notification as read
- Mark all notifications as read
- Create notification (managers/owners)
- Create bulk notifications
- Search user by OffSite ID

**Routes:**
- `GET /api/notifications/me` - Get my notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/me/read-all` - Mark all as read
- `POST /api/notifications` - Create notification (requires canSendNotifications permission)
- `POST /api/notifications/bulk` - Create bulk notifications (requires canSendNotifications permission)
- `GET /api/notifications/search/user` - Search user by OffSite ID

**Notification Model Fields:**
- `userId`, `offsiteId` (optional, for easy lookup)
- `type` (material_request/material_approved/material_rejected/dpr_submitted/task_assigned/task_completed/attendance_reminder/project_update/system_alert/general)
- `title`, `message`
- `data` (optional object with additional data)
- `read` (boolean)
- `readAt` (optional date)

### 13. AI Module (`/api/ai`)

**Features:**
- Site risk assessment
- Anomaly detection
- AI health check endpoint

**Routes:**
- `GET /api/ai/health` - AI service health check (no auth required)
- `GET /api/ai/site-risk/:siteId` - Get site risk assessment (requires canViewAIInsights permission)
- `GET /api/ai/anomalies/:siteId` - Get anomalies (requires canViewAIInsights permission)

### 14. Stock Module (`/api/stock`)

**Features:**
- Get current stock balance per project
- Get stock alerts for low inventory
- Track material stock levels

**Routes:**
- `GET /api/stock/project/:projectId` - Get project stock balance (requires auth)
- `GET /api/stock/alerts/:projectId` - Get stock alerts (requires auth)

**Stock Ledger Model Fields:**
- `projectId`, `materialId`, `materialName`
- `transactionType` (IN/OUT)
- `quantity`, `unit`
- `transactionDate`
- `notes` (optional)

### 15. Owner Module (`/api/owner`)

**Features:**
- Owner-specific overview and statistics
- System-wide analytics

**Routes:**
- `GET /api/owner/overview/:projectId` - Get owner overview (owner only)

### 16. Purchase Module (`/api/purchase`)

**Features:**
- Purchase Manager workflow for sending materials
- Engineer workflow for receiving materials
- Purchase history tracking with GST calculations

**Routes:**
- `GET /api/purchase/approved-requests` - Get approved material requests pending dispatch (purchase_manager, owner)
- `POST /api/purchase/send/:requestId` - Send material (purchase_manager only)
- `POST /api/purchase/receive/:historyId` - Confirm receipt (engineer)
- `GET /api/purchase/sent-for-engineer` - Get materials sent to engineer's projects
- `GET /api/purchase/history/project/:projectId` - Get purchase history by project
- `GET /api/purchase/history` - Get all purchase history

**Purchase History Model Fields:**
- `projectId`, `materialRequestId`, `materialId`, `materialName`
- `qty`, `unit`, `gstRate`, `gstAmount`, `basePrice`, `totalCost`
- `sentAt`, `sentBy` (Purchase Manager)
- `receivedAt`, `receivedBy` (Engineer), `proofPhotoUrl`, `geoLocation`, `coordinates`
- `status` (SENT/RECEIVED)

### 17. Contractor Module (`/api/contractor`)

**Features:**
- Contractor management by Owner
- Labour registration with face photos
- Daily attendance upload
- Weekly invoice generation and approval workflow

**Routes:**
- `GET /api/contractor` - Get all contractors (owner only)
- `POST /api/contractor/assign` - Assign contractor to project (owner only)
- `POST /api/contractor/labour` - Register labour (contractor only)
- `GET /api/contractor/labours` - Get labours (contractor)
- `POST /api/contractor/attendance` - Upload attendance (contractor only)
- `GET /api/contractor/attendance/summary/:projectId` - Get attendance summary
- `POST /api/contractor/invoice` - Create weekly invoice (contractor only)
- `GET /api/contractor/invoices/pending` - Get pending invoices (manager, owner)
- `GET /api/contractor/invoices/approved` - Get approved invoices (owner only)
- `GET /api/contractor/invoices/my` - Get my invoices (contractor)
- `POST /api/contractor/invoice/:id/approve` - Approve invoice (manager only)
- `POST /api/contractor/invoice/:id/reject` - Reject invoice (manager only)

**Contractor Model Fields:**
- `userId`, `assignedProjects`, `contracts[]`
- Contract: `projectId`, `labourCountPerDay`, `ratePerLabourPerDay`, `gstRate`, `startDate`, `endDate`, `isActive`

**Labour Model Fields:**
- `contractorId`, `name`, `code`, `faceImageUrl`, `faceEmbedding`, `projectId`, `isActive`

**Labour Attendance Model Fields:**
- `labourId`, `contractorId`, `projectId`, `date`, `present`, `groupPhotoUrl`, `detectedAt`

**Contractor Invoice Model Fields:**
- `contractorId`, `projectId`, `weekStartDate`, `weekEndDate`
- `labourCountTotal`, `ratePerLabour`, `taxableAmount`, `gstRate`, `gstAmount`, `totalAmount`
- `status` (PENDING_PM_APPROVAL/APPROVED/REJECTED)
- `approvedBy`, `approvedAt`, `rejectedBy`, `rejectedAt`, `rejectionReason`
- `sentToOwner`, `invoiceNumber`

### 18. Tools Module (`/api/tools`)

**Features:**
- Tool inventory management
- Issue/return workflow with history tracking
- Permanent audit trail

**Routes:**
- `POST /api/tools` - Create tool (manager, owner)
- `GET /api/tools` - Get all tools
- `DELETE /api/tools/:toolId` - Delete tool (manager, owner)
- `POST /api/tools/:toolId/issue` - Issue tool to worker
- `POST /api/tools/:toolId/return` - Return tool
- `GET /api/tools/:toolId/history` - Get tool history

**Tool Model Fields:**
- `toolId`, `name`, `description`, `category`
- `status` (AVAILABLE/ISSUED)
- `currentHolderWorkerId`, `currentHolderName`, `currentProjectId`, `issuedAt`
- `history[]` (action, workerId, workerName, projectId, timestamp, notes)
- `createdBy`

### 19. Permits Module (`/api/permits`)

**Features:**
- Permit-to-Work (PTW) system for hazardous tasks
- OTP-based verification (10-minute validity)
- Safety Officer approval workflow

**Routes:**
- `POST /api/permits` - Create permit request (engineer)
- `GET /api/permits/my` - Get my permits (engineer)
- `GET /api/permits/pending` - Get pending permits (manager)
- `POST /api/permits/:id/approve` - Approve permit and generate OTP (manager)
- `POST /api/permits/:id/verify-otp` - Verify OTP to start work (engineer)
- `GET /api/permits/project/:projectId` - Get permits by project

**Permit Model Fields:**
- `projectId`, `requestedBy`, `taskDescription`, `hazardType`, `safetyMeasures[]`
- `status` (PENDING/APPROVED/OTP_GENERATED/COMPLETED/EXPIRED)
- `approvedBy`, `approvedAt`, `otp`, `otpGeneratedAt`, `otpExpiresAt`, `otpUsed`
- `workStartedAt`, `completedAt`, `notes`

### 20. Petty Cash Module (`/api/petty-cash`)

**Features:**
- Expense submission with receipt photo and GPS
- Geo-fence validation (within 200m of site)
- Multi-level approval workflow

**Routes:**
- `POST /api/petty-cash` - Submit expense (manager)
- `GET /api/petty-cash/pending` - Get pending expenses (manager, owner)
- `GET /api/petty-cash/all` - Get all expenses with summary (owner)
- `GET /api/petty-cash/my` - Get my expenses (manager)
- `POST /api/petty-cash/:id/approve` - Approve expense (owner)
- `POST /api/petty-cash/:id/reject` - Reject expense (owner)

**Petty Cash Model Fields:**
- `projectId`, `submittedBy`, `amount`, `description`, `category`
- `receiptPhotoUrl`, `geoLocation`, `coordinates`, `distanceFromSite`, `geoFenceValid`
- `status` (PENDING_PM_APPROVAL/PENDING_OWNER_APPROVAL/APPROVED/REJECTED)
- `pmApprovedBy`, `pmApprovedAt`, `ownerApprovedBy`, `ownerApprovedAt`
- `rejectedBy`, `rejectedAt`, `rejectionReason`

---

## Frontend Features

### 1. Authentication Pages

**Login Page** (`/login`)
- Email and password login
- Redirects to appropriate dashboard based on role

**Signup Page** (`/signup`)
- User registration with name, email, password, phone (optional), and role selection

**Forgot Password Page** (`/forgot-password`)
- Request password reset via email

**Reset Password Page** (`/reset-password/:token`)
- Reset password using token from email

### 2. Dashboard Pages

**Index Page** (`/`)
- Redirects to role-specific dashboard:
  - Engineers → Engineer Dashboard
  - Managers/Owners → Manager Dashboard

**Engineer Dashboard** (`/`)
- Quick access to DPR creation, attendance marking, material requests
- View assigned tasks
- View recent DPRs and attendance
- Notification bell

**Manager Dashboard** (`/`)
- Overview of all projects
- Site health scores
- Pending approvals count
- Recent activity
- Quick access to insights, approvals, projects

### 3. DPR Page (`/dpr`)

**Features:**
- Multi-step form for DPR creation:
  1. Project selection
  2. Task selection
  3. Photo upload (up to 6 photos)
  4. Notes entry
  5. Work stoppage tracking (optional)
  6. Review and submit
- View previous DPRs
- AI summary generation (optional)
- Offline support with IndexedDB storage
- Photo preview before upload

**Work Stoppage Tracking:**
- Mark if work stoppage occurred
- Select reason (material delay, labour shortage, weather, machine breakdown, approval pending, safety issue)
- Enter duration in hours
- Add remarks
- Upload evidence photos

### 4. Attendance Page (`/attendance`)

**Features:**
- GPS-based check-in and check-out
- Location display (reverse geocoded address)
- View attendance history by project
- Offline support with IndexedDB storage
- Map integration for location verification

### 5. Materials Page (`/materials`)

**Features:**
- Create material requests
- Browse materials catalog
- View pending requests
- Request approval workflow
- Offline support with IndexedDB storage

### 6. Projects Page (`/projects`)

**Features:**
- View all assigned projects
- Project cards with status, progress, health score
- Filter by status
- Create projects (owner only)
- Project detail view with:
  - Project information
  - Members list
  - Tasks
  - DPRs
  - Attendance summary
  - Health metrics

**Project Detail Page** (`/projects/:id`)
- Comprehensive project view
- Add members (owner only)
- Invite users by OffSite ID
- View project invitations
- Task management
- DPR history
- Attendance tracking

### 7. Tasks Page (`/tasks`)

**Features:**
- View all tasks
- Filter by project and status
- Create tasks (managers/owners)
- Update task status (engineers)
- Search engineers by OffSite ID for task assignment
- Task cards with status, assignee, due date

### 8. Approvals Page (`/approvals`)

**Features:**
- View pending material requests
- Approve/reject requests
- View approval history
- Filter by project and status

### 9. Insights Page (`/insights`)

**Features:**
- Site health score visualization
- Delay risk assessment
- Material anomalies detection
- Labour gap analysis
- Approval delays tracking
- AI-powered explanations for each insight
- Charts and visualizations
- Project-specific insights

### 10. Invoicing Page (`/invoicing`)

**Features:**
- Create invoices (owner only)
- GST calculation (CGST/SGST or IGST)
- Invoice number generation
- Finalize invoices
- Download PDF invoices
- Track payment status
- View invoice history
- Billing period selection
- Supplier and client information management

### 11. Events Page (`/events`)

**Features:**
- Create events (meetings, inspections, deliveries, safety, maintenance, other)
- Calendar view
- Event list view
- Filter by project and type
- Update event status
- Delete events
- Event reminders

### 12. Sync Page (`/sync`)

**Features:**
- View pending offline items
- Manual sync trigger
- Sync status indicators
- View sync history
- Conflict resolution UI

### 13. AI Command Center (`/ai-command`)

**Features:**
- Site risk assessment visualization
- Anomaly detection results
- Real-time updates (auto-refresh every 60 seconds)
- Project selection
- Cached data support (1 hour cache)
- Risk level indicators
- Anomaly details and explanations

### 14. Profile Page (`/profile`)

**Features:**
- View user profile
- Update profile information
- View OffSite ID
- View assigned projects
- Change password (if implemented)

### 15. Purchase Dashboard (`/purchase-dashboard`)

**For:** Purchase Manager

**Features:**
- View approved material requests awaiting dispatch
- Material details (name, quantity, unit, project, requested by)
- Cost calculation with GST breakdown
- "Send Materials" action to mark as dispatched
- Notifications sent to Engineer on dispatch

### 16. Purchase History (`/purchase-history`)

**For:** Engineer, Purchase Manager, Owner

**Features:**
- View materials sent to projects (role-filtered)
- Engineers see materials sent to their projects with pending confirmation
- Confirm receipt with:
  - Photo proof (using Capacitor Camera)
  - GPS location capture (using Capacitor Geolocation)
  - Reverse geocoding for location name
- Offline queue for receipt confirmation

### 17. Contractor Labours (`/contractor/labours`)

**For:** Contractor

**Features:**
- Register new labourers with name/code
- Capture face photo for attendance matching
- Assign labourers to projects
- View list of all registered labourers
- Delete/deactivate labourers

### 18. Contractor Attendance (`/contractor/attendance`)

**For:** Contractor

**Features:**
- Select project for attendance
- Upload group photo
- Select labourers present (for face matching placeholder)
- Mark attendance for selected labourers
- View attendance history
- Offline-first with IndexedDB sync

### 19. Contractor Weekly Invoice (`/contractor/weekly-invoice`)

**For:** Contractor

**Features:**
- Select project
- Auto-calculate labour days from attendance (Mon-Sun)
- Apply contract rate (per labour/day)
- Calculate GST and total amount
- Generate invoice for PM approval
- Track invoice status (Pending/Approved/Rejected)

### 20. Contractors Management (`/contractors`)

**For:** Owner

**Features:**
- View all contractors
- Assign contractors to projects
- Define labour contracts:
  - Labour count per day
  - Rate per labour/day (INR)
  - GST rate
  - Contract start/end dates
- View contractor invoices

### 21. Tools Page (`/tools`)

**For:** Engineer, Manager, Owner, Purchase Manager, Contractor

**Features:**
- View tool inventory
- Add new tools (Manager/Owner only)
- Issue tools to workers with project assignment
- Return tools with notes
- View tool history (who issued/returned when)
- Status indicators (Available/Issued)

### 22. Permits Page (`/permits`)

**For:** Engineer, Manager

**Features:**
- **Engineer View:**
  - Request permit for hazardous tasks
  - Specify task description and hazard type
  - View my permit requests
  - Enter OTP to start permitted work
- **Manager View (Safety Officer):**
  - View pending permit requests
  - Approve permits (generates OTP valid for 10 mins)
  - Reject permits with reason

### 23. Petty Cash Page (`/petty-cash`)

**For:** Manager, Owner

**Features:**
- **Manager View:**
  - Submit expenses with amount, description, category
  - Capture receipt photo
  - Capture GPS location (geo-fence validation)
  - View my expenses and status
- **Owner View:**
  - View all expenses with summary
  - Approve/reject pending expenses
  - Track total approved amounts

### 24. Common Components

**Notification Bell**
- Real-time notification display
- Mark as read functionality
- Notification types with icons

**Offline Banner**
- Shows when device is offline
- Connectivity status indicator

**Theme Toggle**
- Dark/light mode support
- System theme detection

**Status Badges**
- Color-coded status indicators
- Used throughout the app

**KPI Cards**
- Display key metrics
- Used in dashboards

**Health Score Ring**
- Circular progress indicator for health scores
- Color-coded (green/yellow/red)

---

## Database Models

### User Model
- **Collection**: `users`
- **Fields**: name, email, password (hashed), phone (optional), role, offsiteId (unique), assignedProjects, isActive, resetPasswordToken, resetPasswordExpires
- **Indexes**: email (unique), phone (sparse), role, offsiteId (unique), resetPasswordToken

### Project Model
- **Collection**: `projects`
- **Fields**: name, location, startDate, endDate (optional), status, members, progress (0-100), healthScore (0-100)
- **Indexes**: status, members

### Task Model
- **Collection**: `tasks`
- **Fields**: projectId, title, description (optional), status, assignedTo, dueDate (optional), plannedLabourCount
- **Indexes**: projectId + status, assignedTo

### DPR Model
- **Collection**: `dprs`
- **Fields**: projectId, taskId, createdBy, photos (Cloudinary URLs), notes (optional), aiSummary (optional), workStoppage (optional), synced
- **Indexes**: projectId + createdAt, createdBy, synced

### Attendance Model
- **Collection**: `attendances`
- **Fields**: userId, projectId, type (checkin/checkout), location, latitude, longitude, timestamp, synced
- **Indexes**: userId + timestamp, projectId + timestamp, synced

### Material Request Model
- **Collection**: `materialrequests`
- **Fields**: projectId, materialId, materialName, quantity, unit, reason, requestedBy, status, anomalyDetected, anomalyReason (optional), approvedBy, rejectedBy, rejectionReason (optional), approvedAt, rejectedAt
- **Indexes**: projectId + status, requestedBy, status + createdAt

### Invoice Model
- **Collection**: `invoices`
- **Fields**: projectId, ownerId, billingPeriod, taxableAmount, gstRate, gstType, cgstAmount, sgstAmount, igstAmount, totalAmount, invoiceNumber (unique, sparse), status, paymentStatus, supplier, client, notes (optional), finalizedBy, finalizedAt, syncedAt
- **Indexes**: projectId + createdAt, invoiceNumber, status, ownerId, billingPeriod dates

### Event Model
- **Collection**: `events`
- **Fields**: projectId, title, description (optional), type, status, startDate, endDate (optional), location (optional), createdBy, attendees (optional), reminders (optional)
- **Indexes**: projectId + startDate, createdBy, status

### Notification Model
- **Collection**: `notifications`
- **Fields**: userId, offsiteId (optional), type, title, message, data (optional), read, readAt (optional)
- **Indexes**: userId + read + createdAt, offsiteId + read

### Project Invitation Model
- **Collection**: `projectinvitations`
- **Fields**: projectId, userId, offsiteId, invitedBy, role, status, respondedAt (optional)
- **Indexes**: userId + status, offsiteId + status, projectId + status

### Material Catalog Model
- **Collection**: `materialcatalogs`
- **Fields**: name, category, unit, description (optional), approxPriceINR, priceUnit, isActive, defaultAnomalyThreshold
- **Indexes**: name (unique), isActive
- **Pre-seeded**: 24+ realistic Indian construction materials with prices

### Stock Ledger Model
- **Collection**: `stockledgers`
- **Fields**: projectId, materialId, materialName, transactionType (IN/OUT), quantity, unit, transactionDate, notes (optional)
- **Indexes**: projectId + materialId, projectId + transactionDate

### Invoice Counter Model
- **Collection**: `invoicecounters`
- **Fields**: year, counter (for invoice number generation)

### Counter Model (for OffSite ID generation)
- **Collection**: `counters`
- **Fields**: type, count (for generating unique OffSite IDs)

### Purchase History Model
- **Collection**: `purchasehistories`
- **Fields**: projectId, materialRequestId, materialId, materialName, qty, unit, gstRate, gstAmount, basePrice, totalCost, sentAt, sentBy, receivedAt, receivedBy, proofPhotoUrl, geoLocation, coordinates (Point), status
- **Indexes**: projectId + sentAt, materialRequestId, status

### Contractor Model
- **Collection**: `contractors`
- **Fields**: userId, assignedProjects[], contracts[] (projectId, labourCountPerDay, ratePerLabourPerDay, gstRate, startDate, endDate, isActive)
- **Indexes**: userId

### Labour Model
- **Collection**: `labours`
- **Fields**: contractorId, name, code, faceImageUrl, faceEmbedding (placeholder), projectId, isActive
- **Indexes**: contractorId, projectId, code (unique)

### Labour Attendance Model
- **Collection**: `labourattendances`
- **Fields**: labourId, contractorId, projectId, date, present, groupPhotoUrl, detectedAt, coordinates (Point)
- **Indexes**: contractorId + date, projectId + date

### Contractor Invoice Model
- **Collection**: `contractorinvoices`
- **Fields**: contractorId, projectId, weekStartDate, weekEndDate, labourCountTotal, ratePerLabour, taxableAmount, gstRate, gstAmount, totalAmount, status, approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason, sentToOwner, invoiceNumber
- **Indexes**: contractorId + weekStartDate, projectId + status, invoiceNumber

### Tool Model
- **Collection**: `tools`
- **Fields**: toolId (unique), name, description, category, status, currentHolderWorkerId, currentHolderName, currentProjectId, issuedAt, history[] (action, workerId, workerName, projectId, timestamp, notes), createdBy
- **Indexes**: toolId, status, currentHolderWorkerId

### Permit Model
- **Collection**: `permits`
- **Fields**: projectId, requestedBy, taskDescription, hazardType, safetyMeasures[], status, approvedBy, approvedAt, otp, otpGeneratedAt, otpExpiresAt, otpUsed, workStartedAt, completedAt, notes
- **Indexes**: projectId + status, requestedBy + status

### Petty Cash Model
- **Collection**: `pettycashes`
- **Fields**: projectId, submittedBy, amount, description, category, receiptPhotoUrl, geoLocation, coordinates (Point), distanceFromSite, geoFenceValid, status, pmApprovedBy, pmApprovedAt, ownerApprovedBy, ownerApprovedAt, rejectedBy, rejectedAt, rejectionReason
- **Indexes**: projectId + status, submittedBy + createdAt

---

## Authentication & Authorization

### Authentication
- **JWT-based authentication** with access and refresh tokens
- Access token expiry: 15 minutes (configurable)
- Refresh token expiry: 7 days (configurable)
- Password hashing using bcrypt (salt rounds: 10)

### Authorization
**Role-Based Access Control (RBAC):**

**Engineer Permissions:**
- ✅ Create DPR
- ✅ Update task status
- ✅ Mark attendance
- ✅ Raise material requests
- ✅ View own submitted data
- ✅ Confirm material receipt
- ✅ Request permits
- ✅ Verify permit OTP

**Manager Permissions:**
- ✅ View all DPRs
- ✅ View attendance summaries
- ✅ Monitor task progress
- ✅ View AI insights
- ✅ Approve material requests
- ✅ Add comments
- ✅ View global dashboards
- ✅ Export reports
- ✅ Send notifications
- ✅ Approve/reject permits (Safety Officer)
- ✅ Approve/reject contractor invoices
- ✅ Submit petty cash expenses

**Purchase Manager Permissions:**
- ✅ View approved purchase requests
- ✅ Send materials
- ✅ View purchase history
- ✅ Manage tools (issue/return)

**Contractor Permissions:**
- ✅ Register labours with face photos
- ✅ Mark labour attendance
- ✅ Generate weekly invoices
- ✅ View own invoices
- ✅ Manage tools (issue/return)

**Owner Permissions:**
- ✅ All manager permissions
- ✅ Manage contractors
- ✅ Assign contractors to projects
- ✅ Define labour contracts
- ✅ View all contractor invoices
- ✅ Approve/reject petty cash expenses
- ✅ View financial dashboards (contractor costs, purchase costs, GST)
- ✅ Create projects
- ✅ Archive projects
- ✅ Manage users
- ✅ View invoices
- ✅ Manage invoices
- ✅ Manage system config
- ✅ Set approval rules

### Permission Checks
- Middleware: `authenticateUser` - Validates JWT token
- Middleware: `authorizeRoles` - Checks user role
- Middleware: `authorizePermission` - Checks specific permission

---

## Offline Support

### Frontend Offline Architecture

**IndexedDB Storage:**
- Database name: `offsite-db`
- Version: 2
- Stores:
  - `dprs` - DPR data with photos
  - `attendance` - Check-in/check-out records
  - `materials` - Material requests
  - `aiCache` - Cached AI responses (1 hour TTL)

**Offline Features:**
- Data is saved to IndexedDB when offline
- Automatic sync when connection is restored
- Manual sync via Sync Page
- Conflict resolution handling
- Sync status tracking

**Connectivity Detection:**
- Browser online/offline events
- API ping verification (3 second timeout)
- Periodic connectivity checks (every 30 seconds)
- Visual offline banner

**Sync Process:**
1. User creates DPR/attendance/material request offline
2. Data saved to IndexedDB with `synced: false`
3. When online, data is sent to `/api/sync/batch`
4. Server processes and marks as synced
5. Frontend updates IndexedDB records

### Backend Sync Support
- Batch sync endpoint: `POST /api/sync/batch`
- Handles DPRs, attendance, and material requests
- Conflict resolution logic
- Cleanup of old unsynced data (30+ days) via cron job

---

## AI Features

### AI Services

**Supported Providers:**
- OpenAI
- Azure OpenAI 
- Google Gemini
- HuggingFace

**Configuration:**
- Provider selection via `LLM_PROVIDER` environment variable
- API keys configured per provider

### AI-Powered Features

**1. DPR Summaries**
- Generate AI summaries from DPR photos and notes
- Endpoint: `GET /api/insights/ai/dpr-summary`

**2. Site Health Explanations**
- AI explanations for health score calculations
- Endpoint: `GET /api/insights/ai/health-explanation`

**3. Delay Risk Explanations**
- AI explanations for delay risk assessments
- Endpoint: `GET /api/insights/ai/delay-risk-explanation`

**4. Material Anomaly Explanations**
- AI explanations for detected material anomalies
- Endpoint: `GET /api/insights/ai/material-anomaly-explanation`

**5. Site Risk Assessment**
- Comprehensive risk analysis for projects
- Endpoint: `GET /api/ai/site-risk/:siteId`

**6. Anomaly Detection**
- Detect anomalies in project data
- Endpoint: `GET /api/ai/anomalies/:siteId`

**7. RAG (Retrieval Augmented Generation)**
- Document-based context for AI responses
- Documents stored in `backend/rag-docs/`:
  - `attendance-policy.md`
  - `material-usage-norms.md`
  - `project-guidelines.md`

### AI Caching
- Frontend caches AI responses in IndexedDB
- Cache TTL: 1 hour
- Reduces API calls and improves performance

---

## API Endpoints

### Base URL
- Development: `http://localhost:3000/api`
- Production: Configured via `VITE_API_URL` environment variable

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <access_token>
```

### Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Format
```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

### Rate Limiting
- Auth endpoints: 100 requests per 15 minutes per IP
- Other endpoints: Standard rate limiting applied

---

## Configuration

### Backend Environment Variables

**Server:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `CORS_ORIGIN` - Allowed CORS origin

**Database:**
- `MONGODB_URI` - MongoDB connection string

**JWT:**
- `JWT_ACCESS_SECRET` - Access token secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `JWT_ACCESS_EXPIRY` - Access token expiry (default: 15m)
- `JWT_REFRESH_EXPIRY` - Refresh token expiry (default: 7d)

**Cloudinary:**
- `CLOUDINARY_URL` - Cloudinary connection string
- `CLOUDINARY_CLOUD_NAME` - Cloud name
- `CLOUDINARY_API_KEY` - API key
- `CLOUDINARY_API_SECRET` - API secret

**Email (Gmail SMTP):**
- `GMAIL_USER` - Gmail username
- `GMAIL_PASS` - Gmail app password
- `EMAIL_FROM` - From email address

**AI Services:**
- `LLM_PROVIDER` - Provider (openai/gemini/azure)
- `OPENAI_API_KEY` - OpenAI API key
- `GEMINI_API_KEY` - Gemini API key
- `AZURE_OPENAI_ENDPOINT` - Azure endpoint
- `AZURE_OPENAI_API_KEY` - Azure API key
- `HUGGINGFACE_API_KEY` - HuggingFace API key

**MapTiler:**
- `MAPTILER_API_KEY` - MapTiler API key

**Rate Limiting:**
- `RATE_LIMIT_WINDOW_MS` - Window in milliseconds (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

### Frontend Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:3000/api)
- `VITE_MAPTILER_KEY` - MapTiler API key for maps

### Cron Jobs

**Daily Health Score Recalculation:**
- Schedule: 2 AM daily
- Recalculates health scores for all active projects

**Daily Delay Risk Alerts:**
- Schedule: 8 AM daily
- Generates delay risk alerts for high-risk projects

**Weekly Data Cleanup:**
- Schedule: 3 AM every Sunday
- Cleans up unsynced data older than 30 days

---

## Security Features

1. **Helmet.js** - Security headers
2. **CORS** - Cross-origin resource sharing configuration
3. **Rate Limiting** - Prevents abuse
4. **Password Hashing** - bcrypt with salt
5. **JWT Tokens** - Secure authentication
6. **Input Validation** - Express-validator
7. **File Upload Limits** - 5MB per file, 6 files max for DPRs
8. **Role-Based Access Control** - Permission-based authorization

---

## Utilities

### Backend Utilities

**Logger** (`utils/logger.ts`)
- Structured logging with different levels
- Console and file output

**Mailer** (`utils/mailer.ts`)
- Email sending via Nodemailer
- Password reset emails
- Notification emails

**JWT** (`utils/jwt.ts`)
- Token generation and verification
- Access and refresh token management

**Site Health** (`utils/siteHealth.ts`)
- Calculate project health scores (0-100)
- Based on attendance, DPRs, tasks, materials

**Delay Predictor** (`utils/delayPredictor.ts`)
- Predict project delay risks
- Risk levels: Low, Medium, High

**Anomaly Detector** (`utils/anomalyDetector.ts`)
- Detect anomalies in material requests
- Pattern recognition

**Generate OffSite ID** (`utils/generateOffsiteId.ts`)
- Generate unique OffSite IDs (OSSE0023, OSPM0042, OSOW0001)
- Format: OS + Role prefix + Sequential number

**Permissions** (`utils/permissions.ts`)
- Permission mapping for roles
- Permission checking utilities

**Cron Jobs** (`utils/cronJobs.ts`)
- Scheduled background tasks
- Health score recalculation
- Delay risk alerts
- Data cleanup

### Frontend Utilities

**API Client** (`lib/api.ts`)
- Centralized API request handling
- Automatic token injection
- Error handling
- Response parsing

**IndexedDB** (`lib/indexeddb.ts`)
- Offline data storage
- Sync status tracking
- Cache management

**Permissions** (`lib/permissions.ts`)
- Frontend permission checking
- Role-based UI rendering

**Utils** (`lib/utils.ts`)
- Common utility functions
- Class name merging (cn function)

---

## PWA Features

1. **Service Worker** - Offline support and caching
2. **Manifest** - App metadata and icons
3. **Installable** - Can be installed on mobile devices
4. **Offline First** - Works without internet connection
5. **Responsive Design** - Mobile-first UI

---

## File Upload

**Cloudinary Integration:**
- Photo uploads for DPRs
- Work stoppage evidence photos
- Automatic URL generation
- Image optimization

**Upload Limits:**
- Max file size: 5MB per file
- Max files per DPR: 6 photos
- Supported formats: Images (JPEG, PNG, etc.)

---

## Email Functionality

**Password Reset Flow:**
1. User requests password reset
2. System generates reset token
3. Email sent with reset link
4. User clicks link and resets password
5. Token expires after configured time

**Email Configuration:**
- SMTP: Gmail (configurable)
- App password required for Gmail
- HTML email templates

---

## Map Integration

**MapTiler:**
- Reverse geocoding (coordinates → address)
- Location services for attendance
- Map display in frontend (if implemented)

---

## Notes

- All timestamps are stored in UTC
- Dates are displayed in user's local timezone
- Health scores are recalculated daily via cron job
- Invoice numbers are generated sequentially per financial year
- OffSite IDs are immutable once assigned
- Finalized invoices cannot be modified (except payment status)
- AI responses are cached for 1 hour to reduce API calls
- Old unsynced data (30+ days) is automatically cleaned up

---

## Development

### Backend Setup
```bash
cd backend
npm install
npm run dev  # Development mode with hot reload
npm run build  # Build for production
npm start  # Run production build
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Development server
npm run build  # Build for production
npm run preview  # Preview production build
```

### Database Setup
- MongoDB required
- Connection string in `MONGODB_URI`
- Collections created automatically on first use

---

## Summary

**OffSite** is a comprehensive construction management platform with:

- **5 User Roles**: Engineer, Manager, Owner, Purchase Manager, Contractor
- **20+ Backend Modules**: Authentication, Projects, Tasks, DPRs, Attendance, Materials, Invoicing, Purchase, Contractor, Tools, Permits, Petty Cash, and more
- **24+ Frontend Pages**: Role-specific dashboards, operational pages, and management interfaces
- **Offline-First Architecture**: IndexedDB, Service Workers, PWA capabilities
- **AI-Powered Features**: DPR summaries, health explanations, risk assessments, anomaly detection
- **GST-Compliant Invoicing**: Multi-type GST support with PDF generation
- **Real-time Notifications**: Role-based notification system
- **Native Android App**: Via Capacitor with camera and geolocation support
- **Multi-language Support**: English, Hindi, Tamil, Bengali

---

This documentation covers all features and functionality present in the OffSite codebase as of the current implementation.

