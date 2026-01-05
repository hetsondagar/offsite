# GST Invoicing System - Technical Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    InvoicingPage.tsx                        │ │
│  │  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐  │ │
│  │  │ Owner View   │  │ Manager View│  │ Engineer View   │  │ │
│  │  │ - Create     │  │ - View Only │  │ - View Only     │  │ │
│  │  │ - Edit       │  │ - Assigned  │  │ - Assigned      │  │ │
│  │  │ - Finalize   │  │   Projects  │  │   Projects      │  │ │
│  │  │ - Download   │  │             │  │                 │  │ │
│  │  └──────────────┘  └─────────────┘  └──────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Components & Services                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │InvoiceForm   │  │InvoiceCard   │  │invoicesApi   │    │ │
│  │  │(5-step)      │  │(Display)     │  │(API calls)   │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP/REST API
                             │ JWT Authorization
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (Node.js)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Express Routes                            │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │             invoice.routes.ts                         │  │ │
│  │  │                                                        │  │ │
│  │  │  POST   /invoices           → createInvoice()        │  │ │
│  │  │  GET    /invoices           → getInvoices()          │  │ │
│  │  │  GET    /invoices/:id       → getInvoiceById()       │  │ │
│  │  │  POST   /invoices/:id/finalize → finalizeInvoice()   │  │ │
│  │  │  GET    /invoices/:id/pdf   → downloadInvoicePDF()   │  │ │
│  │  │  PATCH  /invoices/:id/payment → updatePaymentStatus()│  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Middleware Layer                          │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │authenticateUser│ │authorizeRoles│  │errorHandler  │    │ │
│  │  │(JWT verify)   │  │(role check)  │  │(logging)     │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Controller Layer                           │ │
│  │              (invoice.controller.ts)                        │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────┐    │ │
│  │  │ Role-Based Logic:                                   │    │ │
│  │  │                                                      │    │ │
│  │  │ • Owner: Full CRUD                                  │    │ │
│  │  │ • Manager: Read assigned projects                   │    │ │
│  │  │ • Engineer: Read assigned projects                  │    │ │
│  │  └────────────────────────────────────────────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Service Layer                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │gst.util.ts   │  │billable-     │  │pdf.service.ts│    │ │
│  │  │(GST calc)    │  │amount.service│  │(PDF gen)     │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  │  ┌──────────────┐                                          │ │
│  │  │invoice-      │                                          │ │
│  │  │number.service│                                          │ │
│  │  └──────────────┘                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Data Models                             │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │invoice.model │  │invoice-      │  │project.model │    │ │
│  │  │              │  │counter.model │  │              │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (MongoDB)                          │
│                                                                  │
│  ┌────────────┐  ┌──────────────┐  ┌───────────┐              │
│  │ invoices   │  │invoicecounters│  │ projects  │              │
│  ├────────────┤  ├──────────────┤  ├───────────┤              │
│  │ _id        │  │ financialYear│  │ _id       │              │
│  │ projectId  │  │ seq          │  │ name      │              │
│  │ ownerId    │  │ updatedAt    │  │ location  │              │
│  │ billing... │  └──────────────┘  │ members[] │              │
│  │ taxable... │                    └───────────┘              │
│  │ gst...     │                                                │
│  │ status     │  ┌───────────┐  ┌───────────┐                │
│  │ supplier   │  │   dprs    │  │ materials │                │
│  │ client     │  ├───────────┤  ├───────────┤                │
│  │ notes      │  │ _id       │  │ _id       │                │
│  └────────────┘  │ projectId │  │ projectId │                │
│                  │ taskId    │  │ status    │                │
│  ┌────────────┐  │ ...       │  │ quantity  │                │
│  │   tasks    │  └───────────┘  │ ...       │                │
│  ├────────────┤                  └───────────┘                │
│  │ _id        │                                                │
│  │ projectId  │  ┌────────────┐                               │
│  │ status     │  │ attendance │                               │
│  │ ...        │  ├────────────┤                               │
│  └────────────┘  │ userId     │                               │
│                  │ projectId  │                               │
│                  │ timestamp  │                               │
│                  └────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Invoice Creation Flow (Owner)

```
┌─────────┐
│ Owner   │
│ Browser │
└────┬────┘
     │
     │ 1. Click "Create New Invoice"
     ▼
┌─────────────────┐
│ InvoiceForm     │
│ (5-step wizard) │
└────┬────────────┘
     │
     │ 2. Select Project
     │ 3. Set Billing Period
     │ 4. Enter Supplier
     │ 5. Enter Client
     │ 6. Submit
     ▼
┌─────────────────┐
│ invoicesApi     │
│ .create()       │
└────┬────────────┘
     │
     │ POST /api/invoices
     │ + JWT Token (Owner)
     ▼
┌──────────────────┐
│ authenticateUser │
│ (verify JWT)     │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ authorizeRoles   │
│ (check: owner)   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ createInvoice()  │
│ Controller       │
└────┬─────────────┘
     │
     │ 1. Validate data
     │ 2. Check project exists
     │ 3. Check overlapping invoices
     ├──────────────────┐
     │                  │
     ▼                  ▼
┌────────────────┐  ┌──────────────────┐
│ calculateGST() │  │calculateBillable │
│ (CGST/SGST or  │  │Amount()          │
│  IGST)         │  │                  │
└────┬───────────┘  └────┬─────────────┘
     │                   │
     │                   ├───► DPR.find()
     │                   ├───► Task.find()
     │                   └───► MaterialRequest.find()
     │                   │
     │◄──────────────────┘
     │
     ▼
┌──────────────────┐
│ Invoice.create() │
│ (MongoDB)        │
└────┬─────────────┘
     │
     │ Invoice saved as DRAFT
     │
     ▼
┌─────────────────┐
│ Response 201    │
│ { invoice }     │
└────┬────────────┘
     │
     ▼
┌─────────┐
│ Browser │
│ (toast) │
└─────────┘
```

### 2. Invoice Finalization Flow

```
┌─────────┐
│ Owner   │
└────┬────┘
     │
     │ Click "Finalize Invoice"
     ▼
┌─────────────────┐
│ invoicesApi     │
│ .finalize()     │
└────┬────────────┘
     │
     │ POST /api/invoices/:id/finalize
     ▼
┌──────────────────┐
│ finalizeInvoice()│
│ Controller       │
└────┬─────────────┘
     │
     │ 1. Find invoice
     │ 2. Check status = DRAFT
     │ 3. Validate required fields
     │
     ├──────────────────────┬──────────────────┐
     │                      │                  │
     ▼                      ▼                  ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│Recalculate    │  │Calculate GST    │  │Generate Invoice  │
│Billable Amount│  │(updated amount) │  │Number            │
└───┬───────────┘  └─────┬───────────┘  └────┬─────────────┘
    │                    │                    │
    │                    │                    ├──► InvoiceCounter
    │                    │                    │    .findOneAndUpdate()
    │                    │                    │    (atomic increment)
    │                    │                    │
    │◄───────────────────┴────────────────────┘
    │
    ▼
┌──────────────────┐
│ Update invoice:  │
│ - taxableAmount  │
│ - gstAmounts     │
│ - invoiceNumber  │
│ - status=FINALIZED│
│ - finalizedAt    │
│ - finalizedBy    │
└────┬─────────────┘
     │
     │ Invoice.save()
     │
     ▼
┌─────────────────┐
│ Response 200    │
│ { invoice }     │
└─────────────────┘
```

### 3. Role-Based Access Flow

```
┌─────────────┐
│ User Login  │
└──────┬──────┘
       │
       │ JWT Token with role
       │
       ▼
┌──────────────────────────────────┐
│    GET /api/invoices             │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────┐
│authenticateUser  │
│(JWT decode)      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ req.user = {     │
│   userId,        │
│   role,          │
│   email          │
│ }                │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ getInvoices()    │
│ Controller       │
└──────┬───────────┘
       │
       ├─── Is role = 'owner'?
       │    │
       │    ▼ YES
       │    query = { ownerId: userId }
       │
       ├─── Is role = 'manager' or 'engineer'?
       │    │
       │    ▼ YES
       │    1. Find projects where user is member
       │    2. query = { projectId: { $in: [projectIds] } }
       │
       ▼
┌──────────────────┐
│ Invoice.find()   │
│ (filtered)       │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Return invoices  │
│ (role-filtered)  │
└──────────────────┘
```

---

## Security Architecture

### Authentication Layer

```
┌──────────────────────────────────────────┐
│         HTTP Request                     │
│   Authorization: Bearer <JWT_TOKEN>      │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│     authenticateUser Middleware          │
│                                          │
│  1. Extract token from header            │
│  2. Verify signature                     │
│  3. Check expiration                     │
│  4. Decode payload                       │
│                                          │
│  Result: req.user = {                    │
│    userId: string,                       │
│    role: 'owner'|'manager'|'engineer',  │
│    email: string                         │
│  }                                       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│     authorizeRoles Middleware            │
│                                          │
│  Check: req.user.role in allowedRoles    │
│                                          │
│  If NO → 403 Forbidden                   │
│  If YES → Continue to controller         │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│         Controller Logic                 │
│                                          │
│  Additional checks:                      │
│  - Ownership verification                │
│  - Project membership check              │
│  - Status-based permissions              │
└──────────────────────────────────────────┘
```

### Authorization Matrix

| Endpoint | Owner | Manager | Engineer | Middleware |
|----------|-------|---------|----------|------------|
| POST /invoices | ✅ | ❌ | ❌ | `authorizeRoles('owner')` |
| GET /invoices | ✅ (own) | ✅ (assigned) | ✅ (assigned) | `authorizeRoles('owner','manager','engineer')` + controller filter |
| GET /invoices/:id | ✅ (own) | ✅ (assigned) | ✅ (assigned) | `authorizeRoles('owner','manager','engineer')` + controller check |
| POST /invoices/:id/finalize | ✅ | ❌ | ❌ | `authorizeRoles('owner')` |
| GET /invoices/:id/pdf | ✅ | ❌ | ❌ | `authorizeRoles('owner')` |
| PATCH /invoices/:id/payment | ✅ | ❌ | ❌ | `authorizeRoles('owner')` |

---

## GST Calculation Engine

### Algorithm

```typescript
function calculateGST(
  taxableAmount: number,
  gstRate: number,
  supplierState: string,
  clientState: string
): GstCalculationResult {
  
  // Normalize states
  const s1 = supplierState.trim().toUpperCase();
  const s2 = clientState.trim().toUpperCase();
  
  if (s1 === s2) {
    // Same state: CGST + SGST
    const totalGst = (taxableAmount * gstRate) / 100;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    
    return {
      gstType: 'CGST_SGST',
      cgstAmount: round(cgst, 2),
      sgstAmount: round(sgst, 2),
      igstAmount: 0,
      totalGst: round(totalGst, 2)
    };
  } else {
    // Different states: IGST
    const igst = (taxableAmount * gstRate) / 100;
    
    return {
      gstType: 'IGST',
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: round(igst, 2),
      totalGst: round(igst, 2)
    };
  }
}
```

### Example Calculations

#### Scenario 1: Same State
```
Taxable Amount: ₹50,000
GST Rate: 18%
Supplier: Maharashtra
Client: Maharashtra

Calculation:
Total GST = 50,000 × 18% = ₹9,000
CGST = 9,000 / 2 = ₹4,500 (9%)
SGST = 9,000 / 2 = ₹4,500 (9%)
Grand Total = 50,000 + 9,000 = ₹59,000
```

#### Scenario 2: Different States
```
Taxable Amount: ₹50,000
GST Rate: 18%
Supplier: Maharashtra
Client: Gujarat

Calculation:
IGST = 50,000 × 18% = ₹9,000
Grand Total = 50,000 + 9,000 = ₹59,000
```

---

## Billable Amount Calculation

### Algorithm

```typescript
async function calculateBillableAmount(
  projectId: string,
  billingPeriodFrom: Date,
  billingPeriodTo: Date
): Promise<BillableAmountResult> {
  
  // 1. Completed Tasks
  const tasks = await Task.find({
    projectId,
    status: 'completed',
    updatedAt: { $gte: from, $lte: to }
  });
  const taskValue = tasks.length × 5000;
  
  // 2. Approved DPRs
  const dprs = await DPR.find({
    projectId,
    createdAt: { $gte: from, $lte: to }
  });
  const dprValue = dprs.length × 2000;
  
  // 3. Approved Materials
  const materials = await MaterialRequest.find({
    projectId,
    status: 'approved',
    approvedAt: { $gte: from, $lte: to }
  });
  
  let materialValue = 0;
  for (const mat of materials) {
    const unitCost = MATERIAL_COST[mat.materialName] || 1000;
    materialValue += mat.quantity × unitCost;
  }
  
  // Total
  const taxableAmount = taskValue + dprValue + materialValue;
  
  return {
    taxableAmount,
    breakdown: {
      completedTasksValue: taskValue,
      approvedDprsValue: dprValue,
      approvedMaterialsValue: materialValue,
      milestoneAdjustment: 0
    }
  };
}
```

### Material Cost Mapping

| Material | Unit Cost |
|----------|-----------|
| Cement | ₹400/bag |
| Steel | ₹60,000/ton |
| Sand | ₹800/m³ |
| Brick | ₹8/piece |
| Default | ₹1,000/unit |

---

## Invoice Number Generation

### Format: `OS/INV/YYYY-YY/NNNN`

**Components:**
- `OS` = Company prefix (OffSite)
- `INV` = Document type (Invoice)
- `YYYY-YY` = Financial year (e.g., 2025-26)
- `NNNN` = Sequential number (0001, 0002, etc.)

### Financial Year Logic

```typescript
function getFinancialYear(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  if (month >= 4) {
    // Apr to Dec: Current year to next year
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    // Jan to Mar: Previous year to current year
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}
```

### Examples

| Date | Financial Year | Invoice Number |
|------|----------------|----------------|
| Jan 15, 2026 | 2025-26 | OS/INV/2025-26/0001 |
| Apr 1, 2026 | 2026-27 | OS/INV/2026-27/0001 |
| Dec 31, 2026 | 2026-27 | OS/INV/2026-27/0042 |

### Atomic Increment

```typescript
async function generateInvoiceNumber(): Promise<string> {
  const fy = getFinancialYear();
  
  // Atomic operation - prevents race conditions
  const counter = await InvoiceCounter.findOneAndUpdate(
    { financialYear: fy },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  
  const number = `OS/INV/${fy}/${String(counter.seq).padStart(4, '0')}`;
  return number;
}
```

---

## Database Schema

### Invoice Collection

```typescript
{
  _id: ObjectId,
  projectId: ObjectId (ref: 'Project'),
  ownerId: ObjectId (ref: 'User'),
  
  billingPeriod: {
    from: Date,
    to: Date
  },
  
  taxableAmount: Number,
  gstRate: Number (default: 18),
  gstType: 'CGST_SGST' | 'IGST',
  
  cgstAmount: Number,
  sgstAmount: Number,
  igstAmount: Number,
  
  totalAmount: Number,
  
  invoiceNumber: String (optional, assigned on finalization),
  
  status: 'DRAFT' | 'FINALIZED',
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID',
  
  supplier: {
    companyName: String,
    address: String,
    gstin: String (15 chars, uppercase),
    state: String
  },
  
  client: {
    name: String,
    address: String,
    gstin: String (optional),
    state: String
  },
  
  notes: String (optional),
  
  finalizedBy: ObjectId (ref: 'User', optional),
  finalizedAt: Date (optional),
  syncedAt: Date (optional),
  
  createdAt: Date,
  updatedAt: Date
}
```

### InvoiceCounter Collection

```typescript
{
  _id: ObjectId,
  financialYear: String (unique, e.g., "2025-26"),
  seq: Number (default: 0),
  updatedAt: Date
}
```

### Indexes

```typescript
// Invoice collection
invoiceSchema.index({ projectId: 1, status: 1 });
invoiceSchema.index({ ownerId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, paymentStatus: 1 });
invoiceSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });

// InvoiceCounter collection
invoiceCounterSchema.index({ financialYear: 1 }, { unique: true });
```

---

## Error Handling

### Error Types

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| UNAUTHORIZED | 401 | No token or invalid token |
| FORBIDDEN | 403 | Insufficient permissions |
| PROJECT_NOT_FOUND | 404 | Project doesn't exist |
| INVOICE_NOT_FOUND | 404 | Invoice doesn't exist |
| ALREADY_FINALIZED | 400 | Invoice already finalized |
| INVALID_BILLING_PERIOD | 400 | End date before start date |
| OVERLAPPING_INVOICE | 400 | Billing period overlaps |
| MISSING_REQUIRED_FIELDS | 400 | Required fields missing |
| INVOICE_NOT_FINALIZED | 400 | Cannot download draft PDF |

### Error Response Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

---

## Performance Considerations

### Query Optimization

1. **Index Usage**
   - All queries use indexed fields
   - Compound indexes for complex queries

2. **Pagination**
   - Default: 10 items per page
   - Max: 100 items per page

3. **Population**
   - Selective field population
   - Only necessary fields loaded

4. **Aggregation**
   - Billable amount calculated server-side
   - Cached during finalization

### Caching Strategy

```
┌──────────────────┐
│ Draft Invoices   │ → No caching (frequent changes)
└──────────────────┘

┌──────────────────┐
│ Finalized        │ → Cache PDF for 1 hour
│ Invoices         │   (immutable)
└──────────────────┘

┌──────────────────┐
│ Invoice List     │ → Cache for 5 minutes
│                  │   (Invalidate on create/update)
└──────────────────┘
```

---

## Monitoring & Logging

### Key Metrics

1. **Invoice Creation Rate**
   - Avg time: < 1 second
   - Bottleneck: Billable amount calculation

2. **Finalization Rate**
   - Avg time: < 2 seconds
   - Bottleneck: GST recalculation + number generation

3. **PDF Generation**
   - Avg time: < 3 seconds
   - Bottleneck: PDF rendering

4. **Query Performance**
   - Invoice list: < 500ms
   - Single invoice: < 200ms

### Logging Points

```typescript
// Invoice creation
logger.info(`Invoice draft created: ${invoice._id} by owner ${userId}`);

// Invoice finalization
logger.info(`Invoice finalized: ${invoiceNumber} by owner ${userId}`);

// Billable amount calculation
logger.info(`Billable amount calculated for project ${projectId}`, {
  completedTasksValue,
  approvedDprsValue,
  approvedMaterialsValue,
  taxableAmount
});

// Invoice number generation
logger.info(`Generated invoice number: ${invoiceNumber} for FY ${financialYear}`);

// Errors
logger.error('Error calculating billable amount:', error);
```

---

## Testing Strategy

### Unit Tests

```typescript
// GST Calculation
describe('calculateGST', () => {
  test('same state returns CGST+SGST', () => {
    const result = calculateGST(50000, 18, 'Maharashtra', 'Maharashtra');
    expect(result.gstType).toBe('CGST_SGST');
    expect(result.cgstAmount).toBe(4500);
    expect(result.sgstAmount).toBe(4500);
    expect(result.igstAmount).toBe(0);
  });
  
  test('different states return IGST', () => {
    const result = calculateGST(50000, 18, 'Maharashtra', 'Gujarat');
    expect(result.gstType).toBe('IGST');
    expect(result.igstAmount).toBe(9000);
    expect(result.cgstAmount).toBe(0);
  });
});

// Invoice Number Generation
describe('getFinancialYear', () => {
  test('April to December returns current-next year', () => {
    const result = getFinancialYear(new Date('2026-06-15'));
    expect(result).toBe('2026-27');
  });
  
  test('January to March returns previous-current year', () => {
    const result = getFinancialYear(new Date('2026-01-15'));
    expect(result).toBe('2025-26');
  });
});
```

### Integration Tests

```typescript
describe('Invoice API', () => {
  test('Owner can create invoice', async () => {
    const response = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(invoiceData);
    
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('DRAFT');
  });
  
  test('Manager cannot create invoice', async () => {
    const response = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${managerToken}`)
      .send(invoiceData);
    
    expect(response.status).toBe(403);
  });
  
  test('Manager sees only assigned project invoices', async () => {
    const response = await request(app)
      .get('/api/invoices')
      .set('Authorization', `Bearer ${managerToken}`);
    
    expect(response.status).toBe(200);
    const invoices = response.body.data.invoices;
    invoices.forEach(inv => {
      expect(assignedProjectIds).toContain(inv.projectId);
    });
  });
});
```

---

## Deployment Checklist

### Backend
- [ ] Environment variables configured
- [ ] MongoDB connection string set
- [ ] JWT secret configured
- [ ] Port configured
- [ ] CORS origins set
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Error tracking setup (Sentry, etc.)

### Frontend
- [ ] API base URL configured
- [ ] Build optimized for production
- [ ] Assets minified
- [ ] Environment variables set
- [ ] Error boundaries implemented
- [ ] Analytics configured (optional)

### Database
- [ ] Indexes created
- [ ] Backup strategy in place
- [ ] Connection pooling configured
- [ ] Read/Write concerns set

### Security
- [ ] HTTPS enabled
- [ ] JWT expiration set appropriately
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] SQL injection prevention (N/A for MongoDB)
- [ ] XSS protection enabled

---

**Architecture Version:** 1.0.0  
**Last Updated:** January 4, 2026  
**Status:** Production Ready ✅
