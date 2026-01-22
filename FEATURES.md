# OffSite - Features & Functionality Documentation

## Table of Contents
1. [Overview](#overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Authentication Features](#authentication-features)
4. [Dashboard Features](#dashboard-features)
5. [Daily Progress Reports (DPR)](#daily-progress-reports-dpr)
6. [Attendance Management](#attendance-management)
7. [Material Requests & Approvals](#material-requests--approvals)
8. [Project Management](#project-management)
9. [Task Management](#task-management)
10. [Insights & Analytics](#insights--analytics)
11. [AI-Powered Features](#ai-powered-features)
12. [Invoicing](#invoicing)
13. [Events Management](#events-management)
14. [Notifications](#notifications)
15. [Offline Capabilities](#offline-capabilities)
16. [Profile Management](#profile-management)
17. [Sync & Data Synchronization](#sync--data-synchronization)

---

## Overview

OffSite is a mobile-first construction field operations management application designed to streamline daily operations on construction sites. The application provides comprehensive tools for tracking progress, managing attendance, handling material requests, generating insights, and maintaining compliance with GST invoicing requirements.

**Key Capabilities:**
- Real-time progress tracking with photo documentation
- GPS-based attendance tracking
- Material request and approval workflows
- AI-powered insights and recommendations
- Offline-first operation for low-connectivity environments
- Role-based access control for different user types
- GST-compliant invoicing

---

## User Roles & Permissions

### Engineer Role
**Primary Responsibilities:**
- Create daily progress reports (DPRs) with photos
- Mark attendance (check-in/check-out) using GPS
- Raise material requests
- Update task status
- View own submitted data

**Access:**
- Engineer Dashboard
- DPR creation page
- Attendance page
- Materials request page
- Tasks page (view and update assigned tasks)
- Profile page
- Sync page

**Restrictions:**
- Cannot approve material requests
- Cannot view all DPRs across projects
- Cannot access insights and analytics
- Cannot create projects or manage users

### Manager Role
**Primary Responsibilities:**
- Approve or reject material requests
- View all DPRs and attendance summaries
- Monitor task progress across projects
- View AI-powered insights and analytics
- Send notifications to team members
- Export reports

**Access:**
- Manager Dashboard
- Projects page (view all assigned projects)
- Approvals page
- Insights page
- Tasks page (view all tasks, create tasks)
- Events page
- Notifications page
- Profile page
- Sync page

**Restrictions:**
- Cannot create DPRs or mark attendance
- Cannot raise material requests
- Cannot create projects
- Cannot manage invoices
- Cannot manage users

### Owner Role
**Primary Responsibilities:**
- Full system access
- Create and manage projects
- Create and manage invoices
- Manage users
- View all insights and analytics
- Set approval rules
- Manage system configuration

**Access:**
- Manager Dashboard (with additional features)
- All project management features
- Invoicing page
- User management capabilities
- System configuration access
- All manager features plus additional administrative functions

**Special Capabilities:**
- Project creation and member management
- Invoice creation and finalization
- User management
- System-wide settings

---

## Authentication Features

### User Registration
**Signup Process:**
1. Enter name, email, and password
2. Optionally provide phone number
3. Select role (Engineer, Manager, or Owner)
4. System generates unique OffSite ID (format: OSSE0023 for engineers, OSPM0042 for managers, OSOW0001 for owners)
5. Account is created and user can log in

**Features:**
- Email validation
- Password strength requirements (minimum 6 characters)
- Unique email enforcement
- Automatic OffSite ID generation
- Role assignment

### User Login
**Login Process:**
1. Enter email and password
2. System validates credentials
3. JWT tokens are issued (access token and refresh token)
4. User is redirected to role-appropriate dashboard
5. Session is maintained via tokens

**Features:**
- Secure password authentication
- Token-based session management
- Automatic role-based redirection
- Persistent login sessions

### Password Reset
**Password Reset Flow:**
1. User clicks "Forgot Password" on login page
2. Enters email address
3. System generates secure reset token
4. Email is sent with reset link (valid for 15 minutes)
5. User clicks link and is redirected to reset password page
6. User enters new password
7. Password is updated and user can log in

**Features:**
- Secure token generation
- Time-limited reset links (15 minutes)
- Email notifications
- Secure password update process

### Profile Management
**User Profile Features:**
- View profile information (name, email, phone, role, OffSite ID)
- Update profile information (name, phone)
- View assigned projects
- Cannot change email or role (system-managed)
- Cannot change OffSite ID (immutable)

---

## Dashboard Features

### Engineer Dashboard
**Overview Section:**
- **Today's Attendance Status**: Shows current check-in status with timestamp and location
- **Today's Task**: Displays currently assigned task with progress percentage
- **Pending Material Requests**: Shows count of pending requests and material names

**Quick Actions:**
- **Create DPR**: Large button to quickly start a new daily progress report
- **Mark Attendance**: Quick access to check-in/check-out functionality
- **Request Materials**: Direct access to material request form

**Recent Activity Feed:**
- Chronological list of recent actions
- DPR submissions with timestamps
- Material request status updates
- Attendance records
- Status indicators (success, pending, synced)

**Header Features:**
- Current date and time display
- Theme toggle (dark/light mode)
- Notification bell with unread count
- Offline status indicator

### Manager/Owner Dashboard
**Site Health Overview:**
- **Health Score Ring**: Circular progress indicator showing overall site health (0-100)
  - Color-coded: Green (80-100), Yellow (50-79), Red (0-49)
  - Animated display
  - Click to view detailed breakdown

**Project Summary Cards:**
- List of all assigned projects
- Each card shows:
  - Project name and location
  - Current status (active, on-hold, completed)
  - Progress percentage
  - Health score
  - Quick access to project details

**Pending Approvals:**
- Count of pending material requests
- Quick access to approvals page
- Priority indicators

**Key Metrics:**
- Total active projects
- Total team members
- Recent DPR submissions
- Attendance summary

**Quick Actions:**
- View Insights
- Manage Approvals
- Create Event
- View Projects

**Recent Activity:**
- System-wide activity feed
- Project updates
- Material request approvals/rejections
- Task completions

---

## Daily Progress Reports (DPR)

### DPR Creation Process
**Multi-Step Form:**

**Step 1: Project Selection**
- Select project from assigned projects list
- View project details (location, status)
- Filter by active projects

**Step 2: Task Selection**
- Select task from project's task list
- View task details (description, due date, status)
- Filter by task status

**Step 3: Photo Upload**
- Upload up to 6 photos
- Maximum 5MB per photo
- Photo preview before upload
- Remove photos before submission
- Photos are automatically optimized and stored in cloud

**Step 4: Notes Entry**
- Optional text field for progress notes
- Describe work completed
- Mention any issues or observations
- Character limit for optimal performance

**Step 5: Work Stoppage Tracking (Optional)**
- Toggle to indicate if work stoppage occurred
- If yes, select reason:
  - Material Delay
  - Labour Shortage
  - Weather Conditions
  - Machine Breakdown
  - Approval Pending
  - Safety Issue
- Enter duration in hours
- Add remarks explaining the stoppage
- Upload evidence photos (optional, up to 6 photos)

**Step 6: Review & Submit**
- Review all entered information
- Preview uploaded photos
- Edit any section before submission
- Submit DPR
- System saves to local storage if offline
- Automatic sync when connection is restored

### DPR Features
**AI Summary Generation:**
- Optional AI-generated summary of DPR
- Analyzes photos and notes
- Provides concise progress description
- Can be regenerated if needed

**DPR History:**
- View all previously submitted DPRs
- Filter by project and date
- View photos, notes, and summaries
- See work stoppage records
- Export DPR data

**Offline Support:**
- DPRs can be created offline
- Stored locally in IndexedDB
- Automatically synced when online
- Visual indicator for sync status

**Photo Management:**
- Cloud storage for all photos
- Automatic optimization
- Fast loading with CDN
- Secure access

---

## Attendance Management

### Check-In Process
**GPS-Based Check-In:**
1. User navigates to Attendance page
2. System requests GPS location permission
3. Current location is captured (latitude, longitude)
4. Location is reverse geocoded to human-readable address
5. User selects project
6. Check-in is recorded with:
   - Timestamp
   - GPS coordinates
   - Formatted address
   - Project ID
7. Check-in is saved (locally if offline)

**Check-In Features:**
- Real-time GPS location capture
- Automatic address conversion
- Project selection
- Timestamp recording
- Offline support with local storage

### Check-Out Process
**GPS-Based Check-Out:**
1. User navigates to Attendance page
2. System shows current check-in status
3. User clicks check-out button
4. System captures current GPS location
5. Location is reverse geocoded
6. Check-out is recorded with timestamp and location
7. Total work hours are calculated

**Check-Out Features:**
- Automatic work duration calculation
- Location verification
- Timestamp recording
- Project association

### Attendance History
**Viewing Attendance:**
- View all attendance records by project
- Filter by date range
- See check-in and check-out times
- View locations on map (if available)
- Export attendance data
- Calculate total work hours per day/week/month

**Attendance Features:**
- Chronological list of records
- Location display (address and coordinates)
- Time tracking
- Project-based filtering
- Offline storage and sync

---

## Material Requests & Approvals

### Creating Material Requests
**Request Process:**
1. Navigate to Materials page
2. Browse materials catalog
3. Select material from catalog
4. Enter quantity and unit
5. Provide reason for request
6. Select project
7. Submit request
8. System checks for anomalies (unusual quantities)
9. Request is saved and sent for approval

**Material Catalog:**
- Browse available materials
- Search by name or category
- View material details
- See unit of measurement
- View material descriptions

**Anomaly Detection:**
- System automatically detects unusual requests
- Compares with historical usage patterns
- Flags requests that exceed normal thresholds
- Provides anomaly reason
- Managers are notified of anomalies

**Request Features:**
- Material selection from catalog
- Quantity and unit specification
- Reason requirement
- Project association
- Anomaly detection
- Offline support

### Approval Workflow
**For Managers:**
1. Navigate to Approvals page
2. View all pending material requests
3. See request details:
   - Material name and quantity
   - Requested by (engineer name and OffSite ID)
   - Project
   - Reason
   - Anomaly status (if applicable)
   - Request timestamp
4. Approve or reject request
5. If rejecting, provide rejection reason
6. System notifies requester

**Approval Features:**
- List of pending requests
- Filter by project
- Filter by anomaly status
- Approve with one click
- Reject with reason
- Self-approval prevention (users cannot approve their own requests)
- Notification to requester
- Approval history

**For Engineers:**
- View own material requests
- See approval status
- View rejection reasons (if rejected)
- Track request history
- Resubmit rejected requests (if needed)

---

## Project Management

### Viewing Projects
**Project List:**
- View all assigned projects
- Project cards showing:
  - Project name
  - Location
  - Status (planning, active, on-hold, completed, archived)
  - Progress percentage (0-100)
  - Health score (0-100)
  - Start and end dates
- Filter by status
- Search by name or location
- Sort by various criteria

**Project Detail View:**
- Comprehensive project information
- Project members list with roles
- Tasks associated with project
- DPR history
- Attendance summary
- Material requests
- Health metrics and trends
- Progress timeline

### Creating Projects (Owner Only)
**Project Creation:**
1. Navigate to Projects page
2. Click "Create Project" button
3. Enter project details:
   - Project name
   - Location
   - Start date
   - End date (optional)
   - Status
4. Save project
5. Add members to project

**Project Member Management:**
- Add members by OffSite ID
- Assign roles (engineer or manager)
- Send project invitations
- View member list
- Remove members (if needed)

### Project Invitations
**Invitation System:**
- Owners can invite users to projects
- Invite by OffSite ID
- Assign role in project
- Invited users receive notifications
- Users can accept or reject invitations
- View invitation status

**Invitation Features:**
- Send invitations by OffSite ID
- Role assignment (engineer/manager)
- Notification to invited user
- Accept/reject functionality
- Invitation history

---

## Task Management

### Creating Tasks (Managers/Owners)
**Task Creation:**
1. Navigate to Tasks page
2. Click "Create Task" button
3. Enter task details:
   - Title
   - Description (optional)
   - Project selection
   - Assign to engineer (search by OffSite ID)
   - Due date (optional)
   - Planned labour count
4. Save task
5. Assigned engineer is notified

**Task Features:**
- Project association
- Engineer assignment
- Due date tracking
- Planned labour count
- Status tracking (pending, in-progress, completed)

### Viewing Tasks
**Task List:**
- View all tasks
- Filter by project
- Filter by status
- Search tasks
- View task details:
  - Title and description
  - Assigned engineer
  - Project
  - Status
  - Due date
  - Progress

**For Engineers:**
- View assigned tasks only
- Update task status
- Mark tasks as in-progress
- Mark tasks as completed
- View task details

**For Managers/Owners:**
- View all tasks across projects
- Create new tasks
- Assign tasks to engineers
- Monitor task progress
- View task completion rates

### Task Status Updates
**Status Options:**
- **Pending**: Task not yet started
- **In-Progress**: Task is being worked on
- **Completed**: Task is finished

**Update Process:**
- Engineers can update status of assigned tasks
- Status changes are tracked
- Notifications sent to managers
- Progress is reflected in project metrics

---

## Insights & Analytics

### Site Health Score
**Health Score Calculation:**
- Overall project health (0-100 scale)
- Calculated based on:
  - Attendance patterns
  - DPR submission frequency
  - Task completion rates
  - Material request patterns
  - Work stoppage frequency
- Updated daily via automated process
- Visual representation with color coding

**Health Score Display:**
- Circular progress ring
- Color indicators:
  - Green (80-100): Healthy
  - Yellow (50-79): Needs attention
  - Red (0-49): Critical
- Detailed breakdown available
- Historical trends

### Delay Risk Assessment
**Risk Analysis:**
- Predicts project delay risks
- Analyzes:
  - Task completion rates
  - Work stoppage frequency
  - Material approval delays
  - Labour availability
- Risk levels: Low, Medium, High
- Provides risk causes
- Recommendations for mitigation

**Delay Risk Features:**
- Risk level indicators
- Cause identification
- Historical comparison
- Trend analysis
- Actionable recommendations

### Material Anomalies
**Anomaly Detection:**
- Identifies unusual material request patterns
- Compares with historical data
- Flags potential issues:
  - Excessive quantities
  - Unusual material types
  - Frequent requests
- Provides anomaly explanations

**Anomaly Features:**
- List of detected anomalies
- Anomaly reasons
- Historical comparison
- Impact assessment
- Recommendations

### Labour Gap Analysis
**Labour Analysis:**
- Compares planned vs actual labour
- Identifies labour shortages
- Tracks attendance patterns
- Calculates labour gaps
- Provides recommendations

**Labour Gap Features:**
- Planned vs actual comparison
- Gap identification
- Trend analysis
- Recommendations for staffing

### Approval Delays
**Delay Tracking:**
- Tracks time from request to approval
- Identifies bottlenecks
- Measures average approval time
- Flags delayed approvals
- Provides insights for process improvement

**Approval Delay Features:**
- Average approval time
- Delayed request identification
- Trend analysis
- Bottleneck identification

### Pending Material Requests Summary
**Summary View:**
- Count of pending requests
- Breakdown by project
- Time in pending status
- Priority indicators
- Quick access to approvals

---

## AI-Powered Features

### DPR Summaries
**AI Summary Generation:**
- Analyzes DPR photos and notes
- Generates concise progress summary
- Highlights key activities
- Identifies important observations
- Provides structured summary

**Summary Features:**
- Automatic generation (optional)
- Manual regeneration
- Photo analysis
- Note interpretation
- Key point extraction

### Health Score Explanations
**AI Explanations:**
- Explains health score calculation
- Identifies factors affecting score
- Provides context for score changes
- Suggests improvement areas
- Historical context

### Delay Risk Explanations
**Risk Analysis:**
- Explains delay risk assessment
- Identifies contributing factors
- Provides detailed risk breakdown
- Suggests mitigation strategies
- Historical comparison

### Material Anomaly Explanations
**Anomaly Analysis:**
- Explains why request is flagged as anomaly
- Compares with historical patterns
- Provides context
- Suggests verification steps
- Impact assessment

### Site Risk Assessment
**Comprehensive Risk Analysis:**
- Overall site risk evaluation
- Multiple risk factors analysis
- Risk level determination
- Detailed risk breakdown
- Recommendations

**Risk Assessment Features:**
- Multi-factor analysis
- Risk scoring
- Trend identification
- Actionable recommendations
- Historical comparison

### Anomaly Detection
**Anomaly Identification:**
- Detects unusual patterns in:
  - Material requests
  - Attendance patterns
  - DPR submissions
  - Task completions
- Provides anomaly details
- Suggests investigation steps

**Anomaly Detection Features:**
- Pattern recognition
- Anomaly classification
- Impact assessment
- Recommendations
- Historical context

### AI Command Center
**Centralized AI Features:**
- Access to all AI-powered insights
- Site risk assessment
- Anomaly detection
- Real-time updates
- Project-specific analysis
- Cached responses for performance

---

## Invoicing

### Invoice Creation (Owner Only)
**Invoice Creation Process:**
1. Navigate to Invoicing page
2. Click "Create Invoice"
3. Enter invoice details:
   - Select project
   - Billing period (from/to dates)
   - Taxable amount
   - GST rate (default 18%)
   - GST type (CGST/SGST for intra-state, IGST for inter-state)
   - Supplier details (company name, address, GSTIN, state)
   - Client details (name, address, GSTIN optional, state)
   - Notes (optional)
4. System calculates:
   - CGST and SGST (if intra-state)
   - IGST (if inter-state)
   - Total amount
5. Save as draft

**Invoice Features:**
- GST-compliant calculations
- Automatic tax computation
- Supplier and client management
- Billing period selection
- Draft mode for editing

### Invoice Finalization
**Finalization Process:**
1. Review draft invoice
2. Verify all details
3. Click "Finalize Invoice"
4. System:
   - Generates unique invoice number (format: OS/INV/2024-25/0001)
   - Marks invoice as finalized
   - Makes invoice immutable (except payment status)
   - Records finalization timestamp and user

**Finalization Features:**
- Unique invoice number generation
- Immutability after finalization
- Audit trail
- Legal compliance
- Payment status can still be updated

### Invoice Management
**Invoice List:**
- View all invoices
- Filter by project
- Filter by status (draft/finalized)
- Filter by payment status
- Search invoices
- View invoice details

**Invoice Details:**
- Complete invoice information
- Supplier and client details
- Billing period
- Tax breakdown
- Total amount
- Payment status
- Invoice number (if finalized)
- Finalization date

### Payment Status Tracking
**Payment Status Options:**
- **UNPAID**: Invoice not yet paid
- **PARTIALLY_PAID**: Partial payment received
- **PAID**: Fully paid

**Status Updates:**
- Update payment status
- Track payment history
- Record payment dates
- Generate payment reports

### PDF Download
**PDF Generation:**
- Download invoice as PDF
- GST-compliant format
- Professional layout
- Includes all invoice details
- Ready for printing or emailing

**PDF Features:**
- A4 format
- Proper formatting
- All invoice details
- Tax breakdown
- Payment status
- Professional appearance

---

## Events Management

### Creating Events
**Event Creation:**
1. Navigate to Events page
2. Click "Create Event"
3. Enter event details:
   - Title
   - Description (optional)
   - Event type (meeting, inspection, delivery, safety, maintenance, other)
   - Start date and time
   - End date and time (optional)
   - Location (optional)
   - Project selection
   - Attendees (select team members)
   - Reminders (optional)
4. Save event

**Event Types:**
- **Meeting**: Team meetings, client meetings
- **Inspection**: Site inspections, quality checks
- **Delivery**: Material deliveries, equipment delivery
- **Safety**: Safety drills, safety meetings
- **Maintenance**: Equipment maintenance, scheduled maintenance
- **Other**: Custom event types

**Event Features:**
- Multiple event types
- Date and time scheduling
- Location specification
- Attendee management
- Reminder settings
- Project association

### Viewing Events
**Event List:**
- View all events
- Filter by project
- Filter by event type
- Filter by status
- Calendar view
- List view
- Search events

**Event Details:**
- Complete event information
- Attendee list
- Location details
- Reminder information
- Status tracking

### Event Status Management
**Status Options:**
- **Scheduled**: Event is planned
- **In-Progress**: Event is currently happening
- **Completed**: Event has finished
- **Cancelled**: Event was cancelled

**Status Updates:**
- Update event status
- Track event progress
- Mark events as completed
- Cancel events if needed

### Calendar View
**Calendar Features:**
- Monthly calendar display
- Event markers on dates
- Click to view event details
- Navigate between months
- Filter by project or type

---

## Notifications

### Notification Types
**System Notifications:**
- **Material Request**: New material request created
- **Material Approved**: Material request approved
- **Material Rejected**: Material request rejected
- **DPR Submitted**: New DPR submitted
- **Task Assigned**: New task assigned
- **Task Completed**: Task marked as completed
- **Attendance Reminder**: Attendance check-in reminder
- **Project Update**: Project status or details updated
- **System Alert**: System-wide alerts
- **General**: General notifications

### Notification Features
**Receiving Notifications:**
- Real-time notification delivery
- Notification bell with unread count
- List of all notifications
- Filter by type
- Mark as read
- Mark all as read
- Notification history

**Notification Display:**
- Title and message
- Notification type icon
- Timestamp
- Read/unread status
- Action buttons (if applicable)
- Link to related content

### Sending Notifications (Managers/Owners)
**Notification Creation:**
- Create custom notifications
- Send to specific users (by OffSite ID)
- Send bulk notifications
- Select notification type
- Include custom message
- Add related data

**Bulk Notifications:**
- Send to multiple users
- Select recipients
- Custom message
- Notification type selection

### Notification Management
**For Users:**
- View all notifications
- Filter by read/unread
- Mark individual notifications as read
- Mark all as read
- Delete notifications
- Notification preferences (if available)

---

## Offline Capabilities

### Offline Data Storage
**Local Storage:**
- DPRs saved locally when offline
- Attendance records stored locally
- Material requests cached locally
- AI responses cached (1 hour TTL)
- Automatic sync when online

**Storage Features:**
- IndexedDB for persistent storage
- Automatic data persistence
- Sync status tracking
- Conflict resolution
- Data integrity maintenance

### Offline Indicators
**Status Display:**
- Visual offline banner
- Connectivity status indicator
- Sync status for each item
- Last sync timestamp
- Pending items count

**User Experience:**
- Clear offline/online status
- Pending sync items visible
- Manual sync option
- Automatic sync when online
- No data loss

### Synchronization
**Sync Process:**
1. User creates data offline (DPR, attendance, material request)
2. Data is saved to local storage
3. When connection is restored:
   - System detects online status
   - Automatically syncs pending items
   - Updates sync status
   - Resolves conflicts if any
4. User can also manually trigger sync

**Sync Features:**
- Automatic background sync
- Manual sync trigger
- Batch synchronization
- Conflict resolution
- Sync status tracking
- Error handling and retry

### Sync Page
**Sync Management:**
- View all pending items
- See sync status
- Manual sync button
- Sync history
- Last sync timestamp
- Conflict resolution UI
- Sync progress indicator

---

## Profile Management

### Viewing Profile
**Profile Information:**
- Name
- Email address
- Phone number (if provided)
- Role (Engineer, Manager, Owner)
- OffSite ID (unique identifier)
- Assigned projects list
- Account creation date

### Updating Profile
**Editable Fields:**
- Name
- Phone number

**Non-Editable Fields:**
- Email (system-managed)
- Role (system-managed)
- OffSite ID (immutable)

**Update Process:**
1. Navigate to Profile page
2. Click edit on desired field
3. Update information
4. Save changes
5. Changes are reflected immediately

### Profile Features
- View complete profile
- Update personal information
- View assigned projects
- See account details
- Change password (if implemented)

---

## Sync & Data Synchronization

### Automatic Synchronization
**Background Sync:**
- Detects when connection is restored
- Automatically syncs pending items
- Updates sync status
- Resolves conflicts
- Notifies user of sync completion

**Sync Triggers:**
- Connection restored
- App comes to foreground
- Periodic checks (if configured)
- Manual sync request

### Manual Synchronization
**Manual Sync Process:**
1. Navigate to Sync page
2. View pending items
3. Click "Sync Now" button
4. System syncs all pending items
5. Progress is displayed
6. Completion notification

**Manual Sync Features:**
- On-demand synchronization
- Progress tracking
- Error handling
- Retry failed items
- Sync history

### Sync Status
**Status Indicators:**
- **Synced**: Item successfully synced
- **Pending**: Item waiting to sync
- **Syncing**: Item currently syncing
- **Error**: Sync failed (will retry)

**Status Display:**
- Visual indicators
- Timestamp of last sync
- Count of pending items
- Error messages (if any)

### Conflict Resolution
**Conflict Handling:**
- Detects conflicts during sync
- Presents conflict resolution options
- User can choose which version to keep
- Automatic resolution for simple conflicts
- Manual resolution for complex conflicts

---

## Additional Features

### 18. Multilingual Support (i18n)

**Supported Languages:**
- **English** (en) - Default language
- **Hindi** (hi) - हिंदी
- **Marathi** (mr) - मराठी
- **Tamil** (ta) - தமிழ்

**Features:**
- Complete UI translation for all 4 languages
- Language selector in Settings/Profile page
- Persistent language preference (saved in localStorage)
- Automatic language detection from device locale
- All pages, components, and UI elements are translated
- Translation keys organized by feature/page
- Real-time language switching without page reload

**Implementation:**
- Uses `react-i18next` for internationalization
- Translation files in `src/i18n/locales/`
- Language toggle component with visual indicators
- Native language names displayed in selector

**Translated Sections:**
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
- Common UI elements (buttons, labels, messages)

---

### 19. Android Native App (Capacitor)

**Platform Support:**
- Native Android application via Capacitor
- Web app continues to work on browsers
- Same codebase for both web and mobile

**Capacitor Features:**
- **App ID**: `com.offsite.app`
- **App Name**: OffSite
- **Web Directory**: `dist/` (Vite build output)
- **Android Scheme**: HTTPS for production

**Native Plugins:**
- `@capacitor/geolocation` - GPS-based attendance tracking
- `@capacitor/camera` - DPR photo capture (camera + gallery)
- `@capacitor/network` - Network status detection
- `@capacitor/preferences` - Secure storage (available)

**Integration:**
- Automatic platform detection (`isNative()`)
- Unified API wrappers for web and native
- Camera wrapper supports both native camera and web file input
- Geolocation wrapper supports both native GPS and browser geolocation
- Network status wrapper supports both Capacitor Network plugin and browser events

**Build Process:**
- `npm run build` - Build web app
- `npm run cap:sync` - Sync web assets to Android
- `npm run cap:open:android` - Open in Android Studio
- `npm run cap:build` - Build and sync

**Android Studio:**
- Project located in `android/` directory
- Gradle-based build system
- Supports Android 5.0+ (API level 21+)
- Can generate APK/AAB for distribution

**Features Preserved:**
- All web features work in native app
- Offline sync functionality
- IndexedDB storage
- Service Worker support
- JWT authentication
- Role-based access control
- All UI components and pages

---

### 20. Material Catalog with Indian Construction Materials

**Realistic Material Database:**
- Pre-seeded catalog with 24+ Indian construction materials
- Realistic Indian market prices (approximate)
- Proper units for each material
- Categorized by material type

**Material Categories:**
1. **Cement & Aggregates**
   - OPC Cement (50kg bag) - ₹380/bag
   - PPC Cement (50kg bag) - ₹360/bag
   - River Sand - ₹1,500/ton
   - M-Sand - ₹1,200/ton
   - 20mm Aggregate - ₹1,100/ton
   - 40mm Aggregate - ₹950/ton

2. **Steel & Metals**
   - TMT Steel Bar (Fe500) - ₹62/kg
   - Binding Wire - ₹68/kg
   - Structural Steel - ₹70/kg

3. **Bricks & Blocks**
   - Red Clay Bricks - ₹9/nos
   - Fly Ash Bricks - ₹6/nos
   - AAC Blocks - ₹3,500/cum

4. **Concrete & Chemicals**
   - Ready Mix Concrete (M20) - ₹5,200/cum
   - Ready Mix Concrete (M25) - ₹5,800/cum
   - Waterproofing Chemical - ₹180/liter
   - Curing Compound - ₹160/liter

5. **Wood & Fixtures**
   - Plywood (18mm) - ₹95/sqm
   - Door Frame - ₹1,800/nos
   - Window Frame - ₹2,200/nos

6. **Electrical**
   - Copper Wire (2.5 sqmm) - ₹95/meter
   - Switch Socket - ₹120/nos
   - Distribution Board - ₹1,900/nos

7. **Plumbing**
   - PVC Pipe (1 inch) - ₹85/meter
   - PVC Pipe (2 inch) - ₹140/meter
   - Water Tap - ₹320/nos

**Material Units:**
- `bag` - For cement (50kg bags)
- `kg` - For steel and metals
- `ton` - For aggregates and sand
- `nos` - For bricks, fixtures, electrical items
- `meter` - For pipes and wires
- `sqm` - For plywood and area-based materials
- `cum` - For concrete and blocks (cubic meters)
- `liter` - For chemicals and liquids

**Features:**
- Material catalog API returns materials grouped by category
- Each material includes:
  - Name
  - Category
  - Unit of measurement
  - Approximate price in INR
  - Price unit
  - Active status
- Quantity validation based on unit type:
  - Integer quantities for `bag` and `nos`
  - Decimal quantities for `kg`, `ton`, `meter`, `sqm`, `cum`, `liter`
- Estimated cost calculation when creating material requests
- Prices are approximate and configurable in database

**Seed Script:**
- One-time seed script: `backend/scripts/seedMaterialCatalog.ts`
- Inserts materials only if they don't exist
- Prevents duplicates
- Run with: `npm run seed:materials`

---

### 21. Stock Management

**Stock Ledger System:**
- Track material stock levels per project
- Stock in/out transactions
- Current stock balance calculation
- Stock alerts for low inventory

**Features:**
- Get current stock balance for a project
- View stock by material
- Stock alerts for low inventory levels
- Transaction history
- Project-based stock tracking

**Routes:**
- `GET /api/stock/project/:projectId` - Get project stock balance
- `GET /api/stock/alerts/:projectId` - Get stock alerts

**Stock Ledger Model:**
- `projectId` - Associated project
- `materialId` - Material identifier
- `materialName` - Material name
- `transactionType` - IN or OUT
- `quantity` - Transaction quantity
- `unit` - Unit of measurement
- `transactionDate` - Date of transaction
- `notes` - Optional transaction notes

---

### 22. All DPRs Page

**Page:** `/all-dprs`

**Features:**
- View all DPRs across projects (for Managers/Owners)
- Filter DPRs by project
- View DPR details:
  - Project and task information
  - Photos
  - Notes
  - Work stoppage information (if any)
  - AI summary (if available)
  - Creation date and time
- Chronological list of DPRs
- Search and filter capabilities

**Access:**
- Managers: Can view all DPRs from assigned projects
- Owners: Can view all DPRs across all projects
- Engineers: Redirected (can only view own DPRs)

---

### 23. Settings & Preferences

**Settings Features:**
- **Language Selection**: Choose from 4 supported languages
- **Theme Toggle**: Switch between dark and light mode
- **Auto Sync**: Enable/disable automatic synchronization
- **Connection Status**: View current connectivity status
- **Sync Now**: Manual sync trigger
- **Notifications**: Notification preferences (if implemented)

**Language Toggle:**
- Available in Profile/Settings page
- Visual language selector with native names
- Instant language switching
- Preference saved to localStorage

**Theme Management:**
- Dark/Light mode toggle
- System theme detection
- Persistent theme preference
- Automatic favicon updates
- Smooth theme transitions

---

### 24. Owner-Specific Features

**Owner Overview:**
- Comprehensive project overview
- System-wide statistics
- User management capabilities
- Project management
- Invoice management

**Routes:**
- `GET /api/owner/overview/:projectId` - Get owner overview for project

**Owner Dashboard:**
- All manager features plus:
  - Project creation
  - User management
  - Invoice creation and management
  - System configuration access
  - Global analytics

---

### Theme Management
**Dark/Light Mode:**
- Toggle between dark and light themes
- System theme detection
- Persistent theme preference
- Automatic favicon updates
- Smooth theme transitions

### Search Functionality
**Search Features:**
- Search users by OffSite ID
- Search projects by name
- Search tasks by title
- Search materials in catalog
- Search events by title

### Data Export
**Export Capabilities:**
- Export DPR data
- Export attendance records
- Export material requests
- Export project reports
- Export invoice data
- Various formats (if implemented)

### Responsive Design
**Mobile-First:**
- Optimized for mobile devices
- Responsive layouts
- Touch-friendly interfaces
- Large tap targets
- Bottom navigation
- Fast loading times

### Performance Features
**Optimization:**
- Fast page loads
- Optimized images
- Cached AI responses
- Efficient data fetching
- Background processing
- Lazy loading (if implemented)

---

## Deployment & Production

### Backend Deployment (Render)
- Deployed on Render.com
- MongoDB Atlas for database
- Environment variables configured
- Health check endpoint available
- CORS configured for multiple origins

### Frontend Deployment (Vercel)
- Deployed on Vercel
- Production build optimized
- Environment variables configured
- API URL pointing to Render backend
- Static asset caching configured

### Android App Distribution
- Build APK/AAB from Android Studio
- Can be distributed via:
  - Google Play Store
  - Direct APK installation
  - Enterprise distribution

---

This documentation covers all features and functionalities available in the OffSite application from a user perspective, focusing on what users can do and how they interact with the system.

