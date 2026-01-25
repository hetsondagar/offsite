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
import { Wallet, TrendingUp, TrendingDown, Plus, Building2, IndianRupee } from "lucide-react";

type ProjectType = "VILLA" | "FLAT" | "BUNGALOW";

type Client = {
  id: string;
  name: string;
  phone: string;
  amountPaid: number;
  createdAt: string;
};

type ExpenseManagerState = {
  projectType: ProjectType;
  unitCount: number;
  profitMarginPercent: number;
  clients: Client[];
};

const STORAGE_KEY = "offsite_owner_expense_manager_v1";

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

const MOCK_PROJECT = {
  id: "proj_mock_1",
  name: "Sharma Villa Project",
  location: "Pune, Maharashtra",
  financialYear: "FY 2025-26",
  // Annual costs (INR)
  materialsAnnual: 4850000, // ₹48.5L
  labourAnnual: 3250000, // ₹32.5L
  managersSalaryAnnual: 1200000, // ₹12L
  engineersSalaryAnnual: 900000, // ₹9L
};

function makeInitialState(): ExpenseManagerState {
  return {
    projectType: "VILLA",
    unitCount: 1,
    profitMarginPercent: 18,
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

export default function OwnerExpenseManagerPage() {
  const navigate = useNavigate();
  const role = useAppSelector((s) => s.auth.role);

  const [state, setState] = useState<ExpenseManagerState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return makeInitialState();
      const parsed = JSON.parse(raw) as Partial<ExpenseManagerState>;
      const initial = makeInitialState();
      return {
        projectType: (parsed.projectType as ProjectType) || initial.projectType,
        unitCount: typeof parsed.unitCount === "number" ? parsed.unitCount : initial.unitCount,
        profitMarginPercent:
          typeof parsed.profitMarginPercent === "number"
            ? parsed.profitMarginPercent
            : initial.profitMarginPercent,
        clients: Array.isArray(parsed.clients) ? (parsed.clients as Client[]) : initial.clients,
      };
    } catch {
      return makeInitialState();
    }
  });

  useEffect(() => {
    // Owner-only page
    if (role && role !== "owner") {
      navigate("/", { replace: true });
    }
  }, [role, navigate]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const totals = useMemo(() => {
    const totalSalaries = MOCK_PROJECT.managersSalaryAnnual + MOCK_PROJECT.engineersSalaryAnnual;
    const totalCost = MOCK_PROJECT.materialsAnnual + MOCK_PROJECT.labourAnnual + totalSalaries;

    const unitCount = Math.max(1, Math.floor(state.unitCount));
    const margin = clamp(state.profitMarginPercent, 0, 100);

    const targetRevenue = Math.round(totalCost * (1 + margin / 100));
    const perUnitCost = Math.round(totalCost / unitCount);
    const perUnitSelling = Math.round(targetRevenue / unitCount);

    const totalReceived = state.clients.reduce((sum, c) => sum + (Number(c.amountPaid) || 0), 0);
    const profitNow = totalReceived - totalCost;
    const netCashOutflow = totalCost - totalReceived;

    const outstandingToCollect = Math.max(0, targetRevenue - totalReceived);
    const profitAtTarget = targetRevenue - totalCost;

    return {
      totalSalaries,
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
    };
  }, [state.unitCount, state.profitMarginPercent, state.clients]);

  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);

  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAmount, setNewClientAmount] = useState("");

  const onChangeProjectType = (value: string) => {
    const nextType = (value as ProjectType) || "VILLA";
    setState((prev) => ({
      ...prev,
      projectType: nextType,
      unitCount: getDefaultUnitCount(nextType),
    }));
  };

  const addClient = () => {
    const name = newClientName.trim();
    const phone = newClientPhone.trim().replace(/\s+/g, "");
    const amount = safeParseNumber(newClientAmount, 0);

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

    setState((prev) => ({ ...prev, clients: [client, ...prev.clients] }));

    setNewClientName("");
    setNewClientPhone("");
    setNewClientAmount("");
    setIsAddClientOpen(false);
    toast.success("Client added");
  };

  const removeClient = (id: string) => {
    setState((prev) => ({ ...prev, clients: prev.clients.filter((c) => c.id !== id) }));
  };

  const profitLabel = totals.profitNow >= 0 ? "Profit" : "Loss";
  const ProfitIcon = totals.profitNow >= 0 ? TrendingUp : TrendingDown;

  return (
    <MobileLayout role="owner">
      <div className="p-4 space-y-6 safe-area-top">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expense Manager</h1>
            <p className="text-sm text-muted-foreground">
              Owner-only financial overview (mock data, INR)
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>Back</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {MOCK_PROJECT.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>📍 Location: {MOCK_PROJECT.location}</p>
            <p>🗓️ Year: {MOCK_PROJECT.financialYear}</p>
            <p className="flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total Investment: <span className="font-semibold text-foreground">{formatINR(totals.totalCost)}</span>
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee className="w-5 h-5" /> Annual Cost of Materials Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatINR(MOCK_PROJECT.materialsAnnual)}</div>
              <div className="text-xs text-muted-foreground">Cement, steel, sand, tiles, electrical, plumbing</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee className="w-5 h-5" /> Annual Cost of Labour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatINR(MOCK_PROJECT.labourAnnual)}</div>
              <div className="text-xs text-muted-foreground">Masons, helpers, carpenters, painters</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee className="w-5 h-5" /> Annual Cost of Managers Salary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatINR(MOCK_PROJECT.managersSalaryAnnual)}</div>
              <div className="text-xs text-muted-foreground">Project Managers (mock)</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <IndianRupee className="w-5 h-5" /> Annual Cost of Engineers Salary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatINR(MOCK_PROJECT.engineersSalaryAnnual)}</div>
              <div className="text-xs text-muted-foreground">Site Engineers (mock)</div>
            </CardContent>
          </Card>
        </div>

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
                    <Select value={state.projectType} onValueChange={onChangeProjectType}>
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
                        value={String(state.unitCount)}
                        onChange={(e) =>
                          setState((prev) => ({
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
                        value={String(state.profitMarginPercent)}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            profitMarginPercent: clamp(safeParseNumber(e.target.value, prev.profitMarginPercent), 0, 100),
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
                        <span className="text-muted-foreground">Per {state.projectType === "FLAT" ? "Flat" : state.projectType === "VILLA" ? "Villa" : "Bungalow"} Cost</span>
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
                  {state.projectType === "FLAT" ? "Flat" : state.projectType === "VILLA" ? "Villa" : "Bungalow"}
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
            <CardTitle className="text-base">Clients (Mock, 1 project)</CardTitle>
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
            {state.clients.length === 0 ? (
              <div className="text-sm text-muted-foreground">No clients added.</div>
            ) : (
              <div className="space-y-3">
                {state.clients.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border bg-card flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">📞 {c.phone}</div>
                      <div className="text-sm">Paid: <span className="font-semibold">{formatINR(c.amountPaid)}</span></div>
                      <div className="text-[11px] text-muted-foreground">{new Date(c.createdAt).toLocaleString("en-IN")}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => removeClient(c.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

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

        <div className="text-xs text-muted-foreground">
          Note: This is a mock, owner-only expense manager for one project. All values are INR and stored locally on this device.
        </div>
      </div>
    </MobileLayout>
  );
}
