# OffSite Frontend - Complete Features & Functionalities Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication & User Management](#authentication--user-management)
3. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
4. [Pages & Features](#pages--features)
5. [UI Components & Design System](#ui-components--design-system)
6. [Offline Capabilities](#offline-capabilities)
7. [State Management](#state-management)
8. [Data Management](#data-management)
9. [Animations & User Experience](#animations--user-experience)
10. [Theme System](#theme-system)
11. [PWA Features](#pwa-features)
12. [Technical Stack](#technical-stack)

---

## Overview

OffSite is a mobile-first construction field management platform designed to replace traditional communication methods (WhatsApp, phone calls, paper registers) with a single, offline-capable, fast, and intuitive interface. The platform serves site engineers, project managers, and owners/admins working in low-connectivity construction environments.

**Key Design Principles:**
- Mobile-first responsive design
- High contrast for sunlight usability
- One primary action per screen
- Large tap targets (minimum 44x44px)
- Bottom navigation only
- Simple icons with short labels
- Fast, alive, and rugged UI
- Offline-first architecture

---

## Authentication & User Management

### Login Page (`/login`)
**Features:**
- Multi-step authentication flow:
  1. **Phone Number Input**: Email/password or phone number entry with validation
  2. **OTP Verification**: 6-digit OTP input with auto-formatting
  3. **Role Selection**: Choose between Site Engineer, Project Manager, or Owner/Admin
- **Remember Me** checkbox for persistent sessions
- **Forgot Password** link
- Theme toggle in header
- Large centered logo (plain variant, no background box)
- Smooth step transitions with loading states
- Link to signup page

### Signup Page (`/signup`)
**Features:**
- Similar multi-step flow as login
- Back button to return to login
- "Create Account" header title
- Phone number validation
- OTP verification
- Role selection with descriptions
- Link to login page

### Authentication State Management
- **Redux Store**: User authentication state stored in `authSlice`
- **Persistent Storage**: User role, phone number, and userId saved to `localStorage`
- **Auto-initialization**: Auth state restored on app load
- **Session Management**: Logout clears all stored data

**Stored Data:**
- `isAuthenticated`: Boolean flag
- `role`: UserRole enum (engineer, manager, owner)
- `phone`: User's phone number
- `userId`: Unique user identifier

---

## Role-Based Access Control (RBAC)

### User Roles

#### 1. Site Engineer (`engineer`)
**Permissions:**
- ✅ Create Daily Progress Reports (DPR)
- ✅ Update task status
- ✅ Mark GPS-based attendance
- ✅ Raise material requests
- ✅ View own submitted data (DPRs, attendance, material requests)
- ❌ Approve material requests
- ❌ View all DPRs
- ❌ View AI insights
- ❌ View invoices
- ❌ Manage projects or users

**Navigation Items:**
- Home
- DPR
- Attendance
- Materials
- Profile
- Sync

#### 2. Project Manager (`manager`)
**Permissions:**
- ✅ View all DPRs across projects
- ✅ Approve/reject material requests
- ✅ View attendance summaries
- ✅ Monitor task progress
- ✅ View AI insights and analytics
- ✅ Add comments on DPRs and tasks
- ✅ Export reports
- ❌ Create DPRs
- ❌ Mark attendance
- ❌ Raise material requests
- ❌ View/manage invoices
- ❌ Modify projects or users

**Navigation Items:**
- Dashboard
- Projects
- Approvals
- Insights
- Profile
- Sync

#### 3. Owner/Admin (`owner`)
**Permissions:**
- ✅ View global dashboards
- ✅ View AI insights
- ✅ View and manage invoices
- ✅ Modify projects (create, archive)
- ✅ Manage users
- ✅ Export reports
- ✅ View all DPRs and attendance summaries
- ❌ Create DPRs
- ❌ Mark attendance
- ❌ Raise material requests
- ❌ Approve material requests (delegated to managers)

**Navigation Items:**
- Dashboard
- Projects
- Approvals
- Insights
- Invoicing
- Profile
- Sync

### Permission System Implementation
- **Centralized Permissions**: Defined in `src/lib/permissions.ts`
- **Permission Hook**: `usePermissions()` hook for easy access
- **Route Protection**: `ProtectedRoute` component guards routes
- **UI Filtering**: Navigation items filtered based on permissions
- **Self-Approval Prevention**: Users cannot approve their own requests

---

## Pages & Features

### 1. Index Page (`/`)
**Purpose**: Route handler that redirects to role-specific dashboard

**Functionality:**
- Checks authentication status
- Redirects to `/login` if not authenticated
- Renders `EngineerDashboard` for engineers
- Renders `ManagerDashboard` for managers/owners

---

### 2. Engineer Dashboard (`/` - Engineer View)

#### Today at a Glance Card
- **Attendance Status**: Shows check-in status with time and location
- **Today's Task**: Displays current assigned task with progress percentage
- **Pending Material Requests**: Shows count and material names

#### Quick Actions
- **Create DPR**: Large CTA button with icon
- **Mark Attendance**: GPS-based check-in/out
- **Request Materials**: Raise new material requests

#### Recent Activity Feed
- List of recent actions (DPR submissions, material requests, attendance)
- Status indicators (success, pending)
- Timestamps

#### Header Features
- Large centered logo
- Current time and date display
- Theme toggle button
- Offline banner (if applicable)

---

### 3. Manager/Owner Dashboard (`/` - Manager/Owner View)

#### Site Health Score
- **Circular Progress Ring**: Animated 0-100 score display
- Color-coded based on score:
  - Green: 80-100 (Healthy)
  - Yellow: 60-79 (Warning)
  - Red: 0-59 (Critical)
- Overall health across all active projects
- Status badges showing "On Track" vs "At Risk" projects

#### KPI Cards (2x2 Grid)
1. **Active Projects**: Count with trend indicator
2. **Today's Attendance**: Percentage with comparison to average
3. **Pending Approvals**: Count of material requests awaiting approval
4. **Delay Risks**: Number of projects at risk

#### Projects Overview
- List of active projects with:
  - Project name and location
  - Progress bar (animated fill)
  - Health score ring (small)
  - Worker count
  - Due date
  - Task completion ratio
  - Risk badges
- Expandable cards showing risk alerts and details
- Click to navigate to full projects page

#### AI Insights Preview
- Latest AI-generated insight card
- Delay predictions
- Material usage anomalies
- Positive progress updates
- Link to full insights page

---

### 4. Daily Progress Report (DPR) Page (`/dpr`)

#### Multi-Step Wizard (5 Steps)

**Step 1: Select Project**
- List of assigned projects
- Card-based selection with visual feedback
- Auto-advance to next step

**Step 2: Upload Photos**
- Grid layout (3 columns)
- Camera button for new photos
- Gallery button for existing photos
- Maximum 6 photos
- Photo preview with delete option
- Shimmer loading animation on upload

**Step 3: Select Task**
- List of tasks for selected project
- Status badges (Pending, In Progress, Completed)
- Visual selection feedback

**Step 4: Add Notes**
- Optional textarea for manual notes
- **AI Smart DPR Assistant**:
  - "Generate AI Summary" button
  - Simulated AI processing with typing animation
  - Auto-generated summary based on photos and task
  - Editable AI-generated text
  - Includes weather, worker count, material usage, safety status

**Step 5: Review & Submit**
- Summary of all entered data
- Project and task display
- Photo thumbnails
- Notes/summary preview
- Offline sync indicator
- Submit button with loading state
- Success overlay with animation

#### Features
- **Progress Bar**: Visual indicator of current step
- **Back Navigation**: Return to previous step or home
- **Offline Indicator**: Shows "Will sync when online"
- **Permission Check**: Redirects if user lacks `canCreateDPR` permission
- **IndexedDB Storage**: Saves DPR locally for offline sync
- **Redux Integration**: Adds to pending items queue

---

### 5. GPS Attendance Page (`/attendance`)

#### Features

**Time Display Card**
- Large digital clock (HH:MM:SS)
- Current date (weekday, month, day)

**Location Card**
- GPS location display
- "Locate" button to get current position
- Location verification status
- Animated pulse indicator when location is active

**Check-In/Out Button**
- Large, prominent button (full width, 128px height)
- **Check-In State**:
  - Primary color with glow effect
  - MapPin icon with pulsing animation
  - "Check In" text
- **Check-Out State**:
  - Destructive variant
  - Check icon
  - "Check Out" text
- Button animations (scale on press, hover effects)

**Status Card** (when checked in)
- Success badge with pulse animation
- Check-in time display
- Active status indicator

**Today's Activity History**
- List of check-in/check-out events
- Timestamps for each action
- Empty state message if no activity

**Offline Notice**
- Banner indicating offline capability
- "Works offline. Will sync when connected."

#### Functionality
- **GPS Simulation**: Mock location fetching (1.5s delay)
- **IndexedDB Storage**: Saves attendance records locally
- **Redux Integration**: Adds to pending sync queue
- **Permission Check**: Requires `canMarkAttendance` permission
- **User Audit**: Tracks `userId` and `markedAt` timestamp

---

### 6. Materials Page (`/materials`)

#### New Material Request Form

**Material Dropdown**
- Custom dropdown with search
- List of available materials:
  - Cement (50kg bags)
  - Steel Bars (12mm)
  - Sand
  - Bricks
  - Concrete Mix
- Visual selection feedback

**Quantity Selector**
- Large number input (2xl font)
- Plus/Minus buttons (increment by 10)
- Unit display below input
- Real-time validation

**Material Anomaly Detection**
- **Automatic Detection**: Compares quantity against threshold
- **Warning Banner**: Red alert when quantity exceeds typical usage
- **Required Reason**: Forces reason input for anomalous requests
- **Visual Indicators**: Destructive color scheme for anomalies

**Reason Input**
- Text input for request justification
- Required when anomaly detected
- Optional for normal requests

**Submit Button**
- Disabled until valid selection
- Loading state during submission
- Success overlay animation
- Auto-reset form after success

#### Your Requests Section
- List of pending material requests
- Status badges (Pending, Approved, Rejected)
- Material name, quantity, and date
- Filtered by current user

#### Features
- **Permission Check**: Requires `canRaiseMaterialRequest`
- **IndexedDB Storage**: Saves requests locally
- **Redux Integration**: Adds to pending sync queue
- **User Audit**: Tracks requester and timestamp

---

### 7. Projects Page (`/projects`)

#### Project Cards
Each project card displays:
- **Health Score Ring**: Small circular progress indicator
- **Project Name & Location**: Truncated with ellipsis
- **Risk Badge**: "At Risk" indicator if applicable
- **Progress Bar**: Animated fill showing completion percentage
- **Quick Stats**:
  - Worker count (Users icon)
  - Due date (Calendar icon)
  - Task completion ratio (TrendingUp icon)

#### Expandable Details
- Click to expand/collapse project card
- **Risk Alert Section**: Warning banner with risk reason
- **View Project Details Button**: Navigate to detailed view

#### Features
- Smooth card animations (fade-up with stagger)
- Hover effects (border highlight, shadow glow)
- Active selection state
- Responsive grid layout

---

### 8. Approvals Page (`/approvals`)

#### Pending Approvals Section

**Approval Cards** include:
- **Anomaly Warning**: Yellow banner if quantity is unusual
- **Material Icon**: Package icon with primary color
- **Request Details**:
  - Title and description
  - Quantity and unit (large, bold)
  - Requester name (User icon)
  - Project name
  - Date and time
- **Action Buttons**:
  - Reject (outline, destructive)
  - Approve (success variant)

**Empty State**:
- Check icon
- "All caught up!" message
- "No pending approvals" subtitle

#### History Section
- List of previously approved/rejected requests
- Status badges (green for approved, red for rejected)
- Approval/rejection timestamp
- Approved by information

#### Features
- **Self-Approval Prevention**: Alert if user tries to approve own request
- **Permission Check**: Requires `canApproveMaterialRequests`
- **Real-time Updates**: Approvals move from pending to history
- **User Audit**: Tracks approver and timestamp

---

### 9. Insights Page (`/insights`)

#### Overall Health Score Card
- Large health score ring
- Project count summary
- Status badges (Healthy vs At Risk)

#### Delay Risk Predictor
- **Risk Cards** for each project:
  - Project name
  - Risk level badge (High/Medium/Low)
  - Probability bar (animated fill)
  - Impact description
  - Cause explanation
  - Color-coded bars (red/yellow/green)

#### Smart Insights Section
- **AI-Generated Insights**:
  - Delay warnings
  - Material usage anomalies
  - Positive progress updates
- **Severity Indicators**:
  - High: Red border, destructive icon
  - Medium: Yellow border, warning icon
  - Low: Green border, success icon
- **Recommendations**: Actionable suggestions in highlighted box
- **Project Badges**: Link insights to specific projects

#### Material Usage Trends Chart
- **Bar Chart** (Recharts):
  - Material names on X-axis
  - Usage percentage on Y-axis
  - Animated bars with rounded corners
  - Tooltip on hover
  - Responsive container

#### Project Progress Chart
- **Area Chart** (Recharts):
  - Last 7 days on X-axis
  - Progress percentage on Y-axis
  - Gradient fill
  - Smooth curve
  - Tooltip with values

#### Features
- **Permission Check**: Requires `canViewAIInsights`
- **Animated Charts**: Smooth transitions on load
- **Responsive Design**: Charts adapt to screen size

---

### 10. Sync Page (`/sync`)

#### Status Card
- **Connection Status**:
  - Online: Green WiFi icon
  - Offline: Yellow WiFi-off icon
- **Status Badge**: "Connected" or "Offline"
- **Last Sync Time**: Timestamp of last successful sync

#### Sync Now Button
- Large, prominent button
- **States**:
  - Idle: "Sync Now (X items)"
  - Syncing: Spinner animation
  - Success: Checkmark with "Sync Complete!"
  - Error: X icon with shake animation
- Disabled when offline or no pending items

#### Pending Items List
- **Item Cards**:
  - Icon (DPR, Attendance, Material)
  - Type label
  - Timestamp
  - Status badge (Pending)
- **Empty State**: Check icon with "All items synced" message
- **Animations**: Fade-in with stagger

#### Features
- **IndexedDB Integration**: Loads unsynced items from local database
- **Redux State**: Manages sync status and last sync time
- **Auto-refresh**: Updates list after successful sync
- **Error Handling**: Visual feedback on sync failure

---

### 11. Invoicing Page (`/invoicing`)

#### Invoice List
Each invoice card shows:
- **Invoice ID**: Format "INV-YYYY-XXX"
- **Project Name**: Associated project
- **Date**: Invoice date
- **Status Badge**: Paid or Pending
- **Amount Display**:
  - Total amount (large, bold)
  - GST amount (smaller, below)

#### Expandable Invoice Details
- **Items Breakdown**:
  - Item name
  - Quantity × Rate
  - Amount
  - GST percentage and amount
- **GST Breakdown Card**:
  - Subtotal
  - GST (18%)
  - Total (highlighted)
- **Download Button**: Mock PDF download

#### Features
- **Permission Check**: Requires `canViewInvoices` or `canManageInvoices`
- **GST-Ready**: All calculations include 18% GST
- **Indian Number Format**: Uses `toLocaleString('en-IN')`
- **Smooth Animations**: Expand/collapse with motion

---

### 12. Profile Page (`/profile`)

#### Profile Card
- **Avatar**: Role-based icon (Crown for owner, User for others)
- **User Name**: Display name
- **Phone Number**: From auth state
- **Role Badge**: Colored status badge

#### Assigned Projects
- List of projects user is assigned to
- Clickable cards with chevron
- Expandable to show details

#### Sync Settings
- **Connection Status**:
  - Online/Offline indicator
  - WiFi icon (green/gray)
  - Status badge
- **Auto Sync Toggle**:
  - Switch component
  - "Sync when online" description
- **Sync Now Button**: Navigate to sync page

#### Theme Toggle
- Icon variant in card
- Compact variant as toggle
- Description text

#### Menu Items
- **Notifications**: Toggle state display
- **Security**: Settings access
- **Help & Support**: Support access
- All with icons and chevron indicators

#### Logout Button
- Destructive variant (red border)
- Logout icon
- Clears all auth data

#### Version Display
- "OffSite v1.0.0" at bottom

---

### 13. NotFound Page (`*`)
- Large centered logo
- "404" heading
- "Oops! Page not found" message
- Link to return home

---

## UI Components & Design System

### Common Components

#### Logo Component
- **Variants**:
  - `default`: With glow effect and border
  - `plain`: No background, just image
- **Sizes**: `sm`, `md`, `lg`
- **Theme-aware**: Switches between `logo.png` (light) and `logodark.png` (dark)
- **Text Option**: Can show/hide "OffSite" text

#### StatusBadge
- **Status Types**: `success`, `error`, `warning`, `info`, `pending`, `offline`
- **Pulse Animation**: Optional pulsing effect
- **Color-coded**: Automatic color assignment

#### ThemeToggle
- **Variants**:
  - `default`: Full toggle with labels
  - `compact`: Small toggle switch
  - `icon`: Icon-only button
- **Theme-aware**: Shows Sun (dark mode) or Moon (light mode)

#### ActionButton
- **Variants**: `glow`, `outline`
- **Icon Support**: Large icon display
- **Label & Sublabel**: Primary and secondary text
- **Hover Effects**: Scale and glow animations

#### KPICard
- **Icon Display**: Large icon with background
- **Value Display**: Large, bold number
- **Suffix Support**: Percentage, currency, etc.
- **Trend Indicators**: Up/down arrows with values
- **Variants**: Default, success, warning, destructive
- **Count-up Animation**: Numbers animate on load

#### HealthScoreRing
- **Circular Progress**: SVG-based ring
- **Sizes**: `sm`, `md`, `lg`
- **Color-coded**: Green/yellow/red based on score
- **Animated Fill**: Smooth progress animation
- **Label Option**: Can show/hide score text

#### OfflineBanner
- **Pending Items Count**: Shows number of unsynced items
- **Warning Style**: Yellow/orange color scheme
- **Dismissible**: Can be closed

#### MobileLayout
- **Role-based Navigation**: Shows appropriate bottom nav
- **Safe Area Support**: Handles notches and home indicators
- **Hide Nav Option**: Can hide bottom nav for full-screen pages

### Card Variants
- **default**: Standard card with border
- **gradient**: Gradient background
- **glow**: Primary color glow effect

### Button Variants
- **default**: Primary solid
- **outline**: Bordered
- **ghost**: Transparent
- **success**: Green variant
- **destructive**: Red variant
- **glow**: Primary with glow effect

### Input Styles
- **Underline-only**: Border only on bottom (login/signup)
- **Standard**: Full border with rounded corners
- **Large**: Increased height and font size

---

## Offline Capabilities

### IndexedDB Storage

#### Database Schema
- **Database Name**: `offsite-db`
- **Version**: 1

#### Object Stores

1. **DPRs Store**
   - Stores Daily Progress Reports
   - Fields: `id`, `projectId`, `taskId`, `photos[]`, `notes`, `aiSummary`, `timestamp`, `synced`
   - Key: `id` (auto-generated)

2. **Attendance Store**
   - Stores check-in/check-out records
   - Fields: `id`, `type` (checkin/checkout), `location`, `timestamp`, `synced`
   - Key: `id` (auto-generated)

3. **Materials Store**
   - Stores material requests
   - Fields: `id`, `materialId`, `quantity`, `reason`, `timestamp`, `synced`
   - Key: `id` (auto-generated)

#### Operations
- **Save Functions**: `saveDPR()`, `saveAttendance()`, `saveMaterialRequest()`
- **Retrieve Functions**: `getDPRs()`, `getUnsyncedDPRs()`, `getUnsyncedAttendance()`, `getUnsyncedMaterials()`
- **Sync Functions**: `markDPRSynced()`, `markAttendanceSynced()`, `markMaterialSynced()`

### Offline State Management

#### Redux Slice: `offlineSlice`
- **State Properties**:
  - `isOnline`: Boolean connection status
  - `pendingItems[]`: Array of unsynced items
  - `lastSyncTime`: Timestamp of last sync
  - `isSyncing`: Boolean sync in progress

#### Actions
- `setOnlineStatus(boolean)`: Update connection status
- `addPendingItem(item)`: Add item to sync queue
- `markItemSynced(id)`: Mark item as synced
- `removePendingItem(id)`: Remove from queue
- `setSyncing(boolean)`: Update sync status
- `setLastSyncTime(timestamp)`: Update last sync time
- `clearSyncedItems()`: Remove all synced items

#### Online/Offline Detection
- Listens to browser `online` and `offline` events
- Updates Redux state automatically
- Initialized on app load

### Offline UI Indicators
- **Status Badges**: "Offline" badge on pages
- **Banners**: Offline notice banners
- **Sync Indicators**: "Will sync when online" messages
- **Disabled States**: Buttons disabled when offline (where applicable)

---

## State Management

### Redux Store Structure

#### Store Configuration
- **Toolkit**: Uses `@reduxjs/toolkit`
- **Slices**: Modular state management
- **TypeScript**: Fully typed

#### Slices

1. **authSlice**
   - `isAuthenticated`: Boolean
   - `role`: UserRole | null
   - `phone`: string | null
   - `userId`: string | null
   - **Actions**: `login()`, `logout()`, `initializeAuth()`

2. **offlineSlice**
   - `isOnline`: Boolean
   - `pendingItems[]`: PendingItem[]
   - `lastSyncTime`: number | null
   - `isSyncing`: Boolean
   - **Actions**: See Offline Capabilities section

#### Custom Hooks
- `useAppDispatch()`: Typed dispatch
- `useAppSelector()`: Typed selector
- `usePermissions()`: Permission checking hook

---

## Data Management

### Dummy Data Structure (`src/data/dummy.js`)

#### Projects
- `id`, `name`, `location`, `progress`, `healthScore`, `workers`, `dueDate`, `risk`, `riskReason`, `tasks`, `completedTasks`

#### Tasks
- `id`, `name`, `status` (pending/in-progress/completed)

#### Materials
- `id`, `name`, `unit`, `anomalyThreshold`

#### Approvals
- `id`, `type`, `title`, `description`, `requestedBy`, `requestedById`, `project`, `projectId`, `date`, `timestamp`, `quantity`, `unit`, `isAnomaly`, `anomalyReason`, `status`

#### Invoices
- `id`, `project`, `projectId`, `date`, `amount`, `gst`, `total`, `status`, `items[]`

#### Insights
- `id`, `type`, `severity`, `title`, `description`, `recommendation`, `project`, `projectId`, `createdAt`

#### Delay Risks
- `project`, `projectId`, `risk`, `probability`, `impact`, `cause`

#### Chart Data
- `materialUsageChartData[]`: Monthly usage by material
- `projectProgressChartData[]`: Daily progress by project

#### Users
- `id`, `name`, `phone`, `role`, `email`, `assignedProjects[]`

### Data Flow
1. **Import**: Pages import from `@/data/dummy`
2. **Usage**: Data used directly in components
3. **Backend Ready**: Structure matches expected API responses

---

## Animations & User Experience

### Framer Motion Animations

#### Page Transitions
- **Fade-up**: Cards and sections fade in from bottom
- **Stagger**: Sequential animations with delays
- **Scale**: Button press feedback

#### Component Animations
- **Progress Bars**: Smooth fill animation (1s duration)
- **Health Score Rings**: Animated arc drawing
- **Status Badges**: Pulse animation for active states
- **Button Feedback**: Scale on press (0.95x)
- **Success Overlays**: Scale and fade in
- **Error States**: Shake animation

#### Chart Animations
- **Bar Charts**: Bars animate from bottom
- **Area Charts**: Gradient fill animation
- **Tooltips**: Fade in on hover

### CSS Animations

#### Keyframes
- `fade-up`: Opacity and translateY
- `bounce-in`: Scale animation
- `ping-location`: Pulsing circle for GPS

#### Transitions
- **Colors**: 300ms ease
- **Transforms**: 300ms ease
- **Opacity**: 200ms ease

### Loading States
- **Skeletons**: Shimmer effect on cards
- **Spinners**: Rotating loader icons
- **Progress Indicators**: Step progress bars

---

## Theme System

### Light & Dark Modes

#### Implementation
- **Library**: `next-themes`
- **Provider**: `ThemeProvider` wraps app
- **Storage**: Theme preference saved to localStorage
- **Default**: Dark mode

#### Color Variables (CSS Custom Properties)

**Light Mode:**
- Background: White (`0 0% 100%`)
- Foreground: Dark (`220 15% 10%`)
- Primary: Construction Orange (`18 100% 55%`)
- Muted: Light gray
- Success: Green
- Warning: Yellow
- Destructive: Red

**Dark Mode:**
- Background: Near-black (`220 15% 5%`)
- Foreground: Light (`0 0% 98%`)
- Primary: Brighter orange (`18 100% 60%`)
- Muted: Dark gray
- Same status colors (adjusted for contrast)

#### Theme-Aware Components
- **Logo**: Switches between `logo.png` and `logodark.png`
- **Favicon**: Updates based on theme
- **All UI Elements**: Automatically adapt colors

#### Theme Toggle
- Available on all pages (top-right)
- Multiple variants for different contexts
- Smooth transition between themes

---

## PWA Features

### Manifest (`public/manifest.json`)
- **Short Name**: "OffSite"
- **Full Name**: "OffSite Construction Management"
- **Icons**: 192x192 and 512x512
- **Start URL**: "/"
- **Display Mode**: "standalone"
- **Theme Color**: "#FF5722" (construction orange)
- **Background Color**: "#1A1A1A" (dark)

### Service Worker (`public/sw.js`)
- **Cache Name**: `offsite-cache-v1`
- **Cached Assets**: HTML, CSS, JS, images
- **Fetch Strategy**: Cache-first with network fallback
- **Registration**: Automatic on app load

### Meta Tags
- **Apple Touch Icon**: iOS home screen icon
- **Mobile Web App Capable**: Full-screen mode
- **Status Bar Style**: Black translucent

### Offline Support
- **Cached Pages**: All routes cached
- **Offline Fallback**: Shows cached content when offline
- **Update Strategy**: Stale-while-revalidate

---

## Multilingual Support (i18n)

### Implementation
- **Library**: `react-i18next`
- **Translation Files**: `src/i18n/locales/` (en.json, hi.json, mr.json, ta.json)
- **Language Detection**: Automatic from device locale or saved preference
- **Persistence**: Language preference saved in localStorage

### Supported Languages
1. **English** (en) - Default language
2. **Hindi** (hi) - हिंदी
3. **Marathi** (mr) - मराठी
4. **Tamil** (ta) - தமிழ்

### Language Toggle Component
- Available in Profile/Settings page
- Visual selector with native language names
- Instant switching without page reload
- Preference persists across sessions

### Translated Content
- All pages and components
- Authentication flows
- Dashboards and navigation
- Forms and inputs
- Error messages and toasts
- Status labels and badges
- Common UI elements

---

## Android Native App (Capacitor)

### Platform Support
- **Native Android** application via Capacitor
- **App ID**: `com.offsite.app`
- **App Name**: OffSite
- **Web Directory**: `dist/` (Vite build output)

### Capacitor Plugins
- `@capacitor/geolocation` - GPS-based attendance
- `@capacitor/camera` - DPR photo capture (camera + gallery)
- `@capacitor/network` - Network status detection
- `@capacitor/preferences` - Secure storage

### Native Integration
- **Platform Detection**: `isNative()` utility function
- **Unified APIs**: Wrappers for web and native
  - Camera: `pickImages()` - Works on web and native
  - Geolocation: `getCurrentPosition()` - Works on web and native
  - Network: `getNetworkStatusCapacitor()` - Works on web and native
- **Build Process**: 
  - `npm run build` → Build web app
  - `npm run cap:sync` → Sync to Android
  - `npm run cap:open:android` → Open in Android Studio

### Features Preserved
- All web features work in native app
- Offline sync functionality
- IndexedDB storage
- Service Worker support
- JWT authentication
- Role-based access control
- All UI components and pages

### Android Studio
- Project in `android/` directory
- Gradle-based build
- Supports Android 5.0+ (API 21+)
- Can generate APK/AAB for distribution

---

## Material Catalog Features

### Indian Construction Materials
- **Pre-seeded Catalog**: 24+ realistic materials
- **Categories**: 
  - Cement & Aggregates
  - Steel & Metals
  - Bricks & Blocks
  - Concrete & Chemicals
  - Wood & Fixtures
  - Electrical
  - Plumbing

### Material Information
- **Name**: Material name
- **Category**: Material category
- **Unit**: Measurement unit (bag, kg, ton, nos, meter, sqm, cum, liter)
- **Approximate Price**: Current Indian market price in INR
- **Price Unit**: Unit for the price

### Features
- Materials grouped by category in API response
- Quantity validation based on unit type
- Estimated cost calculation (quantity × price)
- Realistic Indian construction material prices
- Configurable prices in database

---

## Technical Stack

### Core Technologies
- **React 18.3.1**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **React Router 6.30.1**: Client-side routing

### State Management
- **Redux Toolkit 2.11.2**: State management
- **React Redux 9.2.0**: React bindings

### Styling
- **Tailwind CSS**: Utility-first CSS
- **CSS Custom Properties**: Theme variables
- **PostCSS**: CSS processing

### UI Libraries
- **shadcn/ui**: Component library
- **Lucide React**: Icon library
- **Recharts 2.15.4**: Chart library
- **Framer Motion**: Animation library

### Data & Storage
- **IndexedDB (idb)**: Client-side database
- **localStorage**: Auth persistence

### PWA
- **next-themes**: Theme management
- **Service Worker API**: Offline support

### Development Tools
- **ESLint**: Code linting
- **TypeScript Compiler**: Type checking

---

## Additional Features

### Responsive Design
- **Mobile-first**: Designed for phones, scales up
- **Breakpoints**: Tailwind default breakpoints
- **Touch-friendly**: Minimum 44x44px tap targets
- **Safe Areas**: Handles notches and home indicators

### Accessibility
- **Semantic HTML**: Proper element usage
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Tab order and focus states
- **Color Contrast**: WCAG AA compliant

### Performance
- **Code Splitting**: Route-based chunks
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Optimized logo assets
- **Bundle Optimization**: Manual chunks for vendors

### Error Handling
- **404 Page**: Custom not found page
- **Permission Errors**: Access denied pages
- **Loading States**: Skeleton screens
- **Error Boundaries**: (Recommended for production)

### User Experience Enhancements
- **Smooth Scrolling**: CSS smooth scroll
- **Loading Feedback**: Spinners and progress bars
- **Success Animations**: Confirmation overlays
- **Form Validation**: Real-time validation
- **Auto-formatting**: Phone numbers, OTP

---

## Summary

The OffSite frontend is a comprehensive, mobile-first construction management platform with:

- **3 User Roles** with distinct permissions and dashboards
- **13 Main Pages** covering all aspects of construction site management
- **Offline-First Architecture** with IndexedDB and Redux state management
- **Role-Based Access Control** with centralized permission system
- **Rich UI Components** with animations and theme support
- **PWA Capabilities** for app-like experience
- **Comprehensive Data Models** ready for backend integration

All features are implemented, tested, and ready for backend API integration. The dummy data structure serves as a contract for the backend API design.

