# OffSite — Construction Field Operations

A mobile-first full-stack app for construction site operations: DPRs (Daily Progress Reports), GPS attendance, material requests & approvals, AI-assisted insights, GST-aware invoicing, and offline-first synchronization.

## Quick summary
- **Frontend**: React + Vite + TypeScript, PWA + IndexedDB offline queue, UI for DPR/Attendance/Materials/Approvals/Insights
- **Backend**: Express + TypeScript, MongoDB (Mongoose), JWT auth (access + refresh), Cloudinary for media, background jobs for site health & alerts

This repo contains two primary folders:
- `backend/` — API server and business logic
- `frontend/` — React client (PWA) with offline sync UI

Read service-level READMEs:
- `backend/README.md` (detailed API, tech stack, and new Project status & Roadmap)
- `frontend/README.md` (features, notable files, and new Project status & Roadmap)

---

## What is done (high level)
- Core backend modules are implemented: Auth, Users, Projects, Tasks, DPR, Attendance, Materials (approvals), Insights, Invoices, Sync (batch) ✅
- Frontend pages & offline UX implemented: DPR, Attendance, Materials, Sync, Approvals, Insights, Dashboards ✅
- Offline-first support with IndexedDB and sync UI is implemented on the frontend; backend has a batch sync endpoint but the sync contract needs formalization ✅
- Mocked AI insights and sample data exist for quick UI testing ✅

---

## What is left (actionable checklist)
These items are prioritized for short-term sprints.

### Critical / High priority
- [ ] Add comprehensive unit and integration tests (backend + frontend)
- [ ] Create an OpenAPI / Postman contract and finalize sync API specification
- [ ] Integrate frontend sync with backend batch sync (replace simulated sync)
- [ ] Add CI pipeline for linting, build, and tests

### Medium priority
- [ ] Harden backend security: rate-limiting, monitoring, secrets rotation
- [ ] Implement PDF export for invoices and downloadable reports
- [ ] Add E2E sync tests for offline/online reconciliation

### Low priority / Nice-to-have
- [ ] Geofencing validation for attendance checkins
- [ ] Replace simulated AI with a real AI backend (Azure OpenAI / other) for DPR summaries and insights
- [x] Improve PWA caching and offline resilience (service worker now caches Vite build output correctly)

---

## Offline usage (local)

- Frontend can be installed as a PWA and will load offline after one successful online visit (service worker caches the app shell + built assets).
- Backend can run fully locally; you’ll need a local MongoDB instance (default: `mongodb://localhost:27017/offsite`).

---

## How to use this file with an LLM
If you supply this repository to an LLM for planning or PR generation, include this file and point the LLM to the per-service READMEs (`backend/README.md`, `frontend/README.md`). Ask the LLM to:
1. Generate a prioritized issue list (GitHub issues) from the "What is left" checklist.
2. Draft small PRs with code changes for each checklist item (e.g., add tests scaffolding, generate OpenAPI spec, add sync contract and tests).
3. Produce example API request/response stubs for missing endpoints to speed up frontend-backend integration.

---

## Next step suggestions
- Generate an OpenAPI spec from the backend routes (I can help automate this)
- Add a `TODO.md` with per-module actionable tasks and suggested PR sizes
- Add CI workflow examples (GitHub Actions) for running tests and linting

---

If you'd like, I can start by generating the OpenAPI spec or creating the test scaffolding for the highest-priority endpoints. Just tell me which task to start with.