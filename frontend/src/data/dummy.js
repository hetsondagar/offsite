/**
 * DUMMY DATA FOR OFFSITE PLATFORM
 * 
 * This file contains all mock/dummy data used throughout the application.
 * Use this as a reference for backend API structure and data models.
 * 
 * All data structures here represent what the backend should return.
 */

// ============================================
// PROJECTS DATA
// ============================================

export const projects = [
  {
    id: "1",
    name: "Riverside Apartments",
    location: "Sector 42, Gurugram",
    progress: 75,
    healthScore: 85,
    workers: 45,
    dueDate: "Mar 2025",
    risk: false,
    tasks: 12,
    completedTasks: 9,
  },
  {
    id: "2",
    name: "Metro Mall Phase 2",
    location: "Central Delhi",
    progress: 45,
    healthScore: 58,
    workers: 78,
    dueDate: "Jun 2025",
    risk: true,
    riskReason: "Material delay",
    tasks: 24,
    completedTasks: 11,
  },
  {
    id: "3",
    name: "Tech Park Tower B",
    location: "Noida Expressway",
    progress: 90,
    healthScore: 92,
    workers: 32,
    dueDate: "Jan 2025",
    risk: false,
    tasks: 18,
    completedTasks: 16,
  },
];

// Simple project list for dropdowns
export const projectList = [
  { id: "1", name: "Riverside Apartments" },
  { id: "2", name: "Metro Mall Phase 2" },
  { id: "3", name: "Tech Park Tower B" },
];

// ============================================
// TASKS DATA
// ============================================

export const tasks = [
  { id: "1", name: "Foundation Work", status: "completed" },
  { id: "2", name: "Floor 3 Concrete Pour", status: "in-progress" },
  { id: "3", name: "Electrical Wiring - Block A", status: "pending" },
];

// ============================================
// MATERIALS DATA
// ============================================

export const materials = [
  { id: "1", name: "Cement (50kg bags)", unit: "bags", anomalyThreshold: 100 },
  { id: "2", name: "Steel Bars (12mm)", unit: "pieces", anomalyThreshold: 500 },
  { id: "3", name: "Sand", unit: "cubic ft", anomalyThreshold: 200 },
  { id: "4", name: "Bricks", unit: "pieces", anomalyThreshold: 2000 },
  { id: "5", name: "Concrete Mix", unit: "bags", anomalyThreshold: 80 },
];

export const pendingMaterialRequests = [
  { id: "1", material: "Cement", quantity: 50, status: "pending", date: "Today" },
  { id: "2", material: "Steel Bars", quantity: 200, status: "approved", date: "Yesterday" },
];

// ============================================
// APPROVALS DATA
// ============================================

export const pendingApprovals = [
  {
    id: "1",
    type: "material",
    title: "Cement Request",
    description: "For Floor 4 concrete pouring",
    requestedBy: "Rajesh Kumar",
    requestedById: "user_123",
    project: "Riverside Apartments",
    projectId: "1",
    date: "Today, 10:30 AM",
    timestamp: Date.now(),
    quantity: 150,
    unit: "bags",
    isAnomaly: true,
    anomalyReason: "50% higher than average",
    status: "pending",
  },
  {
    id: "2",
    type: "material",
    title: "Steel Bars (12mm)",
    description: "Reinforcement for columns",
    requestedBy: "Amit Singh",
    requestedById: "user_456",
    project: "Metro Mall Phase 2",
    projectId: "2",
    date: "Today, 9:15 AM",
    timestamp: Date.now() - 3600000,
    quantity: 200,
    unit: "pieces",
    status: "pending",
  },
  {
    id: "3",
    type: "material",
    title: "Bricks",
    description: "Boundary wall construction",
    requestedBy: "Suresh Yadav",
    requestedById: "user_789",
    project: "Tech Park Tower B",
    projectId: "3",
    date: "Yesterday",
    timestamp: Date.now() - 86400000,
    quantity: 1500,
    unit: "pieces",
    status: "pending",
  },
];

export const historyApprovals = [
  {
    id: "4",
    type: "material",
    title: "Concrete Mix",
    description: "Foundation work",
    requestedBy: "Vikram Sharma",
    requestedById: "user_321",
    project: "Riverside Apartments",
    projectId: "1",
    date: "2 days ago",
    timestamp: Date.now() - 172800000,
    quantity: 50,
    unit: "bags",
    status: "approved",
    approvedBy: "manager_001",
    approvedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "5",
    type: "material",
    title: "Sand",
    description: "Plastering",
    requestedBy: "Rajesh Kumar",
    requestedById: "user_123",
    project: "Metro Mall Phase 2",
    projectId: "2",
    date: "3 days ago",
    timestamp: Date.now() - 259200000,
    quantity: 100,
    unit: "cubic ft",
    status: "rejected",
    rejectedBy: "manager_001",
    rejectedAt: new Date(Date.now() - 259200000).toISOString(),
  },
];

// ============================================
// INVOICES DATA
// ============================================

export const invoices = [
  {
    id: "INV-2024-001",
    project: "Riverside Apartments",
    projectId: "1",
    date: "2024-01-15",
    amount: 1250000,
    gst: 225000,
    total: 1475000,
    status: "paid",
    items: [
      { name: "Cement Supply", qty: 500, rate: 500, amount: 250000, gst: 18 },
      { name: "Steel Bars", qty: 2000, rate: 400, amount: 800000, gst: 18 },
      { name: "Labor Charges", qty: 100, rate: 2000, amount: 200000, gst: 18 },
    ],
  },
  {
    id: "INV-2024-002",
    project: "Metro Mall Phase 2",
    projectId: "2",
    date: "2024-01-10",
    amount: 850000,
    gst: 153000,
    total: 1003000,
    status: "pending",
    items: [
      { name: "Concrete Mix", qty: 300, rate: 2000, amount: 600000, gst: 18 },
      { name: "Sand Supply", qty: 500, rate: 500, amount: 250000, gst: 18 },
    ],
  },
  {
    id: "INV-2024-003",
    project: "Tech Park Tower B",
    projectId: "3",
    date: "2024-01-05",
    amount: 950000,
    gst: 171000,
    total: 1121000,
    status: "paid",
    items: [
      { name: "Electrical Materials", qty: 1, rate: 950000, amount: 950000, gst: 18 },
    ],
  },
];

// ============================================
// INSIGHTS & AI DATA
// ============================================

export const insights = [
  {
    id: "1",
    type: "delay",
    severity: "high",
    title: "Material Delivery Delay",
    description: "Steel delivery for Metro Mall Phase 2 is delayed by 3 days. This may impact floor construction schedule.",
    recommendation: "Contact supplier or arrange alternative source.",
    project: "Metro Mall Phase 2",
    projectId: "2",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    type: "anomaly",
    severity: "medium",
    title: "Cement Usage Spike",
    description: "Cement consumption at Riverside Apartments is 40% higher than projected for this phase.",
    recommendation: "Review foundation work efficiency.",
    project: "Riverside Apartments",
    projectId: "1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    type: "positive",
    severity: "low",
    title: "Ahead of Schedule",
    description: "Tech Park Tower B is 2 weeks ahead of schedule due to efficient workforce management.",
    recommendation: "Consider reallocating resources to delayed projects.",
    project: "Tech Park Tower B",
    projectId: "3",
    createdAt: new Date().toISOString(),
  },
];

export const delayRisks = [
  {
    project: "Metro Mall Phase 2",
    projectId: "2",
    risk: "High",
    probability: 75,
    impact: "3-5 days delay",
    cause: "Pending steel delivery",
  },
  {
    project: "Riverside Apartments",
    projectId: "1",
    risk: "Low",
    probability: 20,
    impact: "1-2 days delay",
    cause: "Weather forecast",
  },
];

// ============================================
// CHART DATA
// ============================================

export const materialUsageChartData = [
  { month: "Jan", cement: 400, steel: 300, sand: 200 },
  { month: "Feb", cement: 500, steel: 400, sand: 300 },
  { month: "Mar", cement: 600, steel: 500, sand: 400 },
  { month: "Apr", cement: 550, steel: 450, sand: 350 },
  { month: "May", cement: 700, steel: 600, sand: 500 },
  { month: "Jun", cement: 650, steel: 550, sand: 450 },
];

export const projectProgressChartData = [
  { month: "Jan", "Riverside Apartments": 20, "Metro Mall Phase 2": 10, "Tech Park Tower B": 30 },
  { month: "Feb", "Riverside Apartments": 35, "Metro Mall Phase 2": 20, "Tech Park Tower B": 50 },
  { month: "Mar", "Riverside Apartments": 50, "Metro Mall Phase 2": 30, "Tech Park Tower B": 70 },
  { month: "Apr", "Riverside Apartments": 65, "Metro Mall Phase 2": 40, "Tech Park Tower B": 85 },
  { month: "May", "Riverside Apartments": 75, "Metro Mall Phase 2": 45, "Tech Park Tower B": 90 },
  { month: "Jun", "Riverside Apartments": 75, "Metro Mall Phase 2": 45, "Tech Park Tower B": 90 },
];

// ============================================
// DASHBOARD DATA
// ============================================

export const recentActivity = [
  { action: "DPR Submitted", time: "2 hours ago", status: "success", timestamp: Date.now() - 7200000 },
  { action: "Material Request", time: "4 hours ago", status: "pending", timestamp: Date.now() - 14400000 },
  { action: "Checked In", time: "Today 9:15 AM", status: "success", timestamp: Date.now() - 3600000 },
];

export const projectOverview = [
  { name: "Riverside Apartments", progress: 75, risk: false },
  { name: "Metro Mall Phase 2", progress: 45, risk: true },
  { name: "Tech Park Tower B", progress: 90, risk: false },
];

// ============================================
// ATTENDANCE DATA
// ============================================

export const attendanceRecords = [
  {
    id: "att_001",
    userId: "user_123",
    userName: "Rajesh Kumar",
    date: "2024-01-15",
    checkIn: "09:15 AM",
    checkOut: "06:30 PM",
    location: "Building A, Site 3 - Riverside Apartments",
    status: "completed",
  },
  {
    id: "att_002",
    userId: "user_456",
    userName: "Amit Singh",
    date: "2024-01-15",
    checkIn: "08:45 AM",
    checkOut: null,
    location: "Building B, Site 2 - Metro Mall Phase 2",
    status: "checked-in",
  },
];

// ============================================
// DPR DATA STRUCTURE (Example)
// ============================================

export const dprExample = {
  id: "dpr_001",
  projectId: "1",
  projectName: "Riverside Apartments",
  taskId: "2",
  taskName: "Floor 3 Concrete Pour",
  date: "2024-01-15",
  photos: ["photo1.jpg", "photo2.jpg"],
  notes: "Completed concrete pouring for Floor 3, Section B.",
  aiSummary: "Completed concrete pouring for Floor 3, Section B. Weather conditions were favorable with 28°C temperature. 15 workers on site. Used 45 bags of cement and 2 truckloads of concrete mix.",
  createdBy: "user_123",
  createdAt: new Date().toISOString(),
  status: "submitted",
  synced: false,
};

// ============================================
// USER DATA
// ============================================

export const users = [
  {
    id: "user_123",
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    role: "engineer",
    email: "rajesh.kumar@offsite.com",
    assignedProjects: ["1", "2"],
  },
  {
    id: "user_456",
    name: "Amit Singh",
    phone: "+91 98765 43211",
    role: "engineer",
    email: "amit.singh@offsite.com",
    assignedProjects: ["2", "3"],
  },
  {
    id: "manager_001",
    name: "Vikram Sharma",
    phone: "+91 98765 43212",
    role: "manager",
    email: "vikram.sharma@offsite.com",
    assignedProjects: ["1", "2", "3"],
  },
  {
    id: "owner_001",
    name: "Priya Patel",
    phone: "+91 98765 43213",
    role: "owner",
    email: "priya.patel@offsite.com",
    assignedProjects: ["1", "2", "3"],
  },
];

// ============================================
// SYNC DATA STRUCTURE
// ============================================

export const syncItemExample = {
  id: "sync_001",
  type: "dpr", // 'dpr' | 'attendance' | 'material' | 'approval'
  data: {
    id: "dpr_001",
    projectId: "1",
    taskId: "2",
    // ... other data
  },
  timestamp: Date.now(),
  synced: false,
  createdAt: new Date().toISOString(),
};

// ============================================
// EXPORT ALL DATA
// ============================================

export default {
  projects,
  projectList,
  tasks,
  materials,
  pendingMaterialRequests,
  pendingApprovals,
  historyApprovals,
  invoices,
  insights,
  delayRisks,
  materialUsageChartData,
  projectProgressChartData,
  recentActivity,
  projectOverview,
  attendanceRecords,
  dprExample,
  users,
  syncItemExample,
};

