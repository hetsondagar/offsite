# Invoice Edit Feature Documentation

## Overview
The invoice edit feature allows **Owners** to modify draft invoices before they are finalized. Once an invoice is finalized, it becomes immutable to maintain GST compliance.

## Key Features

### 1. Edit Restrictions
- ✅ **Draft Invoices**: Can be fully edited
- ❌ **Finalized Invoices**: Cannot be edited (immutable for GST compliance)
- 🔒 **Owner-Only**: Only users with the 'owner' role can edit invoices

### 2. What Can Be Edited
When editing a draft invoice, owners can modify:
- Project selection
- Billing period (from/to dates)
- GST rate
- Supplier details (company name, address, GSTIN, state)
- Client details (name, address, GSTIN, state)
- Notes

### 3. What Happens During Edit
- **Recalculation**: Taxable amount and GST are automatically recalculated based on:
  - Selected project
  - New billing period
  - Updated GST rate
  - Supplier/client states (determines CGST+SGST vs IGST)
- **Validation**: System checks for:
  - Valid billing period (end date must be after start date)
  - No overlaps with other finalized invoices for the same project
  - Project exists and is accessible

## Implementation Details

### Backend Changes

#### 1. New Controller Function (`updateInvoice`)
**File**: `backend/src/modules/invoices/invoice.controller.ts`

```typescript
export const updateInvoice = async (req, res, next) => {
  // Validates ownership
  // Ensures invoice is in DRAFT status
  // Recalculates taxable amount and GST
  // Updates all fields
  // Returns updated invoice
}
```

**Key Validations**:
- User must be authenticated and have 'owner' role
- Invoice must exist and belong to the user
- Invoice status must be 'DRAFT'
- No overlaps with finalized invoices

#### 2. New Route
**File**: `backend/src/modules/invoices/invoice.routes.ts`

```typescript
router.put('/:id', authenticateUser, authorizeRoles('owner'), updateInvoice);
```

### Frontend Changes

#### 1. Updated InvoiceForm Component
**File**: `frontend/src/components/invoicing/InvoiceForm.tsx`

**New Props**:
```typescript
interface InvoiceFormProps {
  onInvoiceCreated: (invoice: Invoice) => void;
  onCancel: () => void;
  editInvoice?: Invoice; // NEW: For edit mode
}
```

**Features**:
- Detects edit mode when `editInvoice` prop is provided
- Pre-fills form with existing invoice data
- Changes button text from "Create Invoice" to "Update Invoice"
- Calls `invoicesApi.update()` instead of `invoicesApi.create()` in edit mode

#### 2. Updated InvoiceCard Component
**File**: `frontend/src/components/invoicing/InvoiceCard.tsx`

**New Props**:
```typescript
interface InvoiceCardProps {
  invoice: Invoice;
  isSelected: boolean;
  onSelect: () => void;
  onFinalize?: (invoiceId: string) => Promise<void>;
  onEdit?: (invoice: Invoice) => void; // NEW
  isOwner?: boolean;
}
```

**Features**:
- Shows "Edit Invoice" button for draft invoices (owner-only)
- Edit button appears alongside "Finalize Invoice" button
- Clicking edit triggers `onEdit()` callback with invoice data

#### 3. Updated InvoicingPage
**File**: `frontend/src/pages/InvoicingPage.tsx`

**New State**:
```typescript
const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
```

**New Handlers**:
```typescript
const handleEdit = (invoice: Invoice) => {
  setEditingInvoice(invoice);
  setShowCreateForm(false);
  setSelectedInvoice(null);
};

const handleInvoiceUpdated = (updated: Invoice) => {
  setInvoices((prev) =>
    prev.map((inv) => (inv._id === updated._id ? updated : inv))
  );
  setEditingInvoice(null);
  toast.success('Invoice updated successfully');
};
```

**Features**:
- Displays edit form when `editingInvoice` is set
- Hides create button when editing
- Updates invoice list after successful edit

#### 4. New API Method
**File**: `frontend/src/services/api/invoices.ts`

```typescript
update: async (id: string, data: { ... }) => {
  const response = await apiPut<Invoice>(`/invoices/${id}`, data);
  return response.data;
}
```

#### 5. New API Utility
**File**: `frontend/src/lib/api.ts`

```typescript
export const apiPut = async <T = any>(
  endpoint: string,
  body: any
): Promise<ApiResponse<T>> => {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};
```

## User Flow

### Editing an Invoice

1. **Open Invoicing Page** as Owner
2. **Expand a Draft Invoice** by clicking on it
3. **Click "Edit Invoice"** button
4. **Modify fields** in the multi-step form:
   - Step 1: Select different project (optional)
   - Step 2: Change billing period
   - Step 3: Update supplier details
   - Step 4: Update client details
   - Step 5: Review changes
5. **Click "Update Invoice"**
6. **System Validates** and recalculates amounts
7. **Success**: Invoice updated, form closes, list refreshes

### What Users See

#### Draft Invoice Card (Expanded)
```
┌─────────────────────────────────────┐
│ DRAFT-abc123                        │
│ Project Name                        │
│ ₹50,000.00                         │
│                                     │
│ [Edit Invoice] [Finalize Invoice]  │
└─────────────────────────────────────┘
```

#### Edit Form
```
┌─────────────────────────────────────┐
│ Edit Invoice - Select Project       │
│ Choose a project to create...       │
│                                     │
│ ○ Project A                         │
│ ● Project B (currently selected)    │
│                                     │
│ [← Back]           [Next →]        │
└─────────────────────────────────────┘
```

## Error Handling

### Backend Errors
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: Not an owner or not invoice owner
- **404 Not Found**: Invoice doesn't exist
- **400 Bad Request**:
  - Invoice already finalized
  - Invalid billing period
  - Overlapping with finalized invoice
  - Missing required fields

### Frontend Error Messages
```typescript
toast.error('Only draft invoices can be edited');
toast.error('Invalid billing period');
toast.error('Failed to update invoice');
toast.success('Invoice updated successfully');
```

## Security Considerations

1. **Role-Based Access Control**
   - Route protected by `authorizeRoles('owner')`
   - Controller verifies invoice ownership
   - Frontend hides edit button for non-owners

2. **Immutability of Finalized Invoices**
   - Backend explicitly checks invoice status
   - Returns 400 error if trying to edit finalized invoice
   - Maintains GST compliance and audit trail

3. **Data Validation**
   - All inputs validated with Zod schema
   - Project existence verified
   - Billing period overlap checked
   - State-based GST type validation

## Testing Checklist

### Backend Testing
- [ ] Update draft invoice as owner → Success
- [ ] Update finalized invoice → 400 Error
- [ ] Update invoice as non-owner → 403 Error
- [ ] Update non-existent invoice → 404 Error
- [ ] Update with invalid data → 400 Error
- [ ] Update with overlapping period → 400 Error

### Frontend Testing
- [ ] Edit button visible for draft invoices (owner)
- [ ] Edit button hidden for finalized invoices
- [ ] Edit button hidden for non-owners
- [ ] Form pre-fills with existing data
- [ ] Form validates changes
- [ ] Invoice list updates after edit
- [ ] Success/error toasts display correctly

## API Documentation

### Update Invoice
**Endpoint**: `PUT /api/invoices/:id`

**Authentication**: Required (Bearer token)

**Authorization**: Owner only

**Request Body**:
```json
{
  "projectId": "string",
  "billingPeriod": {
    "from": "2026-01-01T00:00:00.000Z",
    "to": "2026-01-31T23:59:59.999Z"
  },
  "gstRate": 18,
  "supplier": {
    "companyName": "ABC Construction Pvt Ltd",
    "address": "123 Builder St, Mumbai",
    "gstin": "27AAAAA0000A1Z5",
    "state": "Maharashtra"
  },
  "client": {
    "name": "XYZ Developers",
    "address": "456 Developer Ave, Mumbai",
    "gstin": "27BBBBB0000B1Z5",
    "state": "Maharashtra"
  },
  "notes": "Updated invoice details"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Invoice updated successfully",
  "data": {
    "_id": "invoice_id",
    "invoiceNumber": null,
    "status": "DRAFT",
    "taxableAmount": 50000,
    "gstRate": 18,
    "gstType": "CGST_SGST",
    "cgstAmount": 4500,
    "sgstAmount": 4500,
    "totalAmount": 59000,
    ...
  }
}
```

## Migration Guide

### For Existing Projects
No database migration required. The feature uses existing schemas and only adds new functionality.

### Breaking Changes
None. This is a purely additive feature.

## Future Enhancements

Potential improvements:
1. **Version History**: Track all edits made to draft invoices
2. **Audit Log**: Log who edited what and when
3. **Partial Edits**: Allow editing specific sections without full form
4. **Bulk Edit**: Edit multiple draft invoices at once
5. **Templates**: Save frequently used supplier/client details as templates

## Support

For issues or questions:
1. Check error messages in browser console
2. Verify backend logs for detailed error information
3. Ensure user has 'owner' role
4. Confirm invoice is in 'DRAFT' status
