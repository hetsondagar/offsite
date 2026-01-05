# OffSite - Complete Tech Stack & API Services Documentation

## Table of Contents
1. [Overview](#overview)
2. [Backend Tech Stack](#backend-tech-stack)
3. [Frontend Tech Stack](#frontend-tech-stack)
4. [External API Services](#external-api-services)
5. [Development Tools](#development-tools)
6. [Build Tools & Configuration](#build-tools--configuration)
7. [Database](#database)
8. [Authentication & Security](#authentication--security)
9. [File Storage & Media](#file-storage--media)
10. [Email Service](#email-service)
11. [PDF Generation](#pdf-generation)
12. [AI & Machine Learning Services](#ai--machine-learning-services)
13. [Maps & Geocoding](#maps--geocoding)
14. [State Management](#state-management)
15. [UI Libraries & Components](#ui-libraries--components)
16. [Offline Support](#offline-support)
17. [Form Handling](#form-handling)
18. [Validation](#validation)
19. [Styling](#styling)
20. [Routing](#routing)
21. [HTTP Clients](#http-clients)
22. [Date & Time](#date--time)
23. [Charts & Visualization](#charts--visualization)
24. [Animations](#animations)
25. [Notifications](#notifications)
26. [Package Versions Summary](#package-versions-summary)

---

## Overview

OffSite is built using a modern, full-stack TypeScript architecture with a Node.js/Express backend and a React/Vite frontend. The application integrates multiple external services for AI, file storage, email, maps, and more.

---

## Backend Tech Stack

### Core Runtime & Framework
- **Node.js** - JavaScript runtime environment
- **Express.js v4.18.2** - Web application framework for Node.js
  - Handles HTTP requests and routing
  - Middleware support for authentication, CORS, compression, etc.
- **TypeScript v5.3.3** - Typed superset of JavaScript
  - Provides type safety and better developer experience
  - Compiled to JavaScript for production

### Database & ODM
- **MongoDB** - NoSQL document database
  - Stores all application data (users, projects, DPRs, attendance, etc.)
  - Flexible schema for construction management data
- **Mongoose v8.0.3** - MongoDB object modeling tool
  - Schema definitions and validation
  - Middleware hooks (pre-save, post-save)
  - Query building and population

### Authentication & Security
- **jsonwebtoken v9.0.2** - JWT token generation and verification
  - Access tokens (15 minutes expiry)
  - Refresh tokens (7 days expiry)
- **bcrypt v5.1.1** - Password hashing
  - Salt rounds: 10
  - Secure password storage
- **helmet v7.1.0** - Security headers middleware
  - Protects against common web vulnerabilities
  - Sets security-related HTTP headers
- **cors v2.8.5** - Cross-Origin Resource Sharing
  - Configurable allowed origins
  - Credentials support
- **express-rate-limit v7.1.5** - Rate limiting middleware
  - Prevents API abuse
  - 100 requests per 15 minutes for auth endpoints

### File Upload & Processing
- **multer v1.4.5-lts.1** - Multipart/form-data handling
  - Memory storage for file uploads
  - 5MB file size limit per file
  - Up to 6 files per DPR

### Validation
- **express-validator v7.0.1** - Request validation middleware
  - Input sanitization and validation
  - Error handling for invalid requests
- **zod v3.22.4** - TypeScript-first schema validation
  - Runtime type checking
  - Type inference

### Utilities
- **dotenv v16.3.1** - Environment variable management
  - Loads `.env` files
  - Configuration management
- **compression v1.7.4** - Response compression middleware
  - Gzip compression for responses
  - Reduces bandwidth usage
- **morgan v1.10.0** - HTTP request logger
  - Development: 'dev' format
  - Production: 'combined' format
- **node-cron v3.0.3** - Task scheduler
  - Daily health score recalculation (2 AM)
  - Daily delay risk alerts (8 AM)
  - Weekly data cleanup (Sunday 3 AM)
- **crypto v1.0.1** - Cryptographic functionality
  - Used for token generation
  - Secure random number generation

### PDF Generation
- **pdfkit v0.17.2** - PDF document generation
  - Server-side PDF creation
  - GST-compliant invoice generation
  - A4 format with proper formatting

### Development Dependencies
- **tsx v4.7.0** - TypeScript execution
  - Hot reload in development
  - Watch mode for auto-recompilation
- **ts-node v10.9.2** - TypeScript execution for Node.js
- **@types/node v20.10.5** - TypeScript definitions for Node.js
- **@types/express v4.17.21** - TypeScript definitions for Express
- **@types/bcrypt v5.0.2** - TypeScript definitions for bcrypt
- **@types/jsonwebtoken v9.0.5** - TypeScript definitions for JWT
- **@types/multer v1.4.11** - TypeScript definitions for multer
- **@types/morgan v1.9.9** - TypeScript definitions for morgan
- **@types/node-cron v3.0.11** - TypeScript definitions for node-cron
- **@types/nodemailer v6.4.14** - TypeScript definitions for nodemailer
- **@types/compression v1.7.5** - TypeScript definitions for compression
- **@types/cors v2.8.17** - TypeScript definitions for CORS
- **eslint v8.56.0** - JavaScript/TypeScript linter
- **@typescript-eslint/eslint-plugin v6.15.0** - ESLint plugin for TypeScript
- **@typescript-eslint/parser v6.15.0** - ESLint parser for TypeScript

---

## Frontend Tech Stack

### Core Framework
- **React v18.3.1** - UI library
  - Component-based architecture
  - Hooks for state and lifecycle management
- **React DOM v18.3.1** - React rendering for web
- **TypeScript v5.8.3** - Typed JavaScript
  - Type safety for React components
  - Better IDE support and error catching

### Build Tool
- **Vite v5.4.19** - Next-generation frontend build tool
  - Fast HMR (Hot Module Replacement)
  - Optimized production builds
  - ES modules support
- **@vitejs/plugin-react-swc v3.11.0** - Vite plugin for React with SWC
  - Faster compilation using SWC
  - React Fast Refresh support

### Routing
- **react-router-dom v6.30.1** - Client-side routing
  - Declarative routing
  - Protected routes
  - Navigation hooks

### State Management
- **Redux Toolkit v2.11.2** - State management library
  - Centralized application state
  - Slice-based architecture
  - DevTools support
- **react-redux v9.2.0** - React bindings for Redux
  - Hooks API (useSelector, useDispatch)
  - Performance optimizations

### Data Fetching
- **@tanstack/react-query v5.83.0** - Data fetching and caching
  - Server state management
  - Automatic caching and refetching
  - Background updates

### HTTP Client
- **axios v1.13.2** - HTTP client library
  - Promise-based requests
  - Request/response interceptors
  - Automatic JSON transformation

### UI Component Libraries
- **Radix UI** - Headless UI component primitives
  - `@radix-ui/react-accordion v1.2.11` - Accordion component
  - `@radix-ui/react-alert-dialog v1.1.14` - Alert dialog
  - `@radix-ui/react-aspect-ratio v1.1.7` - Aspect ratio container
  - `@radix-ui/react-avatar v1.1.10` - Avatar component
  - `@radix-ui/react-checkbox v1.3.2` - Checkbox input
  - `@radix-ui/react-collapsible v1.1.11` - Collapsible content
  - `@radix-ui/react-context-menu v2.2.15` - Context menu
  - `@radix-ui/react-dialog v1.1.14` - Modal dialog
  - `@radix-ui/react-dropdown-menu v2.1.15` - Dropdown menu
  - `@radix-ui/react-hover-card v1.1.14` - Hover card
  - `@radix-ui/react-label v2.1.7` - Label component
  - `@radix-ui/react-menubar v1.1.15` - Menubar navigation
  - `@radix-ui/react-navigation-menu v1.2.13` - Navigation menu
  - `@radix-ui/react-popover v1.1.14` - Popover component
  - `@radix-ui/react-progress v1.1.7` - Progress indicator
  - `@radix-ui/react-radio-group v1.3.7` - Radio button group
  - `@radix-ui/react-scroll-area v1.2.9` - Custom scrollbar
  - `@radix-ui/react-select v2.2.5` - Select dropdown
  - `@radix-ui/react-separator v1.1.7` - Separator line
  - `@radix-ui/react-slider v1.3.5` - Slider input
  - `@radix-ui/react-slot v1.2.3` - Slot component
  - `@radix-ui/react-switch v1.2.5` - Toggle switch
  - `@radix-ui/react-tabs v1.1.12` - Tabs component
  - `@radix-ui/react-toast v1.2.14` - Toast notifications
  - `@radix-ui/react-toggle v1.1.9` - Toggle button
  - `@radix-ui/react-toggle-group v1.1.10` - Toggle group
  - `@radix-ui/react-tooltip v1.2.7` - Tooltip component

### Styling
- **Tailwind CSS v3.4.17** - Utility-first CSS framework
  - Rapid UI development
  - Responsive design utilities
  - Dark mode support
- **tailwindcss-animate v1.0.7** - Animation utilities for Tailwind
- **@tailwindcss/typography v0.5.16** - Typography plugin for Tailwind
- **postcss v8.5.6** - CSS post-processor
- **autoprefixer v10.4.21** - CSS vendor prefixing
- **clsx v2.1.1** - Utility for constructing className strings
- **tailwind-merge v2.6.0** - Merge Tailwind classes intelligently
- **class-variance-authority v0.7.1` - Component variant management

### Icons
- **lucide-react v0.462.0** - Icon library
  - 1000+ icons
  - Tree-shakeable
  - TypeScript support

### Form Handling
- **react-hook-form v7.61.1** - Form state management
  - Performance optimized
  - Minimal re-renders
  - Built-in validation
- **@hookform/resolvers v3.10.0** - Validation resolvers for react-hook-form
  - Zod integration
  - Yup integration support

### Validation
- **zod v3.25.76** - TypeScript-first schema validation
  - Runtime type checking
  - Form validation
  - Type inference

### Date & Time
- **date-fns v3.6.0** - Date utility library
  - Formatting, parsing, manipulation
  - Locale support
- **react-day-picker v8.10.1` - Date picker component
  - Calendar UI
  - Date range selection

### Charts & Visualization
- **recharts v2.15.4** - Composable charting library
  - Line, bar, pie charts
  - Responsive charts
  - Customizable

### Animations
- **framer-motion v12.23.26** - Animation library
  - Declarative animations
  - Gesture support
  - Layout animations

### Offline Support
- **dexie v4.2.1** - IndexedDB wrapper
  - Promise-based API
  - TypeScript support
  - Query building
- **idb v8.0.3` - IndexedDB wrapper (alternative)
- **idb-keyval v6.2.2` - Key-value store for IndexedDB
- **localforage v1.10.0` - Offline storage library
  - IndexedDB, WebSQL, localStorage fallback

### Notifications
- **sonner v1.7.4` - Toast notification library
  - Beautiful toast notifications
  - Promise-based API
  - Customizable

### Theme Management
- **next-themes v0.3.0` - Theme provider
  - Dark/light mode
  - System theme detection
  - Persistent theme preference

### Additional UI Components
- **cmdk v1.1.1` - Command menu component
- **input-otp v1.4.2` - OTP input component
- **embla-carousel-react v8.6.0` - Carousel component
- **react-resizable-panels v2.1.9` - Resizable panel layouts
- **vaul v0.9.9` - Drawer component

### Development Dependencies
- **@types/react v18.3.23` - TypeScript definitions for React
- **@types/react-dom v18.3.7` - TypeScript definitions for React DOM
- **@types/node v22.16.5` - TypeScript definitions for Node.js
- **eslint v9.32.0` - JavaScript/TypeScript linter
- **@eslint/js v9.32.0` - ESLint JavaScript plugin
- **eslint-plugin-react-hooks v5.2.0` - ESLint plugin for React hooks
- **eslint-plugin-react-refresh v0.4.20` - ESLint plugin for React Fast Refresh
- **typescript-eslint v8.38.0` - ESLint support for TypeScript
- **globals v15.15.0` - Global variables for ESLint

---

## External API Services

### Cloudinary - Image & Media Storage
- **Service**: Cloudinary
- **Package**: `cloudinary v1.41.0`
- **Purpose**: Cloud-based image and video management
- **Usage**:
  - Photo uploads for DPRs
  - Work stoppage evidence photos
  - Automatic image optimization
  - CDN delivery
- **Configuration**:
  - Cloud name, API key, API secret
  - Supports CLOUDINARY_URL format or individual credentials
- **Features**:
  - Automatic format conversion
  - Image transformations
  - Secure uploads
  - URL generation

### MapTiler - Maps & Geocoding
- **Service**: MapTiler Geocoding API
- **Package**: Native `fetch` API (no package)
- **Purpose**: Reverse geocoding (coordinates to addresses)
- **Usage**:
  - Convert GPS coordinates to human-readable addresses
  - Attendance check-in/check-out location display
- **API Endpoint**: `https://api.maptiler.com/geocoding/{lng},{lat}.json`
- **Configuration**: `MAPTILER_API_KEY` environment variable
- **Features**:
  - Reverse geocoding (coordinates → address)
  - Forward geocoding (address → coordinates) - available but not actively used
  - Detailed location information (city, state, country, postal code)

### Hugging Face - AI/ML Service
- **Service**: Hugging Face Router API
- **Package**: Native `fetch` API
- **Purpose**: AI text generation and reasoning
- **Usage**:
  - DPR summaries
  - Health score explanations
  - Delay risk explanations
  - Material anomaly explanations
  - Site risk assessments
  - Anomaly detection
- **Model**: `meta-llama/Llama-3.1-8B-Instruct`
- **API Endpoint**: `https://router.huggingface.co/v1/chat/completions`
- **Configuration**: `HUGGINGFACE_API_KEY` environment variable
- **Features**:
  - OpenAI-compatible API format
  - Chat completions
  - Fallback service when other AI providers fail
  - Model loading state handling
  - Error handling and retries

### OpenAI - AI Service
- **Service**: OpenAI API
- **Package**: Native `fetch` API
- **Purpose**: AI text generation (alternative to HuggingFace)
- **Usage**: Chat completions for AI-powered features
- **Model**: `gpt-4o-mini` (default, configurable)
- **API Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Configuration**: `OPENAI_API_KEY` environment variable
- **Features**:
  - Chat completions
  - Token usage tracking
  - Temperature and max tokens configuration

### Azure OpenAI - AI Service
- **Service**: Azure OpenAI Service
- **Package**: Native `fetch` API
- **Purpose**: AI text generation via Azure (alternative provider)
- **Usage**: Chat completions for AI-powered features
- **Model**: `gpt-4o-mini` (default, configurable)
- **API Endpoint**: Custom Azure endpoint
- **Configuration**:
  - `AZURE_OPENAI_ENDPOINT` environment variable
  - `AZURE_OPENAI_API_KEY` environment variable
- **Features**:
  - Azure-hosted OpenAI models
  - Enterprise-grade security
  - API version: `2024-02-15-preview`

### Google Gemini - AI Service
- **Service**: Google Gemini API
- **Package**: Native `fetch` API
- **Purpose**: AI text generation (alternative provider)
- **Usage**: Chat completions for AI-powered features
- **Model**: `gemini-pro` (default, configurable)
- **API Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Configuration**: `GEMINI_API_KEY` environment variable
- **Features**:
  - Google's generative AI models
  - Content generation
  - Temperature and max output tokens configuration

### Nodemailer / Gmail SMTP - Email Service
- **Service**: Gmail SMTP
- **Package**: `nodemailer v6.10.1`
- **Purpose**: Email sending for password reset and notifications
- **Usage**:
  - Password reset emails
  - HTML email templates
  - Plain text fallback
- **Configuration**:
  - `GMAIL_USER` - Gmail username
  - `GMAIL_PASS` - Gmail app password (not regular password)
  - `EMAIL_FROM` - From email address
- **SMTP Settings**:
  - Host: `smtp.gmail.com`
  - Port: `587` (STARTTLS)
  - Secure: `false`
  - Connection timeout: 10 seconds
- **Features**:
  - HTML email support
  - Plain text fallback
  - Email verification at startup
  - Error handling and logging

---

## Development Tools

### TypeScript Configuration
- **Backend**: `tsconfig.json`
  - Target: ES2020
  - Module: CommonJS
  - Strict mode enabled
  - Source maps enabled
  - Declaration files generated
- **Frontend**: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
  - Target: ES2020+
  - Module: ESNext
  - JSX: React
  - Path aliases (`@/*`)

### Linting
- **ESLint** - Code quality and style checking
  - Backend: ESLint v8.56.0 with TypeScript support
  - Frontend: ESLint v9.32.0 with React hooks and refresh plugins
  - TypeScript ESLint integration

### Build Scripts
- **Backend**:
  - `npm run dev` - Development with hot reload (tsx watch)
  - `npm run build` - Production build (TypeScript compilation)
  - `npm start` - Run production build
  - `npm run lint` - Lint code
- **Frontend**:
  - `npm run dev` - Development server (Vite)
  - `npm run build` - Production build
  - `npm run build:dev` - Development build
  - `npm run preview` - Preview production build
  - `npm run lint` - Lint code

---

## Build Tools & Configuration

### Vite Configuration
- **Port**: 8080
- **Host**: `::` (all interfaces)
- **Plugins**: React SWC plugin
- **Aliases**: `@/*` → `./src/*`
- **Optimizations**: React and Redux deduplication

### TypeScript Compilation
- **Backend**: Compiles to `dist/` directory
- **Frontend**: Handled by Vite (no separate compilation step)

---

## Database

### MongoDB
- **Type**: NoSQL document database
- **ODM**: Mongoose v8.0.3
- **Connection**: Connection string via `MONGODB_URI`
- **Features**:
  - Schema validation
  - Middleware hooks
  - Indexes for performance
  - Population for relationships
  - Transactions support

### Database Models
- User
- Project
- Task
- DPR (Daily Progress Report)
- Attendance
- MaterialRequest
- MaterialCatalog
- Invoice
- Event
- Notification
- ProjectInvitation
- InvoiceCounter
- Counter (for OffSite ID generation)

---

## Authentication & Security

### JWT (JSON Web Tokens)
- **Library**: `jsonwebtoken v9.0.2`
- **Access Token**: 15 minutes expiry (configurable)
- **Refresh Token**: 7 days expiry (configurable)
- **Secrets**: Separate secrets for access and refresh tokens

### Password Security
- **Library**: `bcrypt v5.1.1`
- **Salt Rounds**: 10
- **Hashing**: Automatic on user save

### Security Middleware
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API abuse prevention
- **Input Validation**: express-validator and zod

---

## File Storage & Media

### Cloudinary
- **Service**: Cloud-based media management
- **Package**: `cloudinary v1.41.0`
- **Features**:
  - Image uploads
  - Automatic optimization
  - CDN delivery
  - Transformations
  - Secure uploads

### File Upload
- **Library**: `multer v1.4.5-lts.1`
- **Storage**: Memory storage
- **Limits**: 5MB per file, 6 files per DPR

---

## Email Service

### Nodemailer
- **Package**: `nodemailer v6.10.1`
- **Provider**: Gmail SMTP
- **Features**:
  - HTML email templates
  - Plain text fallback
  - Password reset emails
  - Email verification

---

## PDF Generation

### PDFKit
- **Package**: `pdfkit v0.17.2`
- **Usage**: GST-compliant invoice generation
- **Features**:
  - Server-side PDF creation
  - A4 format
  - Proper formatting
  - Invoice templates

---

## AI & Machine Learning Services

### LLM Service Architecture
- **Primary Provider**: Configurable via `LLM_PROVIDER` (openai/gemini/azure)
- **Fallback**: HuggingFace (always available if configured)
- **Service**: `llm.service.ts`
- **Features**:
  - Multi-provider support
  - Automatic fallback
  - Error handling
  - Token usage tracking

### Supported AI Providers
1. **OpenAI** - Primary or fallback
2. **Azure OpenAI** - Enterprise option
3. **Google Gemini** - Alternative provider
4. **HuggingFace** - Always available fallback

### RAG (Retrieval-Augmented Generation)
- **Service**: `rag.service.ts`
- **Purpose**: Document-based context for AI responses
- **Documents**: Markdown files in `backend/rag-docs/`
  - `attendance-policy.md`
  - `material-usage-norms.md`
  - `project-guidelines.md`
- **Features**:
  - Document chunking
  - Keyword-based retrieval
  - Context injection for AI prompts

### AI Features
- DPR summaries
- Health score explanations
- Delay risk explanations
- Material anomaly explanations
- Site risk assessments
- Anomaly detection

---

## Maps & Geocoding

### MapTiler
- **Service**: MapTiler Geocoding API
- **Purpose**: Reverse geocoding for attendance
- **Features**:
  - Coordinates to address conversion
  - Detailed location information
  - Fallback handling

---

## State Management

### Redux Toolkit
- **Package**: `@reduxjs/toolkit v2.11.2`
- **Usage**: Global application state
- **Slices**:
  - `authSlice` - Authentication state
  - `offlineSlice` - Offline/online status
- **Features**:
  - Immutable updates
  - DevTools integration
  - Middleware support

### React Query
- **Package**: `@tanstack/react-query v5.83.0`
- **Usage**: Server state management
- **Features**:
  - Automatic caching
  - Background refetching
  - Optimistic updates

---

## UI Libraries & Components

### Radix UI
- **Type**: Headless UI primitives
- **Components**: 20+ accessible components
- **Features**:
  - Unstyled components
  - Full keyboard navigation
  - ARIA attributes
  - Customizable styling

### Shadcn UI
- **Type**: Component library built on Radix UI
- **Styling**: Tailwind CSS
- **Components**: 49 UI components in `components/ui/`

---

## Offline Support

### IndexedDB
- **Libraries**:
  - `dexie v4.2.1` - Primary wrapper
  - `idb v8.0.3` - Alternative wrapper
  - `idb-keyval v6.2.2` - Key-value store
  - `localforage v1.10.0` - Storage abstraction
- **Database**: `offsite-db` (version 2)
- **Stores**:
  - `dprs` - DPR data
  - `attendance` - Attendance records
  - `materials` - Material requests
  - `aiCache` - Cached AI responses (1 hour TTL)

### Service Worker
- **File**: `public/sw.js`
- **Purpose**: PWA offline support
- **Features**:
  - Asset caching
  - Offline fallbacks
  - Background sync

---

## Form Handling

### React Hook Form
- **Package**: `react-hook-form v7.61.1`
- **Features**:
  - Performance optimized
  - Minimal re-renders
  - Built-in validation
  - Zod integration

### Validation Resolvers
- **Package**: `@hookform/resolvers v3.10.0`
- **Integration**: Zod validation

---

## Validation

### Zod
- **Backend**: `zod v3.22.4`
- **Frontend**: `zod v3.25.76`
- **Usage**:
  - Runtime type checking
  - Form validation
  - API request validation
  - Type inference

### Express Validator
- **Package**: `express-validator v7.0.1`
- **Usage**: Request validation middleware

---

## Styling

### Tailwind CSS
- **Version**: v3.4.17
- **Features**:
  - Utility-first approach
  - Responsive design
  - Dark mode support
  - Custom configuration

### CSS Processing
- **PostCSS**: v8.5.6
- **Autoprefixer**: v10.4.21

### Utility Libraries
- **clsx**: Class name construction
- **tailwind-merge**: Intelligent class merging
- **class-variance-authority**: Component variants

---

## Routing

### React Router
- **Package**: `react-router-dom v6.30.1`
- **Features**:
  - Declarative routing
  - Protected routes
  - Navigation hooks
  - Future flags enabled

---

## HTTP Clients

### Axios
- **Package**: `axios v1.13.2`
- **Usage**: HTTP requests (if used)
- **Note**: Primary API client uses native `fetch` API

### Native Fetch
- **Usage**: Primary HTTP client
- **Features**:
  - Promise-based
  - Built-in browser API
  - Request/response handling

---

## Date & Time

### date-fns
- **Package**: `date-fns v3.6.0`
- **Features**:
  - Date formatting
  - Date manipulation
  - Locale support
  - Lightweight

### React Day Picker
- **Package**: `react-day-picker v8.10.1`
- **Features**:
  - Calendar UI
  - Date selection
  - Range selection
  - Customizable

---

## Charts & Visualization

### Recharts
- **Package**: `recharts v2.15.4`
- **Features**:
  - Composable charts
  - Responsive
  - Customizable
  - TypeScript support

---

## Animations

### Framer Motion
- **Package**: `framer-motion v12.23.26`
- **Usage**: UI animations
- **Features**:
  - Declarative animations
  - Gesture support
  - Layout animations
  - Performance optimized

---

## Notifications

### Sonner
- **Package**: `sonner v1.7.4`
- **Features**:
  - Toast notifications
  - Promise-based API
  - Customizable
  - Beautiful UI

### Radix Toast
- **Package**: `@radix-ui/react-toast v1.2.14`
- **Usage**: Toast component primitive

---

## Package Versions Summary

### Backend Dependencies
```
bcrypt: ^5.1.1
cloudinary: ^1.41.0
compression: ^1.7.4
cors: ^2.8.5
crypto: ^1.0.1
dotenv: ^16.3.1
express: ^4.18.2
express-rate-limit: ^7.1.5
express-validator: ^7.0.1
framer-motion: ^12.23.26
helmet: ^7.1.0
jsonwebtoken: ^9.0.2
mongoose: ^8.0.3
morgan: ^1.10.0
multer: ^1.4.5-lts.1
node-cron: ^3.0.3
nodemailer: ^6.10.1
pdfkit: ^0.17.2
zod: ^3.22.4
```

### Frontend Dependencies
```
@hookform/resolvers: ^3.10.0
@radix-ui/*: Various versions (1.1.7 to 2.2.15)
@reduxjs/toolkit: ^2.11.2
@tanstack/react-query: ^5.83.0
axios: ^1.13.2
class-variance-authority: ^0.7.1
clsx: ^2.1.1
cmdk: ^1.1.1
date-fns: ^3.6.0
dexie: ^4.2.1
embla-carousel-react: ^8.6.0
framer-motion: ^12.23.26
idb: ^8.0.3
idb-keyval: ^6.2.2
input-otp: ^1.4.2
localforage: ^1.10.0
lucide-react: ^0.462.0
next-themes: ^0.3.0
react: ^18.3.1
react-day-picker: ^8.10.1
react-dom: ^18.3.1
react-hook-form: ^7.61.1
react-redux: ^9.2.0
react-resizable-panels: ^2.1.9
react-router-dom: ^6.30.1
recharts: ^2.15.4
sonner: ^1.7.4
tailwind-merge: ^2.6.0
tailwindcss-animate: ^1.0.7
vaul: ^0.9.9
zod: ^3.25.76
```

### Build Tools
```
Backend:
- TypeScript: ^5.3.3
- tsx: ^4.7.0
- ts-node: ^10.9.2

Frontend:
- Vite: ^5.4.19
- TypeScript: ^5.8.3
- @vitejs/plugin-react-swc: ^3.11.0
```

---

## Environment Variables

### Backend
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port
- `MONGODB_URI` - MongoDB connection string
- `JWT_ACCESS_SECRET` - JWT access token secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `JWT_ACCESS_EXPIRY` - Access token expiry
- `JWT_REFRESH_EXPIRY` - Refresh token expiry
- `CLOUDINARY_URL` - Cloudinary connection string
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `GMAIL_USER` - Gmail username
- `GMAIL_PASS` - Gmail app password
- `EMAIL_FROM` - From email address
- `MAPTILER_API_KEY` - MapTiler API key
- `HUGGINGFACE_API_KEY` - HuggingFace API key
- `OPENAI_API_KEY` - OpenAI API key
- `GEMINI_API_KEY` - Google Gemini API key
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `LLM_PROVIDER` - AI provider (openai/gemini/azure)
- `CORS_ORIGIN` - Allowed CORS origin
- `RATE_LIMIT_WINDOW_MS` - Rate limit window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

### Frontend
- `VITE_API_URL` - Backend API URL
- `VITE_MAPTILER_KEY` - MapTiler API key

---

## Summary

This tech stack provides:
- **Modern Development**: TypeScript, React, Vite
- **Robust Backend**: Express, MongoDB, Mongoose
- **Security**: JWT, bcrypt, helmet, rate limiting
- **AI Integration**: Multiple AI providers with fallback
- **Offline Support**: IndexedDB, Service Workers, PWA
- **Rich UI**: Radix UI, Tailwind CSS, Framer Motion
- **External Services**: Cloudinary, MapTiler, Email, AI services
- **Developer Experience**: Hot reload, TypeScript, ESLint

All packages and services listed are actively used in the codebase.

