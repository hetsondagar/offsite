# OffSite - Complete Features List

This document provides a comprehensive list of all features implemented in the OffSite construction management application.

## Table of Contents
1. [Core Features](#core-features)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Authentication & Security](#authentication--security)
4. [Project Management](#project-management)
5. [Daily Operations](#daily-operations)
6. [Material Management](#material-management)
7. [Analytics & Insights](#analytics--insights)
8. [Financial Management](#financial-management)
9. [Communication & Collaboration](#communication--collaboration)
10. [Mobile & Offline Support](#mobile--offline-support)
11. [Internationalization](#internationalization)
12. [Deployment & Infrastructure](#deployment--infrastructure)

---

## Core Features

### ✅ User Management
- User registration with role assignment
- Email/password authentication
- Password reset via email
- Profile management
- Unique OffSite ID generation (OSSE, OSPM, OSOW format)
- User search by OffSite ID

### ✅ Role-Based Access Control (RBAC)
- Three distinct roles: Engineer, Manager, Owner
- Granular permission system
- Role-based UI rendering
- Self-approval prevention
- Project-level access control

### ✅ Multi-Project Support
- Create and manage multiple projects
- Project member management
- Project invitations system
- Project status tracking (planning, active, on-hold, completed, archived)
- Project health scoring

---

## User Roles & Permissions

### Engineer Role
**Capabilities:**
- ✅ Create Daily Progress Reports (DPRs) with photos
- ✅ Mark GPS-based attendance (check-in/check-out)
- ✅ Raise material requests
- ✅ Update assigned task status
- ✅ View own submitted data
- ❌ Cannot approve material requests
- ❌ Cannot view all DPRs
- ❌ Cannot access insights/analytics
- ❌ Cannot manage projects or users

**Accessible Pages:**
- Engineer Dashboard
- DPR Page
- Attendance Page
- Materials Page
- Tasks Page (view and update assigned tasks)
- Profile Page
- Sync Page

### Manager Role
**Capabilities:**
- ✅ View all DPRs across assigned projects
- ✅ Approve/reject material requests
- ✅ View attendance summaries
- ✅ Monitor task progress
- ✅ View AI insights and analytics
- ✅ Add comments on DPRs and tasks
- ✅ Create and manage events
- ✅ Send notifications
- ✅ Export reports
- ❌ Cannot create DPRs
- ❌ Cannot mark attendance
- ❌ Cannot raise material requests
- ❌ Cannot view/manage invoices
- ❌ Cannot modify projects or users

**Accessible Pages:**
- Manager Dashboard
- Projects Page
- Approvals Page
- Insights Page
- AI Command Center
- Tasks Page (view all, create tasks)
- Events Page
- Profile Page
- Sync Page

### Owner Role
**Capabilities:**
- ✅ All Manager capabilities
- ✅ Create and manage projects
- ✅ View and manage invoices
- ✅ Manage users
- ✅ System configuration access
- ✅ Global analytics and dashboards
- ✅ Export comprehensive reports
- ❌ Cannot create DPRs
- ❌ Cannot mark attendance
- ❌ Cannot raise material requests
- ❌ Cannot approve material requests (delegated to managers)

**Accessible Pages:**
- Manager Dashboard (with additional features)
- Projects Page (with creation capabilities)
- Approvals Page
- Insights Page
- AI Command Center
- Invoicing Page
- Tasks Page
- Events Page
- Profile Page
- Sync Page

---

## Authentication & Security

### ✅ Authentication Features
- Email/password login
- JWT-based authentication (access + refresh tokens)
- Password reset via email with secure tokens
- Session persistence
- Automatic token refresh
- Secure password hashing (bcrypt)

### ✅ Security Features
- Helmet.js security headers
- CORS configuration
- Rate limiting on auth routes
- Input validation with Zod
- File upload limits (5MB per file, 6 files max)
- Role-based authorization middleware
- Self-approval prevention
- Secure file uploads to Cloudinary

---

## Project Management

### ✅ Project Features
- Create projects (Owner only)
- View all assigned projects
- Project detail view with comprehensive information
- Project status management
- Progress tracking (0-100%)
- Health score calculation (0-100)
- Project member management
- Project invitations by OffSite ID
- Accept/reject project invitations

### ✅ Task Management
- Create tasks (Managers/Owners)
- Assign tasks to engineers
- Task status tracking (pending, in-progress, completed)
- Task filtering by project and status
- Due date tracking
- Planned labour count
- Task progress monitoring

---

## Daily Operations

### ✅ Daily Progress Reports (DPR)
- Multi-step DPR creation:
  1. Project selection
  2. Task selection
  3. Photo upload (up to 6 photos, 5MB each)
  4. Notes entry
  5. Work stoppage tracking (optional)
  6. Review and submit
- AI-generated summaries (optional)
- Work stoppage tracking with:
  - Reasons (material delay, labour shortage, weather, machine breakdown, approval pending, safety issue)
  - Duration in hours
  - Remarks
  - Evidence photos
- DPR history viewing
- Project-based DPR filtering
- All DPRs page for managers/owners
- Offline support with IndexedDB

### ✅ Attendance Management
- GPS-based check-in/check-out
- Location reverse geocoding (MapTiler)
- Location display (formatted address)
- Attendance history by project
- Work duration calculation
- Offline support with IndexedDB
- Native GPS support via Capacitor (Android)

---

## Material Management

### ✅ Material Catalog
- Pre-seeded with 24+ realistic Indian construction materials
- Categories:
  - Cement & Aggregates (OPC Cement, PPC Cement, River Sand, M-Sand, Aggregates)
  - Steel & Metals (TMT Steel, Binding Wire, Structural Steel)
  - Bricks & Blocks (Red Clay Bricks, Fly Ash Bricks, AAC Blocks)
  - Concrete & Chemicals (Ready Mix Concrete M20/M25, Waterproofing, Curing Compound)
  - Wood & Fixtures (Plywood, Door Frame, Window Frame)
  - Electrical (Copper Wire, Switch Socket, Distribution Board)
  - Plumbing (PVC Pipes, Water Tap)
- Each material includes:
  - Name
  - Category
  - Unit of measurement (bag, kg, ton, nos, meter, sqm, cum, liter)
  - Approximate price in INR
  - Price unit
  - Active status

### ✅ Material Requests
- Create material requests from catalog
- Quantity validation based on unit type:
  - Integer quantities for `bag` and `nos`
  - Decimal quantities for `kg`, `ton`, `meter`, `sqm`, `cum`, `liter`
- Estimated cost calculation (quantity × price)
- Anomaly detection (flags unusual requests)
- Request approval workflow
- Request history
- Offline support with IndexedDB

### ✅ Material Approvals
- View pending material requests
- Approve/reject requests
- Rejection reason requirement
- Self-approval prevention
- Approval notifications
- Project-based filtering
- Anomaly status indicators

### ✅ Stock Management
- Stock ledger system
- Track material stock levels per project
- Stock in/out transactions
- Current stock balance calculation
- Stock alerts for low inventory
- Project-based stock tracking

---

## Analytics & Insights

### ✅ Site Health Score
- Overall project health (0-100 scale)
- Calculated based on:
  - Attendance patterns
  - DPR submission frequency
  - Task completion rates
  - Material request patterns
  - Work stoppage frequency
- Color-coded visualization (Green/Yellow/Red)
- Daily recalculation via cron job
- Historical trends

### ✅ Delay Risk Assessment
- Predicts project delay risks
- Risk levels: Low, Medium, High
- Analyzes:
  - Task completion rates
  - Work stoppage frequency
  - Material approval delays
  - Labour availability
- Provides risk causes and mitigation recommendations

### ✅ Material Anomalies Detection
- Identifies unusual material request patterns
- Compares with historical usage
- Flags excessive quantities
- Provides anomaly explanations
- AI-powered anomaly analysis

### ✅ Labour Gap Analysis
- Compares planned vs actual labour
- Identifies labour shortages
- Tracks attendance patterns
- Calculates labour gaps
- Provides staffing recommendations

### ✅ Approval Delay Tracking
- Tracks time from request to approval
- Identifies bottlenecks
- Measures average approval time
- Flags delayed approvals
- Process improvement insights

### ✅ AI Command Center
- Centralized AI-powered insights
- Site risk assessment visualization
- Anomaly detection results
- Real-time updates (auto-refresh every 60 seconds)
- Project-specific analysis
- Cached responses (1 hour TTL)
- Risk level indicators
- Detailed risk breakdown

### ✅ AI-Powered Features
- DPR summary generation
- Health score explanations
- Delay risk explanations
- Material anomaly explanations
- Site risk assessment
- Support for multiple AI providers:
  - OpenAI
  - Azure OpenAI
  - Google Gemini
  - HuggingFace

---

## Financial Management

### ✅ GST-Compliant Invoicing
- Create invoices (Owner only)
- GST calculation:
  - CGST/SGST for intra-state transactions
  - IGST for inter-state transactions
- Default GST rate: 18%
- Invoice number generation (format: OS/INV/2024-25/0001)
- Invoice finalization (makes invoice immutable)
- Payment status tracking (UNPAID, PARTIALLY_PAID, PAID)
- Supplier and client information management
- Billing period selection
- PDF invoice generation and download
- Invoice history and filtering

---

## Communication & Collaboration

### ✅ Events Management
- Create events (meetings, inspections, deliveries, safety, maintenance, other)
- Event scheduling with start/end dates
- Location specification
- Attendee management
- Event reminders
- Event status tracking (scheduled, in-progress, completed, cancelled)
- Calendar view
- Project-based filtering

### ✅ Notifications
- Real-time notification delivery
- Notification types:
  - Material request notifications
  - Approval/rejection notifications
  - DPR submission notifications
  - Task assignment notifications
  - Project update notifications
  - System alerts
- Notification bell with unread count
- Mark as read functionality
- Bulk notification creation (Managers/Owners)
- User search by OffSite ID for notifications

---

## Mobile & Offline Support

### ✅ Progressive Web App (PWA)
- Service Worker for offline caching
- App manifest for installability
- Offline-first architecture
- Responsive mobile-first design
- Installable on mobile devices

### ✅ Android Native App (Capacitor)
- Native Android application
- App ID: `com.offsite.app`
- Capacitor plugins:
  - Geolocation (GPS attendance)
  - Camera (DPR photo capture)
  - Network (connectivity detection)
  - Preferences (secure storage)
- Unified API wrappers for web and native
- All web features work in native app

### ✅ Offline Capabilities
- IndexedDB for local data storage
- Offline DPR creation
- Offline attendance marking
- Offline material requests
- Automatic sync when online
- Manual sync trigger
- Sync status tracking
- Conflict resolution
- Pending items queue
- Last sync timestamp

### ✅ Data Synchronization
- Batch synchronization endpoint
- Automatic background sync
- Manual sync via Sync Page
- Sync status indicators
- Conflict resolution handling
- Error handling and retry
- Sync history

---

## Internationalization

### ✅ Multilingual Support
- **4 Languages Supported:**
  - English (en) - Default
  - Hindi (hi) - हिंदी
  - Marathi (mr) - मराठी
  - Tamil (ta) - தமிழ்

### ✅ Translation Features
- Complete UI translation for all languages
- Language selector in Settings/Profile
- Persistent language preference (localStorage)
- Automatic device locale detection
- Real-time language switching
- Native language names in selector
- All pages, components, and UI elements translated

### ✅ Translated Sections
- Authentication (login, signup, password reset)
- Dashboards (engineer and manager)
- DPR creation and viewing
- Attendance tracking
- Material requests and approvals
- Projects and tasks
- Insights and AI features
- Invoicing
- Events
- Profile and settings
- Common UI elements (buttons, labels, messages, toasts)

---

## Deployment & Infrastructure

### ✅ Backend Deployment (Render)
- Deployed on Render.com
- MongoDB Atlas for database
- Environment variables configured
- Health check endpoint (`/api/health`)
- CORS configured for multiple origins
- Server listens on `0.0.0.0`
- Production-ready configuration

### ✅ Frontend Deployment (Vercel)
- Deployed on Vercel
- Production build optimized
- Environment variables configured
- API URL pointing to Render backend
- Static asset caching configured
- SPA routing configured

### ✅ Database
- MongoDB with Mongoose ODM
- MongoDB Atlas for production
- Automatic collection creation
- Indexed collections for performance
- Data models with validation

### ✅ File Storage
- Cloudinary for photo uploads
- Automatic image optimization
- CDN delivery
- Secure access
- Photo URLs stored in database

### ✅ Background Jobs (Cron)
- Daily health score recalculation (2 AM)
- Daily delay risk alerts (8 AM)
- Weekly data cleanup (Sunday 3 AM)

---

## Technical Features

### ✅ Code Quality
- TypeScript for type safety
- ESLint for code linting
- Consistent code style
- Modular architecture
- Error handling middleware
- Request logging

### ✅ Performance
- Code splitting
- Lazy loading
- Image optimization
- Cached AI responses (1 hour TTL)
- Efficient data fetching
- Bundle optimization

### ✅ User Experience
- Dark/Light theme support
- Smooth animations (Framer Motion)
- Loading states and skeletons
- Error boundaries
- Toast notifications
- Form validation
- Responsive design

---

## Summary

**Total Features: 100+**

The OffSite application is a comprehensive, production-ready construction management platform with:

- ✅ **3 User Roles** with distinct permissions
- ✅ **20+ Pages** covering all aspects of construction management
- ✅ **15+ Backend Modules** with full CRUD operations
- ✅ **4 Languages** with complete translation
- ✅ **Native Android App** via Capacitor
- ✅ **Offline-First Architecture** with IndexedDB
- ✅ **AI-Powered Insights** with multiple provider support
- ✅ **GST-Compliant Invoicing** with PDF generation
- ✅ **Real-time Notifications** system
- ✅ **Comprehensive Analytics** and reporting

All features are implemented, tested, and ready for production use.

---

*Last Updated: 2024*
