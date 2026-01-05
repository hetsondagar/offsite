# GST Invoicing - Quick Start & Testing Guide

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

Backend runs on: `http://localhost:3000`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## 🧪 Testing the System

### 1. Test as OWNER

#### Login as Owner
```
Email: owner@example.com
Password: [your password]
```

#### Create Invoice
1. Navigate to "Invoices" from dashboard
2. Click **"Create New Invoice"** button
3. Complete 5-step form:
   - **Step 1:** Select a project
   - **Step 2:** Set billing period (e.g., Jan 1 - Jan 31, 2026)
   - **Step 3:** Enter supplier details:
     ```
     Company: ABC Construction
     Address: 123 Main St, Mumbai
     GSTIN: 27AAAAA0000A1Z5
     State: Maharashtra
     GST Rate: 18
     ```
   - **Step 4:** Enter client details:
     ```
     Name: XYZ Corp
     Address: 456 Park Ave, Mumbai
     GSTIN: 27BBBBB0000B1Z5 (optional)
     State: Maharashtra (same state = CGST+SGST)
     ```
   - **Step 5:** Review and add notes if needed
4. Click **"Create Invoice"**
5. Invoice created with DRAFT status

#### Finalize Invoice
1. Click on the created invoice to expand
2. Click **"Finalize Invoice"** button
3. System will:
   - Calculate billable amount from DPR/materials/tasks
   - Apply GST calculation (CGST+SGST or IGST)
   - Generate invoice number (e.g., OS/INV/2025-26/0001)
   - Lock the invoice (immutable)

#### Download PDF
1. Expand finalized invoice
2. Click **"Download PDF"** button
3. PDF will download with format: `Invoice-OS-INV-2025-26-0001.pdf`

### 2. Test as PROJECT MANAGER

#### Login as Manager
```
Email: manager@example.com
Password: [your password]
```

#### View Invoices
1. Navigate to "Invoices" from dashboard
2. See only invoices for projects you're assigned to
3. Click invoice to view details
4. **Verify:**
   - ❌ No "Create New Invoice" button visible
   - ❌ No "Finalize Invoice" button
   - ❌ No "Download PDF" button
   - ✅ Can view all invoice details
   - ✅ Can expand/collapse invoices

### 3. Test as SITE ENGINEER

#### Login as Engineer
```
Email: engineer@example.com
Password: [your password]
```

#### View Invoices
1. Navigate to "Invoices" from dashboard
2. See only invoices for assigned projects
3. Same read-only restrictions as Manager

---

## 🔍 Test Scenarios

### Scenario 1: Same State GST (CGST + SGST)
**Supplier State:** Maharashtra  
**Client State:** Maharashtra  
**Expected:** CGST 9% + SGST 9% = 18% total

### Scenario 2: Different State GST (IGST)
**Supplier State:** Maharashtra  
**Client State:** Gujarat  
**Expected:** IGST 18%

### Scenario 3: Invoice Numbering
**Action:** Create 3 invoices  
**Expected Numbers:**
- OS/INV/2025-26/0001
- OS/INV/2025-26/0002
- OS/INV/2025-26/0003

### Scenario 4: Access Control
**Test:** Manager tries to access `/api/invoices` POST  
**Expected:** 403 Forbidden

### Scenario 5: Project Filtering
**Setup:** Manager assigned to Project A only  
**Action:** Manager views invoices  
**Expected:** Only see invoices for Project A

### Scenario 6: Draft Editing
**Action:** Owner creates draft, then finalizes  
**Expected:** Cannot edit after finalization

---

## 🔧 API Testing with cURL

### 1. Create Invoice (Owner only)
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer YOUR_OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "PROJECT_ID",
    "billingPeriod": {
      "from": "2026-01-01",
      "to": "2026-01-31"
    },
    "gstRate": 18,
    "supplier": {
      "companyName": "ABC Construction",
      "address": "123 Main St, Mumbai",
      "gstin": "27AAAAA0000A1Z5",
      "state": "Maharashtra"
    },
    "client": {
      "name": "XYZ Corp",
      "address": "456 Park Ave, Mumbai",
      "gstin": "27BBBBB0000B1Z5",
      "state": "Maharashtra"
    },
    "notes": "Test invoice"
  }'
```

### 2. Get All Invoices (Any role)
```bash
curl -X GET http://localhost:3000/api/invoices \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Finalize Invoice (Owner only)
```bash
curl -X POST http://localhost:3000/api/invoices/INVOICE_ID/finalize \
  -H "Authorization: Bearer YOUR_OWNER_TOKEN"
```

### 4. Download PDF (Owner only)
```bash
curl -X GET http://localhost:3000/api/invoices/INVOICE_ID/pdf \
  -H "Authorization: Bearer YOUR_OWNER_TOKEN" \
  --output invoice.pdf
```

---

## ✅ Verification Checklist

### Frontend Tests
- [ ] Owner can access invoice creation form
- [ ] 5-step form navigates correctly
- [ ] Form validation works (required fields)
- [ ] GSTIN format validated (15 chars)
- [ ] GST calculation preview shown
- [ ] Invoice list displays correctly
- [ ] Invoice cards expand/collapse smoothly
- [ ] Status badges show correct colors
- [ ] Finalize button only for Owner + Draft status
- [ ] Download button only for Owner + Finalized status
- [ ] PM/Engineer don't see action buttons
- [ ] Animations smooth and responsive

### Backend Tests
- [ ] POST /invoices returns 201 for Owner
- [ ] POST /invoices returns 403 for PM/Engineer
- [ ] GET /invoices filters by role correctly
- [ ] GET /invoices/:id checks project membership
- [ ] POST /invoices/:id/finalize calculates GST correctly
- [ ] Invoice numbers sequential and unique
- [ ] PDF generation returns valid PDF
- [ ] Finalized invoices cannot be edited
- [ ] Bearer token validation works
- [ ] Error responses have correct status codes

### GST Compliance Tests
- [ ] Same state uses CGST + SGST
- [ ] Different states use IGST
- [ ] Total GST = CGST + SGST or IGST
- [ ] Invoice number format: OS/INV/YYYY-YY/NNNN
- [ ] Financial year calculated correctly (Apr-Mar)
- [ ] Supplier GSTIN required for finalization
- [ ] Client state required for finalization
- [ ] PDF includes all mandatory GST fields

### Integration Tests
- [ ] Invoice creation pulls projects correctly
- [ ] Billable amount calculated from DPR/materials
- [ ] Invoice reflects in Owner dashboard
- [ ] Invoice visible to PM for assigned projects
- [ ] Existing features unaffected (DPR, materials, etc.)

---

## 🐛 Troubleshooting

### Issue: "Failed to load invoices"
**Check:**
1. Backend server running?
2. MongoDB connected?
3. JWT token valid?
4. Network request successful?

### Issue: "Only owners can create invoices"
**Solution:**
- Verify user role in JWT payload
- Check Authorization header format
- Ensure role middleware configured

### Issue: "Invoice not found"
**Check:**
1. Invoice ID correct?
2. User has access to this invoice?
3. Invoice in database?

### Issue: PDF download fails
**Solution:**
- Invoice must be FINALIZED
- Only Owner can download
- Check pdfkit installation

### Issue: GST calculation incorrect
**Verify:**
1. Supplier state matches client state?
2. GST rate set correctly?
3. Taxable amount calculated?

---

## 📊 Sample Data

### Sample Owner User
```json
{
  "_id": "USER_ID",
  "email": "owner@example.com",
  "role": "owner",
  "name": "John Owner"
}
```

### Sample Project
```json
{
  "_id": "PROJECT_ID",
  "name": "Mumbai Housing Complex",
  "location": "Andheri, Mumbai",
  "members": ["OWNER_ID", "MANAGER_ID", "ENGINEER_ID"]
}
```

### Sample Invoice (Draft)
```json
{
  "_id": "INVOICE_ID",
  "projectId": "PROJECT_ID",
  "ownerId": "OWNER_ID",
  "billingPeriod": {
    "from": "2026-01-01",
    "to": "2026-01-31"
  },
  "taxableAmount": 50000,
  "gstRate": 18,
  "gstType": "CGST_SGST",
  "cgstAmount": 4500,
  "sgstAmount": 4500,
  "igstAmount": 0,
  "totalAmount": 59000,
  "status": "DRAFT",
  "paymentStatus": "UNPAID",
  "supplier": {
    "companyName": "ABC Construction",
    "address": "123 Main St, Mumbai",
    "gstin": "27AAAAA0000A1Z5",
    "state": "Maharashtra"
  },
  "client": {
    "name": "XYZ Corp",
    "address": "456 Park Ave, Mumbai",
    "gstin": "27BBBBB0000B1Z5",
    "state": "Maharashtra"
  },
  "notes": "Monthly invoice"
}
```

---

## 🎯 Performance Benchmarks

**Expected Response Times:**
- GET /invoices: < 500ms
- POST /invoices: < 1000ms
- POST /invoices/:id/finalize: < 2000ms
- GET /invoices/:id/pdf: < 3000ms

**Database Queries:**
- Invoice list: 1 query + 1 count
- Project filtering: Additional query for PM/Engineer
- PDF generation: Multiple aggregations

---

## 📝 Notes

1. **Financial Year:** Calculated based on Indian FY (Apr-Mar)
2. **Invoice Immutability:** Once FINALIZED, cannot be edited
3. **Access Control:** Enforced at both route and controller level
4. **PDF Format:** A4 size, GST-compliant layout
5. **Currency:** All amounts in INR (₹)

---

**Last Updated:** January 4, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
