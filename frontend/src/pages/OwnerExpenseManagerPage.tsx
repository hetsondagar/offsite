import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Building2,
  IndianRupee,
  Loader2,
  Brain,
  Sparkles,
  Pencil,
  Trash2,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { projectsApi, Project } from "@/services/api/projects";
import { aiApi, SiteRiskAssessment } from "@/services/api/ai";

type ProjectType = "VILLA" | "FLAT" | "BUNGALOW";

type Client = {
  id: string;
  name: string;
  phone: string;
  amountPaid: number;
  createdAt: string;
};

type ExpenseBucket = {
  id: string;
  name: string;
  amountAnnual: number;
  description?: string;
};

type LocalProject = {
  id: string;
  name: string;
  location?: string;
  financialYear?: string;
  createdAt: string;
  updatedAt: string;
};

type ProjectData = {
  projectType: ProjectType;
  unitCount: number;
  profitMarginPercent: number;
  buckets: ExpenseBucket[];
  clients: Client[];
};

type StoredStateV2 = {
  selectedProjectId: string;
  localProjects: LocalProject[];
  dataByProjectId: Record<string, ProjectData>;
};

const STORAGE_KEY_V1 = "offsite_owner_expense_manager_v1";
const STORAGE_KEY_V2 = "offsite_owner_expense_manager_v2";
const DEMO_PROJECT_ID = "demo:sharma-villa";
const NONE_PROJECT_VALUE = "__none__";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function safeParseNumber(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function getDefaultUnitCount(type: ProjectType): number {
  if (type === "FLAT") return 12;
  return 1;
}

const DEMO_PROJECT = {
  id: DEMO_PROJECT_ID,
  name: "Sharma Villa Project",
  location: "Pune, Maharashtra",
  financialYear: "FY 2025-26",
};

function makeDefaultBucketsFromDefaults(): ExpenseBucket[] {
  return [
    {
      id: "bucket_materials",
      name: "Materials",
      amountAnnual: 4850000,
      description: "Cement, steel, sand, tiles, electrical, plumbing",
    },
    {
      id: "bucket_labour",
      name: "Labour",
      amountAnnual: 3250000,
      description: "Masons, helpers, carpenters, painters",
    },
    {
      id: "bucket_manager_salary",
      name: "Managers Salary",
      amountAnnual: 1200000,
      description: "Project managers and supervision",
    },
    {
      id: "bucket_engineer_salary",
      name: "Engineers Salary",
      amountAnnual: 900000,
      description: "Site engineers and quality checks",
    },
  ];
}

function makeDefaultProjectData(): ProjectData {
  return {
    projectType: "VILLA",
    unitCount: 1,
    profitMarginPercent: 18,
    buckets: makeDefaultBucketsFromDefaults(),
    clients: [
      {
        id: "client_1",
        name: "Aarav Sharma",
        phone: "9876543210",
        amountPaid: 2500000,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, "");
  return safeParseNumber(cleaned, 0);
}

function clampPercent(n: number): number {
  return clamp(n, 0, 100);
}

function ensureValidBuckets(buckets: ExpenseBucket[]): ExpenseBucket[] {
  const safe = Array.isArray(buckets) ? buckets : [];
  return safe
    .filter((b) => b && typeof b === "object" && typeof b.name === "string")
    .map((b) => ({
      id: typeof b.id === "string" && b.id ? b.id : generateId("bucket"),
      name: b.name.trim() || "Untitled",
      amountAnnual: Math.max(0, Math.round(Number(b.amountAnnual) || 0)),
      description: typeof b.description === "string" ? b.description : undefined,
    }));
}

function ensureValidClients(clients: Client[]): Client[] {
  const safe = Array.isArray(clients) ? clients : [];
  return safe
    .filter((c) => c && typeof c === "object" && typeof c.name === "string")
    .map((c) => ({
      id: typeof c.id === "string" && c.id ? c.id : generateId("client"),
      name: c.name,
      phone: typeof c.phone === "string" ? c.phone : "",
      amountPaid: Math.max(0, Math.round(Number(c.amountPaid) || 0)),
      createdAt: typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
    }))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

function migrateV1ToV2(): StoredStateV2 {
  const base: StoredStateV2 = {
    selectedProjectId: DEMO_PROJECT_ID,
    localProjects: [],
    dataByProjectId: {
      [DEMO_PROJECT_ID]: makeDefaultProjectData(),
    },
  };

  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<StoredStateV2>;
      let selected = typeof parsed.selectedProjectId === "string" ? parsed.selectedProjectId : base.selectedProjectId;
      const localProjects = Array.isArray(parsed.localProjects) ? (parsed.localProjects as LocalProject[]) : [];
      const dataByProjectId = (parsed.dataByProjectId && typeof parsed.dataByProjectId === "object")
        ? (parsed.dataByProjectId as Record<string, ProjectData>)
        : {};

      const next: StoredStateV2 = {
        selectedProjectId: selected,
        localProjects: localProjects.filter(Boolean),
        dataByProjectId: { ...base.dataByProjectId },
      };

      for (const [k, v] of Object.entries(dataByProjectId)) {
        if (!v || typeof v !== "object") continue;
        next.dataByProjectId[k] = {
          projectType: (v.projectType as ProjectType) || "VILLA",
          unitCount: typeof v.unitCount === "number" ? v.unitCount : getDefaultUnitCount((v.projectType as ProjectType) || "VILLA"),
          profitMarginPercent: typeof v.profitMarginPercent === "number" ? v.profitMarginPercent : 18,
          buckets: ensureValidBuckets((v as any).buckets || []),
          clients: ensureValidClients((v as any).clients || []),
        };
      }

      // Migrate any legacy demo ID to the current demo ID.
      const legacyKey = Object.keys(next.dataByProjectId).find(
        (k) => k !== DEMO_PROJECT_ID && typeof k === "string" && k.includes("sharma-villa")
      );
      if (legacyKey && !next.dataByProjectId[DEMO_PROJECT_ID]) {
        next.dataByProjectId[DEMO_PROJECT_ID] = next.dataByProjectId[legacyKey];
        delete next.dataByProjectId[legacyKey];
      }

      if (!next.dataByProjectId[DEMO_PROJECT_ID]) {
        next.dataByProjectId[DEMO_PROJECT_ID] = makeDefaultProjectData();
      }

      if (typeof selected === "string" && selected.includes("sharma-villa") && selected !== DEMO_PROJECT_ID) {
        selected = DEMO_PROJECT_ID;
      }

      next.selectedProjectId = selected;

      return next;
    }
  } catch {
    // ignore and fall back
  }

  // Migrate from v1 (single-project state)
  try {
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (!rawV1) return base;

    const parsed = JSON.parse(rawV1) as any;
    const nextDemo: ProjectData = {
      projectType: (parsed?.projectType as ProjectType) || "VILLA",
      unitCount: typeof parsed?.unitCount === "number" ? parsed.unitCount : 1,
      profitMarginPercent: typeof parsed?.profitMarginPercent === "number" ? parsed.profitMarginPercent : 18,
      buckets: makeDefaultBucketsFromDefaults(),
      clients: ensureValidClients(parsed?.clients || makeDefaultProjectData().clients),
    };

    return {
      ...base,
      dataByProjectId: {
        ...base.dataByProjectId,
        [DEMO_PROJECT_ID]: nextDemo,
      },
    };
  } catch {
    return base;
  }
}

export default function OwnerExpenseManagerPage() {
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.role);

  const [stored, setStored] = useState<StoredStateV2>(() => {
    if (typeof window === "undefined") {
      return {
        selectedProjectId: DEMO_PROJECT_ID,
        localProjects: [],
        dataByProjectId: { [DEMO_PROJECT_ID]: makeDefaultProjectData() },
      };
    }
    return migrateV1ToV2();
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [aiRisk, setAiRisk] = useState<SiteRiskAssessment | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  useEffect(() => {
    // Owner-only page
    if (role && role !== "owner") {
      navigate("/", { replace: true });
    }
  }, [role, navigate]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(stored));
    } catch {
      // ignore
    }
  }, [stored]);

  useEffect(() => {
    if (role && role !== "owner") return;
    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true);
        const data = await projectsApi.getAll(1, 200);
        setProjects(data?.projects || []);
      } catch (error: any) {
        toast.error(error?.message || "Failed to load projects");
        setProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    loadProjects();
  }, [role]);

  const selectedProjectId = stored.selectedProjectId || DEMO_PROJECT_ID;

  const selectedProjectMeta = useMemo(() => {
    if (selectedProjectId === DEMO_PROJECT_ID) {
      return {
        id: DEMO_PROJECT.id,
        name: DEMO_PROJECT.name,
        location: DEMO_PROJECT.location,
        financialYear: DEMO_PROJECT.financialYear,
        source: "demo" as const,
      };
    }

    const local = stored.localProjects.find((p) => p.id === selectedProjectId);
    if (local) {
      return {
        id: local.id,
        name: local.name,
        location: local.location,
        financialYear: local.financialYear,
        source: "local" as const,
      };
    }

    const live = projects.find((p: any) => p && (p as any)._id === selectedProjectId) as any;
    if (live) {
      return {
        id: live._id,
        name: live.name || "Project",
        location: live.location,
        financialYear: "FY 2025-26",
        source: "live" as const,
      };
    }

    return {
      id: DEMO_PROJECT.id,
      name: DEMO_PROJECT.name,
      location: DEMO_PROJECT.location,
      financialYear: DEMO_PROJECT.financialYear,
      source: "demo" as const,
    };
  }, [selectedProjectId, stored.localProjects, projects]);

  const activeData: ProjectData = useMemo(() => {
    const existing = stored.dataByProjectId?.[selectedProjectMeta.id];
    if (existing) {
      return {
        projectType: (existing.projectType as ProjectType) || "VILLA",
        unitCount: typeof existing.unitCount === "number" ? existing.unitCount : getDefaultUnitCount((existing.projectType as ProjectType) || "VILLA"),
        profitMarginPercent: typeof existing.profitMarginPercent === "number" ? existing.profitMarginPercent : 18,
        buckets: ensureValidBuckets(existing.buckets || []),
        clients: ensureValidClients(existing.clients || []),
      };
    }

    if (selectedProjectMeta.id === DEMO_PROJECT_ID) return makeDefaultProjectData();
    return {
      ...makeDefaultProjectData(),
      clients: [],
    };
  }, [stored.dataByProjectId, selectedProjectMeta.id]);

  const updateActiveData = (updater: (prev: ProjectData) => ProjectData) => {
    setStored((prev) => {
      const current = prev.dataByProjectId?.[selectedProjectMeta.id] || activeData;
      const next = updater({
        projectType: (current.projectType as ProjectType) || "VILLA",
        unitCount: typeof current.unitCount === "number" ? current.unitCount : 1,
        profitMarginPercent: typeof current.profitMarginPercent === "number" ? current.profitMarginPercent : 18,
        buckets: ensureValidBuckets((current as any).buckets || []),
        clients: ensureValidClients((current as any).clients || []),
      });
      return {
        ...prev,
        dataByProjectId: {
          ...(prev.dataByProjectId || {}),
          [selectedProjectMeta.id]: next,
        },
      };
    });
  };

  useEffect(() => {
    // Load operational AI risk only for live projects
    const isLive = selectedProjectMeta.source === "live";
    if (!isLive) {
      setAiRisk(null);
      return;
    }

    const projectId = selectedProjectMeta.id;
    if (!projectId || projectId === DEMO_PROJECT_ID) return;

    let cancelled = false;
    const run = async () => {
      try {
        setIsLoadingAi(true);
        const data = await aiApi.getSiteRisk(projectId);
        if (!cancelled) setAiRisk(data);
      } catch {
        if (!cancelled) setAiRisk(null);
      } finally {
        if (!cancelled) setIsLoadingAi(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectMeta.id, selectedProjectMeta.source]);

  const totals = useMemo(() => {
    const totalCost = activeData.buckets.reduce((sum, b) => sum + (Number(b.amountAnnual) || 0), 0);

    const unitCount = Math.max(1, Math.floor(activeData.unitCount));
    const margin = clampPercent(activeData.profitMarginPercent);

    const targetRevenue = Math.round(totalCost * (1 + margin / 100));
    const perUnitCost = Math.round(totalCost / unitCount);
    const perUnitSelling = Math.round(targetRevenue / unitCount);

    const totalReceived = activeData.clients.reduce((sum, c) => sum + (Number(c.amountPaid) || 0), 0);
    const profitNow = totalReceived - totalCost;
    const netCashOutflow = totalCost - totalReceived;

    const outstandingToCollect = Math.max(0, targetRevenue - totalReceived);
    const profitAtTarget = targetRevenue - totalCost;

    const topBucket = [...activeData.buckets]
      .sort((a, b) => (b.amountAnnual || 0) - (a.amountAnnual || 0))[0];
    const topBucketShare = totalCost > 0 && topBucket ? Math.round(((topBucket.amountAnnual || 0) / totalCost) * 100) : 0;

    return {
      totalCost,
      unitCount,
      margin,
      targetRevenue,
      perUnitCost,
      perUnitSelling,
      totalReceived,
      profitNow,
      netCashOutflow,
      outstandingToCollect,
      profitAtTarget,
      topBucket,
      topBucketShare,
    };
  }, [activeData]);

  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isAddBucketOpen, setIsAddBucketOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [isEditBucketOpen, setIsEditBucketOpen] = useState(false);
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);

  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAmount, setNewClientAmount] = useState("");

  const [newBucketName, setNewBucketName] = useState("");
  const [newBucketDesc, setNewBucketDesc] = useState("");
  const [newBucketAmount, setNewBucketAmount] = useState("");

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectLocation, setNewProjectLocation] = useState("");
  const [newProjectFY, setNewProjectFY] = useState("FY 2025-26");

  const onChangeProjectType = (value: string) => {
    const nextType = (value as ProjectType) || "VILLA";
    updateActiveData((prev) => ({
      ...prev,
      projectType: nextType,
      unitCount: getDefaultUnitCount(nextType),
    }));
  };

  const onChangeSelectedProject = (value: string) => {
    const next = value && value !== NONE_PROJECT_VALUE ? value : DEMO_PROJECT_ID;
    setStored((prev) => ({ ...prev, selectedProjectId: next }));
  };

  const addClient = () => {
    const name = newClientName.trim();
    const phone = newClientPhone.trim().replace(/\s+/g, "");
    const amount = normalizeCurrencyInput(newClientAmount);

    if (!name) {
      toast.error("Please enter client name");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit Indian phone number");
      return;
    }

    if (amount <= 0) {
      toast.error("Please enter an amount paid (INR)");
      return;
    }

    const client: Client = {
      id: `client_${Date.now()}`,
      name,
      phone,
      amountPaid: Math.round(amount),
      createdAt: new Date().toISOString(),
    };

    updateActiveData((prev) => ({ ...prev, clients: [client, ...prev.clients] }));

    setNewClientName("");
    setNewClientPhone("");
    setNewClientAmount("");
    setIsAddClientOpen(false);
    toast.success("Client added");
  };

  const removeClient = (id: string) => {
    updateActiveData((prev) => ({ ...prev, clients: prev.clients.filter((c) => c.id !== id) }));
  };

  const startEditClient = (id: string) => {
    const c = activeData.clients.find((x) => x.id === id);
    if (!c) return;
    setEditingClientId(id);
    setNewClientName(c.name);
    setNewClientPhone(c.phone);
    setNewClientAmount(String(c.amountPaid));
    setIsEditClientOpen(true);
  };

  const saveClientEdits = () => {
    if (!editingClientId) return;
    const name = newClientName.trim();
    const phone = newClientPhone.trim().replace(/\s+/g, "");
    const amount = normalizeCurrencyInput(newClientAmount);

    if (!name) {
      toast.error("Please enter client name");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      toast.error("Please enter a valid 10-digit Indian phone number");
      return;
    }
    if (amount <= 0) {
      toast.error("Please enter an amount paid (INR)");
      return;
    }

    updateActiveData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) =>
        c.id === editingClientId
          ? { ...c, name, phone, amountPaid: Math.round(amount) }
          : c
      ),
    }));

    setIsEditClientOpen(false);
    setEditingClientId(null);
    setNewClientName("");
    setNewClientPhone("");
    setNewClientAmount("");
    toast.success("Client updated");
  };

  const addBucket = () => {
    const name = newBucketName.trim();
    const amount = normalizeCurrencyInput(newBucketAmount);
    const description = newBucketDesc.trim();

    if (!name) {
      toast.error("Please enter a cost bucket name");
      return;
    }
    if (amount <= 0) {
      toast.error("Please enter an annual amount (INR)");
      return;
    }

    const bucket: ExpenseBucket = {
      id: generateId("bucket"),
      name,
      amountAnnual: Math.round(amount),
      description: description || undefined,
    };

    updateActiveData((prev) => ({ ...prev, buckets: [bucket, ...prev.buckets] }));
    setNewBucketName("");
    setNewBucketAmount("");
    setNewBucketDesc("");
    setIsAddBucketOpen(false);
    toast.success("Cost bucket added");
  };

  const startEditBucket = (id: string) => {
    const b = activeData.buckets.find((x) => x.id === id);
    if (!b) return;
    setEditingBucketId(id);
    setNewBucketName(b.name);
    setNewBucketAmount(String(b.amountAnnual));
    setNewBucketDesc(b.description || "");
    setIsEditBucketOpen(true);
  };

  const saveBucketEdits = () => {
    if (!editingBucketId) return;
    const name = newBucketName.trim();
    const amount = normalizeCurrencyInput(newBucketAmount);
    const description = newBucketDesc.trim();

    if (!name) {
      toast.error("Please enter a cost bucket name");
      return;
    }
    if (amount <= 0) {
      toast.error("Please enter an annual amount (INR)");
      return;
    }

    updateActiveData((prev) => ({
      ...prev,
      buckets: prev.buckets.map((b) =>
        b.id === editingBucketId
          ? { ...b, name, amountAnnual: Math.round(amount), description: description || undefined }
          : b
      ),
    }));

    setIsEditBucketOpen(false);
    setEditingBucketId(null);
    setNewBucketName("");
    setNewBucketAmount("");
    setNewBucketDesc("");
    toast.success("Cost bucket updated");
  };

  const removeBucket = (id: string) => {
    updateActiveData((prev) => ({ ...prev, buckets: prev.buckets.filter((b) => b.id !== id) }));
  };

  const resetToDefaults = () => {
    if (selectedProjectMeta.id !== DEMO_PROJECT_ID) return;
    updateActiveData(() => makeDefaultProjectData());
    toast.success("Defaults reset");
  };

  const addLocalProject = () => {
    const name = newProjectName.trim();
    const location = newProjectLocation.trim();
    const financialYear = newProjectFY.trim();

    if (!name) {
      toast.error("Please enter project name");
      return;
    }

    const now = new Date().toISOString();
    const id = `local:${generateId("project")}`;
    const project: LocalProject = {
      id,
      name,
      location: location || undefined,
      financialYear: financialYear || undefined,
      createdAt: now,
      updatedAt: now,
    };

    setStored((prev) => ({
      ...prev,
      localProjects: [project, ...(prev.localProjects || [])],
      selectedProjectId: id,
      dataByProjectId: {
        ...(prev.dataByProjectId || {}),
        [id]: {
          ...makeDefaultProjectData(),
          clients: [],
        },
      },
    }));

    setNewProjectName("");
    setNewProjectLocation("");
    setNewProjectFY("FY 2025-26");
    setIsAddProjectOpen(false);
    toast.success("Project added");
  };

  const deleteLocalProject = (id: string) => {
    setStored((prev) => {
      const localProjects = (prev.localProjects || []).filter((p) => p.id !== id);
      const nextData = { ...(prev.dataByProjectId || {}) };
      delete nextData[id];
      const selectedProjectId = prev.selectedProjectId === id ? DEMO_PROJECT_ID : prev.selectedProjectId;
      return {
        ...prev,
        localProjects,
        dataByProjectId: nextData,
        selectedProjectId,
      };
    });
    toast.success("Project removed");
  };

  const profitLabel = totals.profitNow >= 0 ? "Profit" : "Loss";
  const ProfitIcon = totals.profitNow >= 0 ? TrendingUp : TrendingDown;

  const financeInsights = useMemo(() => {
    const lines: Array<{ title: string; detail: string; tone: "good" | "warn" | "neutral" }> = [];
    const total = totals.totalCost;
    const received = totals.totalReceived;
    const outflow = Math.max(0, totals.netCashOutflow);

    const monthlyBurn = total > 0 ? Math.round(total / 12) : 0;
    lines.push({
      title: "Estimated burn rate",
      detail: `${formatINR(monthlyBurn)} / month based on annual costs.`,
      tone: "neutral",
    });

    if (totals.topBucket && totals.topBucketShare >= 55) {
      lines.push({
        title: "Cost concentration risk",
        detail: `${totals.topBucket.name} is ~${totals.topBucketShare}% of your annual cost. Consider splitting this into sub-buckets and tracking vendor-wise.`,
        tone: "warn",
      });
    } else if (totals.topBucket) {
      lines.push({
        title: "Cost concentration",
        detail: `${totals.topBucket.name} is your largest bucket (~${totals.topBucketShare}%).`,
        tone: "neutral",
      });
    }

    if (received === 0 && total > 0) {
      lines.push({
        title: "Collection status",
        detail: "No client payments recorded yet. Add client advances to see real-time profit/loss.",
        tone: "warn",
      });
    } else if (outflow > 0) {
      lines.push({
        title: "Cashflow gap",
        detail: `You are currently funding ~${formatINR(outflow)} from your side.`,
        tone: "warn",
      });
    } else {
      lines.push({
        title: "Cashflow",
        detail: "Client payments cover your recorded investment so far.",
        tone: "good",
      });
    }

    const margin = totals.margin;
    if (margin < 10) {
      lines.push({
        title: "Margin looks low",
        detail: `Profit cut is ${margin}%. Many projects need buffer for delays and price volatility.`,
        tone: "warn",
      });
    } else if (margin > 35) {
      lines.push({
        title: "Margin looks aggressive",
        detail: `Profit cut is ${margin}%. Ensure the selling price is realistic for your client and market.`,
        tone: "neutral",
      });
    } else {
      lines.push({
        title: "Margin sanity",
        detail: `Profit cut is ${margin}%. Target profit at full collection is ${formatINR(totals.profitAtTarget)}.`,
        tone: "good",
      });
    }

    return lines;
  }, [totals]);

  return (
    <MobileLayout role="owner">
      <div className="p-4 space-y-6 safe-area-top">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expense Manager</h1>
            <p className="text-sm text-muted-foreground">Owner-only financial overview (INR)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>Back</Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Project
            </CardTitle>
            <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Add Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="e.g. Mehta Heights" />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={newProjectLocation} onChange={(e) => setNewProjectLocation(e.target.value)} placeholder="e.g. Pune, Maharashtra" />
                  </div>
                  <div className="space-y-2">
                    <Label>Financial Year</Label>
                    <Input value={newProjectFY} onChange={(e) => setNewProjectFY(e.target.value)} placeholder="e.g. FY 2025-26" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddProjectOpen(false)}>Cancel</Button>
                    <Button onClick={addLocalProject}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Select project</Label>
                <Select value={selectedProjectMeta.id} onValueChange={onChangeSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEMO_PROJECT_ID}>{DEMO_PROJECT.name}</SelectItem>
                    {stored.localProjects.length > 0 ? (
                      stored.localProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          Custom: {p.name}
                        </SelectItem>
                      ))
                    ) : null}
                    {projects.filter(Boolean).map((p: any) => (
                      <SelectItem key={p._id} value={p._id}>
                        Live: {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isLoadingProjects ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading projects...
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Data controls</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedProjectMeta.id === DEMO_PROJECT_ID ? (
                    <Button variant="outline" onClick={resetToDefaults}>
                      Reset defaults
                    </Button>
                  ) : null}
                  {selectedProjectMeta.source === "local" ? (
                    <Button variant="destructive" onClick={() => deleteLocalProject(selectedProjectMeta.id)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete project
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedProjectMeta.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {selectedProjectMeta.location ? <p>📍 Location: {selectedProjectMeta.location}</p> : null}
            {selectedProjectMeta.financialYear ? <p>🗓️ Year: {selectedProjectMeta.financialYear}</p> : null}
            <p className="flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total Investment: <span className="font-semibold text-foreground">{formatINR(totals.totalCost)}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Annual Cost Buckets
            </CardTitle>
            <Dialog open={isAddBucketOpen} onOpenChange={setIsAddBucketOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Add Bucket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Cost Bucket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bucket Name</Label>
                    <Input value={newBucketName} onChange={(e) => setNewBucketName(e.target.value)} placeholder="e.g. Site Rent / Equipment / Fuel" />
                  </div>
                  <div className="space-y-2">
                    <Label>Annual Amount (INR)</Label>
                    <Input value={newBucketAmount} onChange={(e) => setNewBucketAmount(e.target.value)} placeholder="e.g. 350000" inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input value={newBucketDesc} onChange={(e) => setNewBucketDesc(e.target.value)} placeholder="What is included?" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddBucketOpen(false)}>Cancel</Button>
                    <Button onClick={addBucket}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {activeData.buckets.length === 0 ? (
              <div className="text-sm text-muted-foreground">No buckets added yet.</div>
            ) : (
              <div className="space-y-3">
                {activeData.buckets.map((b) => {
                  const share = totals.totalCost > 0 ? Math.round(((b.amountAnnual || 0) / totals.totalCost) * 100) : 0;
                  return (
                    <div key={b.id} className="p-3 rounded-lg border bg-card flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-foreground truncate">{b.name}</div>
                          <div className="text-sm font-semibold">{formatINR(b.amountAnnual)}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{b.description || `${share}% of total cost`}</div>
                        <div className="h-2 rounded bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEditBucket(b.id)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => removeBucket(b.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Dialog open={isEditBucketOpen} onOpenChange={setIsEditBucketOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Cost Bucket</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bucket Name</Label>
                    <Input value={newBucketName} onChange={(e) => setNewBucketName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Annual Amount (INR)</Label>
                    <Input value={newBucketAmount} onChange={(e) => setNewBucketAmount(e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input value={newBucketDesc} onChange={(e) => setNewBucketDesc(e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditBucketOpen(false)}>Cancel</Button>
                    <Button onClick={saveBucketEdits}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Pricing & Project Type</CardTitle>
            <Dialog open={isPricingOpen} onOpenChange={setIsPricingOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Configure</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Project Type & Selling Price</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Project Type</Label>
                    <Select value={activeData.projectType} onValueChange={onChangeProjectType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VILLA">Villa</SelectItem>
                        <SelectItem value="FLAT">Flat</SelectItem>
                        <SelectItem value="BUNGALOW">Bungalow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Units (for cost split)</Label>
                      <Input
                        inputMode="numeric"
                        value={String(activeData.unitCount)}
                        onChange={(e) =>
                          updateActiveData((prev) => ({
                            ...prev,
                            unitCount: clamp(Math.floor(safeParseNumber(e.target.value, prev.unitCount)), 1, 500),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Villa/Bungalow usually 1, Flats can be 4–50
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Profit Cut (%)</Label>
                      <Input
                        inputMode="decimal"
                        value={String(activeData.profitMarginPercent)}
                        onChange={(e) =>
                          updateActiveData((prev) => ({
                            ...prev,
                            profitMarginPercent: clampPercent(safeParseNumber(e.target.value, prev.profitMarginPercent)),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">This adds margin over total cost</p>
                    </div>
                  </div>

                  <Card>
                    <CardContent className="pt-6 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Cost</span>
                        <span className="font-semibold">{formatINR(totals.totalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target Revenue</span>
                        <span className="font-semibold">{formatINR(totals.targetRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Per {activeData.projectType === "FLAT" ? "Flat" : activeData.projectType === "VILLA" ? "Villa" : "Bungalow"} Cost</span>
                        <span className="font-semibold">{formatINR(totals.perUnitCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Per Unit Selling Price</span>
                        <span className="font-semibold">{formatINR(totals.perUnitSelling)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit at Target</span>
                        <span className="font-semibold">{formatINR(totals.profitAtTarget)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsPricingOpen(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Project Type</div>
                <div className="font-semibold">
                  {activeData.projectType === "FLAT" ? "Flat" : activeData.projectType === "VILLA" ? "Villa" : "Bungalow"}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Units</div>
                <div className="font-semibold">{totals.unitCount}</div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Per Unit Selling Price (with profit)</div>
                <div className="font-semibold">{formatINR(totals.perUnitSelling)}</div>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground">Target Revenue</div>
                <div className="font-semibold">{formatINR(totals.targetRevenue)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Received</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatINR(totals.totalReceived)}</div>
              <div className="text-xs text-muted-foreground">From clients (advance + payments)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ProfitIcon className="w-5 h-5" /> {profitLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={"text-2xl font-bold " + (totals.profitNow >= 0 ? "text-green-600" : "text-red-600")}>
                {formatINR(Math.abs(totals.profitNow))}
              </div>
              <div className="text-xs text-muted-foreground">Current profit/loss = received − investment</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Outstanding to Collect</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatINR(totals.outstandingToCollect)}</div>
              <div className="text-xs text-muted-foreground">Target revenue − received</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Clients</CardTitle>
            <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Add Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client Name (Indian)</Label>
                    <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="e.g. Priya Mehta" />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="10-digit mobile number" inputMode="numeric" />
                  </div>

                  <div className="space-y-2">
                    <Label>Amount Paid (INR)</Label>
                    <Input value={newClientAmount} onChange={(e) => setNewClientAmount(e.target.value)} placeholder="e.g. 1500000" inputMode="numeric" />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddClientOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addClient}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {activeData.clients.length === 0 ? (
              <div className="text-sm text-muted-foreground">No clients added.</div>
            ) : (
              <div className="space-y-3">
                {activeData.clients.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border bg-card flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">📞 {c.phone}</div>
                      <div className="text-sm">Paid: <span className="font-semibold">{formatINR(c.amountPaid)}</span></div>
                      <div className="text-[11px] text-muted-foreground">{new Date(c.createdAt).toLocaleString("en-IN")}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEditClient(c.id)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => removeClient(c.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Dialog open={isEditClientOpen} onOpenChange={setIsEditClientOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Client</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Paid (INR)</Label>
                    <Input value={newClientAmount} onChange={(e) => setNewClientAmount(e.target.value)} inputMode="numeric" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditClientOpen(false)}>Cancel</Button>
                    <Button onClick={saveClientEdits}>Save</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="mt-4 p-3 rounded-lg bg-muted text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Cash Outflow</span>
                <span className="font-semibold">{formatINR(Math.max(0, totals.netCashOutflow))}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Target Profit (at full collection)</span>
                <span className="font-semibold">{formatINR(totals.profitAtTarget)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5" /> AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Financial signals
                  </div>
                  <div className="text-xs text-muted-foreground">Auto-generated from your buckets + client payments</div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {financeInsights.map((i, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    {i.tone === "warn" ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    ) : i.tone === "good" ? (
                      <TrendingUp className="w-4 h-4 text-green-600 mt-0.5" />
                    ) : (
                      <IndianRupee className="w-4 h-4 text-muted-foreground mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium">{i.title}</div>
                      <div className="text-xs text-muted-foreground">{i.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedProjectMeta.source === "live" ? (
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-foreground">Operational risk (AI)</div>
                    <div className="text-xs text-muted-foreground">Signals from site activity that can impact cost/time</div>
                  </div>
                  {isLoadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                </div>

                {aiRisk ? (
                  <div className="mt-3 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk level</span>
                      <span className="font-semibold">{aiRisk.aiAnalysis?.riskLevel || aiRisk.riskLevel}</span>
                    </div>
                    {aiRisk.aiAnalysis?.summary ? (
                      <div className="text-xs text-muted-foreground">{aiRisk.aiAnalysis.summary}</div>
                    ) : null}
                    {Array.isArray(aiRisk.aiAnalysis?.recommendations) && aiRisk.aiAnalysis.recommendations.length > 0 ? (
                      <div className="text-xs">
                        <div className="font-medium">Recommendations</div>
                        <ul className="list-disc pl-5 text-muted-foreground">
                          {aiRisk.aiAnalysis.recommendations.slice(0, 4).map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-muted-foreground">No AI risk data available for this project right now.</div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
