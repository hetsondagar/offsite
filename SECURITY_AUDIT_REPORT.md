# 🔐 Security Audit Report: OffSite Application
**Date:** 2024  
**Auditor:** Senior Security Engineer  
**Scope:** Frontend & Backend RBAC Implementation

---

## 🚨 CRITICAL ISSUES

### 1. **FRONTEND ROUTES NOT PROTECTED** ⚠️ CRITICAL

**File:** `offsite/frontend/src/App.tsx`  
**Lines:** 207-227

**Issue:** All routes are publicly accessible without authentication or permission checks. Users can directly access any route via URL manipulation.

**Affected Routes:**
- `/dpr` - Should require `canCreateDPR` (Engineers only)
- `/attendance` - Should require `canMarkAttendance` (Engineers only)
- `/materials` - Should require `canRaiseMaterialRequest` (Engineers only)
- `/approvals` - Should require `canApproveMaterialRequests` (Managers only)
- `/insights` - Should require `canViewAIInsights` (Managers/Owners only)
- `/invoicing` - Should require `canViewInvoices` (Owners only)
- `/ai-command` - Should require `canViewAIInsights` (Managers/Owners only)
- `/projects` - Should require authentication (all roles, but different views)
- `/tasks` - Should require authentication
- `/all-dprs` - Should require `canViewAllDPRs` (Managers/Owners only)

**Expected Behavior:**
- All routes except `/login`, `/signup`, `/forgot-password`, `/reset-password/:token` should be wrapped in `<ProtectedRoute>` or check authentication
- Permission-specific routes should use `<ProtectedRoute requiredPermission="...">`

**Actual Behavior:**
- Routes are accessible without authentication
- No permission checks at route level
- Users can navigate directly to restricted pages

**Security Impact:** 🔴 **CRITICAL** - Unauthorized access to all application features

**Suggested Fix:**
```tsx
// Wrap all protected routes
<Route path="/dpr" element={
  <ProtectedRoute requiredPermission="canCreateDPR">
    <DPRPage />
  </ProtectedRoute>
} />
<Route path="/approvals" element={
  <ProtectedRoute requiredPermission="canApproveMaterialRequests">
    <ApprovalsPage />
  </ProtectedRoute>
} />
<Route path="/insights" element={
  <ProtectedRoute requiredPermission="canViewAIInsights">
    <InsightsPage />
  </ProtectedRoute>
} />
<Route path="/invoicing" element={
  <ProtectedRoute requiredPermission="canViewInvoices">
    <InvoicingPage />
  </ProtectedRoute>
} />
// ... etc
```

---

### 2. **PERMISSION DEFINITION MISMATCH** ⚠️ HIGH

**Files:**
- Frontend: `offsite/frontend/src/lib/permissions.ts`
- Backend: `offsite/backend/src/utils/permissions.ts`

**Issue:** Frontend and backend have **different permission structures** and naming conventions.

**Frontend Permissions:**
- `canRaiseMaterialRequest` (singular)
- `canViewOwnDPRs`, `canViewOwnAttendance`, `canViewOwnMaterialRequests`
- `canViewAllDPRs`
- `canViewInvoices`, `canManageInvoices`
- `canModifyProjects`, `canModifyUsers`

**Backend Permissions:**
- `canRaiseMaterialRequests` (plural)
- `canViewOwnSubmittedData` (generic)
- `canViewAllDPRs`
- `canViewInvoices`, `canManageInvoices`
- `canCreateProjects`, `canArchiveProjects`, `canManageUsers`

**Expected Behavior:**
- Frontend and backend should use identical permission names
- Permission checks should be consistent across both layers

**Actual Behavior:**
- Mismatched permission names cause authorization failures
- `authorizePermission('canRaiseMaterialRequest')` in backend won't match frontend's `canRaiseMaterialRequest`

**Security Impact:** 🟠 **HIGH** - Authorization middleware may fail silently or incorrectly

**Suggested Fix:**
1. Standardize permission names across frontend and backend
2. Create a shared permission definition file or ensure exact matching
3. Update all `authorizePermission()` calls to use correct permission names

---

### 3. **INVOICE ROUTES ALLOW UNAUTHORIZED ACCESS** ⚠️ HIGH

**File:** `offsite/backend/src/modules/invoices/invoice.routes.ts`  
**Lines:** 32, 35

**Issue:** Invoice GET routes allow `engineer` and `manager` roles, but according to requirements:
- Engineers should NOT view invoices
- Managers should NOT view invoices
- Only Owners should view invoices

**Code:**
```typescript
router.get('/', authenticateUser, authorizeRoles('owner', 'manager', 'engineer'), getInvoices);
router.get('/:id', authenticateUser, authorizeRoles('owner', 'manager', 'engineer'), getInvoiceById);
```

**Expected Behavior:**
- Only `owner` role should access invoice endpoints
- Engineers and Managers should receive 403 Forbidden

**Actual Behavior:**
- Engineers and Managers can call invoice APIs
- Backend returns invoice data to unauthorized roles

**Security Impact:** 🟠 **HIGH** - Unauthorized access to financial data

**Suggested Fix:**
```typescript
router.get('/', authenticateUser, authorizeRoles('owner'), getInvoices);
router.get('/:id', authenticateUser, authorizeRoles('owner'), getInvoiceById);
```

---

### 4. **TASK ROUTES MISSING PERMISSION CHECKS** ⚠️ MEDIUM

**File:** `offsite/backend/src/modules/tasks/task.routes.ts`

**Issue:** Task creation and status update routes lack permission-based authorization.

**Code:**
```typescript
router.post('/', authenticateUser, createTask);  // No permission check
router.patch('/:id/status', authenticateUser, updateTaskStatus);  // No permission check
```

**Expected Behavior:**
- Task creation should require `canMonitorTaskProgress` (Managers/Owners) or be restricted to Managers/Owners
- Task status update should require `canUpdateTaskStatus` (Engineers for own tasks, Managers/Owners for all)

**Actual Behavior:**
- Any authenticated user can create tasks
- Any authenticated user can update task status
- Controller has role-based filtering but no route-level enforcement

**Security Impact:** 🟡 **MEDIUM** - Engineers could create tasks they shouldn't

**Suggested Fix:**
```typescript
router.post('/', authenticateUser, authorizeRoles('owner', 'manager'), createTask);
router.patch('/:id/status', authenticateUser, updateTaskStatus); // Keep as-is, controller handles filtering
```

---

### 5. **SYNC ENDPOINT LACKS ENTITY TYPE VALIDATION** ⚠️ MEDIUM

**File:** `offsite/backend/src/modules/sync/sync.controller.ts`  
**Lines:** 31-235

**Issue:** The `/api/sync/batch` endpoint accepts DPRs, attendance, materials, and invoices from any role without validating if that role is allowed to create those entity types.

**Code:**
```typescript
// Sync DPRs - No check if user has canCreateDPR
for (const dprData of dprs) {
  // ... syncs DPRs
}

// Sync Attendance - No check if user has canMarkAttendance
for (const attData of attendance) {
  // ... syncs attendance
}

// Sync Materials - No check if user has canRaiseMaterialRequest
for (const matData of materials) {
  // ... syncs materials
}

// Sync Invoices - Only checks role, not permission
if (req.user.role === 'owner') {
  // ... syncs invoices
}
```

**Expected Behavior:**
- Engineers should only sync DPRs, attendance, and material requests
- Managers should NOT sync DPRs, attendance, or material requests
- Only Owners should sync invoices
- Validate entity type permissions before syncing

**Actual Behavior:**
- Any authenticated user can sync any entity type
- Engineers could potentially sync invoices (though frontend may prevent this)
- No permission validation for entity types

**Security Impact:** 🟡 **MEDIUM** - Potential privilege escalation via offline sync

**Suggested Fix:**
```typescript
// Validate permissions before syncing
if (dprs.length > 0 && !hasPermission(req.user.role, 'canCreateDPR')) {
  throw new AppError('Insufficient permissions to sync DPRs', 403, 'FORBIDDEN');
}
if (attendance.length > 0 && !hasPermission(req.user.role, 'canMarkAttendance')) {
  throw new AppError('Insufficient permissions to sync attendance', 403, 'FORBIDDEN');
}
if (materials.length > 0 && !hasPermission(req.user.role, 'canRaiseMaterialRequests')) {
  throw new AppError('Insufficient permissions to sync material requests', 403, 'FORBIDDEN');
}
```

---

### 6. **PAGE-LEVEL PERMISSION CHECKS INCONSISTENT** ⚠️ MEDIUM

**Files:**
- `offsite/frontend/src/pages/InsightsPage.tsx` - ✅ Has permission check
- `offsite/frontend/src/pages/AICommandCenter.tsx` - ✅ Has permission check
- `offsite/frontend/src/pages/DPRPage.tsx` - ✅ Uses ProtectedRoute wrapper
- `offsite/frontend/src/pages/InvoicingPage.tsx` - ❌ No permission check
- `offsite/frontend/src/pages/ApprovalsPage.tsx` - ❌ No permission check
- `offsite/frontend/src/pages/ProjectsPage.tsx` - ❌ No permission check
- `offsite/frontend/src/pages/TasksPage.tsx` - ❌ No permission check

**Issue:** Some pages check permissions internally, others don't. This creates inconsistent security.

**Expected Behavior:**
- All permission-restricted pages should check permissions on mount
- Redirect unauthorized users immediately

**Actual Behavior:**
- Some pages check permissions, others rely on route protection (which doesn't exist)
- Users can access pages and see loading states before being blocked

**Security Impact:** 🟡 **MEDIUM** - Inconsistent user experience and potential data exposure during load

**Suggested Fix:**
Add permission checks to all restricted pages:
```typescript
useEffect(() => {
  if (!hasPermission("canViewInvoices")) {
    navigate("/");
  }
}, [hasPermission, navigate]);
```

---

### 7. **PROJECT ROUTES MISSING ROLE RESTRICTIONS** ⚠️ LOW

**File:** `offsite/backend/src/modules/projects/project.routes.ts`

**Issue:** Project GET routes allow all authenticated users, but should filter based on role.

**Code:**
```typescript
router.get('/', authenticateUser, getProjects);  // All roles
router.get('/:id', authenticateUser, getProjectById);  // All roles
```

**Expected Behavior:**
- Engineers should only see projects they're members of (controller handles this ✅)
- Managers should only see projects they're members of (controller handles this ✅)
- Owners can see all projects (controller handles this ✅)
- Route-level enforcement is optional since controller filters correctly

**Actual Behavior:**
- Controller correctly filters by role, but route allows all authenticated users
- This is acceptable IF controller filtering is robust (which it appears to be)

**Security Impact:** 🟢 **LOW** - Controller-level filtering is working, but route-level would be more secure

**Suggested Fix:**
Keep as-is if controller filtering is verified, OR add route-level role checks for clarity.

---

### 8. **ATTENDANCE GET ROUTE MISSING PERMISSION CHECK** ⚠️ LOW

**File:** `offsite/backend/src/modules/attendance/attendance.routes.ts`  
**Line:** 20-24

**Issue:** GET attendance by project allows all authenticated users, but should require `canViewAttendanceSummaries` (Managers/Owners only).

**Code:**
```typescript
router.get(
  '/project/:projectId',
  authenticateUser,
  getAttendanceByProject
);
```

**Expected Behavior:**
- Only Managers and Owners should view attendance summaries
- Engineers should NOT access this endpoint

**Actual Behavior:**
- Any authenticated user can view attendance by project
- Controller may filter, but route doesn't enforce

**Security Impact:** 🟡 **MEDIUM** - Engineers could view attendance data they shouldn't

**Suggested Fix:**
```typescript
router.get(
  '/project/:projectId',
  authenticateUser,
  authorizePermission('canViewAttendanceSummaries'),
  getAttendanceByProject
);
```

---

### 9. **DPR GET ROUTE MISSING PERMISSION CHECK** ⚠️ LOW

**File:** `offsite/backend/src/modules/dpr/dpr.routes.ts`  
**Line:** 24-28

**Issue:** GET DPRs by project allows all authenticated users, but should require `canViewAllDPRs` for Managers/Owners or filter by `createdBy` for Engineers.

**Code:**
```typescript
router.get(
  '/project/:projectId',
  authenticateUser,
  getDPRsByProject
);
```

**Expected Behavior:**
- Engineers should only see their own DPRs (controller handles this ✅)
- Managers/Owners should see all DPRs (controller handles this ✅)
- Route-level enforcement optional if controller is robust

**Actual Behavior:**
- Controller correctly filters, but route allows all authenticated users

**Security Impact:** 🟢 **LOW** - Controller filtering appears correct

**Suggested Fix:**
Verify controller filtering is robust, or add route-level checks for clarity.

---

### 10. **MATERIALS CATALOG ACCESSIBLE TO ALL** ⚠️ LOW

**File:** `offsite/backend/src/modules/materials/material.routes.ts`  
**Line:** 20-24

**Issue:** Materials catalog GET route allows all authenticated users. This is likely acceptable since engineers need to see available materials to make requests.

**Code:**
```typescript
router.get(
  '/catalog',
  authenticateUser,
  getMaterialsCatalog
);
```

**Expected Behavior:**
- Engineers need catalog access to create requests ✅
- Managers may need catalog for approval context ✅
- This appears correct

**Security Impact:** 🟢 **NONE** - This is likely intentional and correct

---

## 📊 SUMMARY

### Critical Issues: 1
### High Issues: 2
### Medium Issues: 4
### Low Issues: 3

### Total Issues: 10

---

## ✅ POSITIVE FINDINGS

1. **Backend Authentication:** All routes require `authenticateUser` middleware ✅
2. **Controller-Level Filtering:** Most controllers correctly filter data by role ✅
3. **Permission System Exists:** Both frontend and backend have permission systems ✅
4. **Some Pages Protected:** Some pages (InsightsPage, AICommandCenter) check permissions ✅
5. **Navigation Filtering:** BottomNav correctly filters items by role ✅

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### Priority 1 (Critical):
1. **Wrap all routes in `ProtectedRoute`** with appropriate `requiredPermission` props
2. **Fix permission name mismatches** between frontend and backend
3. **Restrict invoice routes** to owners only

### Priority 2 (High):
4. **Add permission checks to sync endpoint** for entity type validation
5. **Add permission checks to task routes** for create/update operations
6. **Add permission checks to attendance GET route**

### Priority 3 (Medium):
7. **Add consistent page-level permission checks** to all restricted pages
8. **Verify controller-level filtering** is robust for all endpoints

---

## 🧪 TESTING RECOMMENDATIONS

1. **Test direct URL access** for all routes as each role
2. **Test API endpoints** with Postman/curl for each role
3. **Test offline sync** with unauthorized entity types
4. **Test permission name matching** between frontend and backend
5. **Test navigation filtering** for each role

---

## 📝 NOTES

- The application has a solid foundation with authentication and permission systems
- Most issues are about **enforcement consistency** rather than missing security
- Controller-level filtering is generally good, but route-level enforcement adds defense-in-depth
- Frontend route protection is the most critical gap

---

**Report Generated:** 2024  
**Next Review:** After implementing Priority 1 fixes
