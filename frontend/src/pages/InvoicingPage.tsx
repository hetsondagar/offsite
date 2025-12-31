import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { usePermissions } from "@/hooks/usePermissions";
import { AlertCircle } from "lucide-react";
import { 
  ArrowLeft, 
  Download,
  FileText,
  Calendar,
  Building2,
  ChevronRight,
  Receipt
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const invoices = [
  {
    id: "INV-2024-001",
    project: "Riverside Apartments",
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

export default function InvoicingPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);

  // Check permission
  useEffect(() => {
    if (!hasPermission("canViewInvoices") && !hasPermission("canManageInvoices")) {
      navigate("/");
    }
  }, [hasPermission, navigate]);

  const selectedInvoiceData = invoices.find(inv => inv.id === selectedInvoice);

  const handleDownload = (invoiceId: string) => {
    // Mock download
    console.log(`Downloading invoice ${invoiceId}`);
  };

  // Permission check
  if (!hasPermission("canViewInvoices") && !hasPermission("canManageInvoices")) {
    return (
      <MobileLayout role="manager">
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Access Denied
              </h2>
              <p className="text-sm text-muted-foreground">
                You don't have permission to view invoices. Only Owners/Admins can access this page.
              </p>
              <Button onClick={() => navigate("/")} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout role="manager">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="-ml-2">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 ml-0">
              <h1 className="font-display font-semibold text-lg">Invoices</h1>
              <p className="text-xs text-muted-foreground">GST-ready invoicing</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {invoices.map((invoice, index) => (
            <motion.div
              key={invoice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                variant="gradient"
                className={cn(
                  "cursor-pointer transition-all duration-300",
                  "hover:border-primary/30 hover:shadow-glow-sm",
                  selectedInvoice === invoice.id && "border-primary shadow-glow-md"
                )}
                onClick={() => setSelectedInvoice(selectedInvoice === invoice.id ? null : invoice.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt className="w-4 h-4 text-primary" />
                        <h3 className="font-display font-semibold text-foreground">
                          {invoice.id}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{invoice.project}</p>
                    </div>
                    <StatusBadge 
                      status={invoice.status === "paid" ? "success" : "pending"}
                      label={invoice.status}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(invoice.date).toLocaleDateString()}
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-lg text-foreground">
                        ₹{invoice.total.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        GST: ₹{invoice.gst.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {selectedInvoice === invoice.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-border/50 space-y-4"
                    >
                      {/* Items Breakdown */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Items</h4>
                        {invoice.items.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-muted/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">{item.name}</span>
                              <span className="text-sm font-medium text-foreground">
                                ₹{item.amount.toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Qty: {item.qty} × ₹{item.rate.toLocaleString('en-IN')}</span>
                              <span>GST {item.gst}%: ₹{((item.amount * item.gst) / 100).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* GST Breakdown */}
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <h4 className="text-sm font-medium text-foreground mb-2">GST Breakdown</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium text-foreground">
                              ₹{invoice.amount.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">GST (18%)</span>
                            <span className="font-medium text-foreground">
                              ₹{invoice.gst.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-border/30">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="font-display font-bold text-lg text-foreground">
                              ₹{invoice.total.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(invoice.id);
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Invoice
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}

