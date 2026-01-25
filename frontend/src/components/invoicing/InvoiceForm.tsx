import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { invoicesApi, Invoice, BillingPeriod, Supplier, Client } from '@/services/api/invoices';
import { projectsApi } from '@/services/api/projects';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
  _id: string;
  name: string;
  location: string;
}

type FormStep = 'select-project' | 'billing-period' | 'supplier' | 'client' | 'review';

interface FormData {
  projectId?: string;
  billingPeriod?: BillingPeriod;
  gstRate: number;
  supplier?: Supplier;
  client?: Client;
  notes?: string;
}

interface InvoiceFormProps {
  onInvoiceCreated: (invoice: Invoice) => void;
  onCancel: () => void;
  editInvoice?: Invoice; // For edit mode
}

export function InvoiceForm({ onInvoiceCreated, onCancel, editInvoice }: InvoiceFormProps) {
  const { t } = useTranslation();
  const isEditMode = !!editInvoice;
  const [step, setStep] = useState<FormStep>('select-project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    gstRate: 18,
  });

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsApi.getAll();
        setProjects(data?.projects || []);
      } catch (error) {
        console.error('Error loading projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };
    loadProjects();
  }, []);

  // Populate form data when editing
  useEffect(() => {
    if (editInvoice) {
      const projectId = typeof editInvoice.projectId === 'object' 
        ? editInvoice.projectId._id 
        : editInvoice.projectId;
      
      setFormData({
        projectId,
        billingPeriod: editInvoice.billingPeriod,
        gstRate: editInvoice.gstRate,
        supplier: editInvoice.supplier,
        client: editInvoice.client,
        notes: editInvoice.notes,
      });
    }
  }, [editInvoice]);

  const handleSelectProject = (projectId: string) => {
    setFormData((prev) => ({ ...prev, projectId }));
    setStep('billing-period');
  };

  const handleBillingPeriod = (from: string, to: string) => {
    if (new Date(from) >= new Date(to)) {
      toast.error(t('invoices.endDateMustBeAfterStartDate'));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      billingPeriod: { from, to },
    }));
    setStep('supplier');
  };

  const handleSupplierInfo = (supplier: Supplier) => {
    setFormData((prev) => ({ ...prev, supplier }));
    setStep('client');
  };

  const handleClientInfo = (client: Client) => {
    setFormData((prev) => ({ ...prev, client }));
    setStep('review');
  };

  const handleSubmit = async () => {
    if (!formData.projectId || !formData.billingPeriod || !formData.supplier || !formData.client) {
      toast.error(t('invoices.pleaseFillAllRequiredFields'));
      return;
    }

    try {
      setIsSubmitting(true);
      
      let invoice;
      if (isEditMode && editInvoice) {
        invoice = await invoicesApi.update(editInvoice._id, {
          projectId: formData.projectId,
          billingPeriod: formData.billingPeriod,
          gstRate: formData.gstRate,
          supplier: formData.supplier,
          client: formData.client,
          notes: formData.notes,
        });
        toast.success(t('invoices.invoiceUpdatedSuccess'));
      } else {
        invoice = await invoicesApi.create({
          projectId: formData.projectId,
          billingPeriod: formData.billingPeriod,
          gstRate: formData.gstRate,
          supplier: formData.supplier,
          client: formData.client,
          notes: formData.notes,
        });
        toast.success(t('invoices.invoiceCreatedSuccess'));
      }
      
      onInvoiceCreated(invoice);
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${isEditMode ? 'update' : 'create'} invoice`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps: FormStep[] = ['select-project', 'billing-period', 'supplier', 'client', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const canGoBack = currentStepIndex > 0;
  const canGoNext = currentStepIndex < steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-4">
        {steps.map((s, idx) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all',
                idx <= currentStepIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {idx < currentStepIndex ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'h-1 flex-1 mx-2 transition-all',
                  idx < currentStepIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode && 'Edit Invoice - '}
            {step === 'select-project' && 'Select Project'}
            {step === 'billing-period' && 'Billing Period'}
            {step === 'supplier' && 'Supplier Details'}
            {step === 'client' && 'Client Details'}
            {step === 'review' && 'Review Invoice'}
          </CardTitle>
          <CardDescription>
            {step === 'select-project' && 'Choose a project to create an invoice for'}
            {step === 'billing-period' && 'Define the billing period for this invoice'}
            {step === 'supplier' && 'Enter your company details'}
            {step === 'client' && 'Enter the client details'}
            {step === 'review' && `Review and ${isEditMode ? 'update' : 'finalize'} your invoice`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading && step === 'select-project' ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Select Project */}
              {step === 'select-project' && (
                <div className="grid grid-cols-1 gap-3">
                  {projects.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No projects available</p>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project._id}
                        onClick={() => handleSelectProject(project._id)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all text-left',
                          formData.projectId === project._id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <p className="font-medium text-foreground">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.location}</p>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Billing Period */}
              {step === 'billing-period' && (
                <BillingPeriodForm
                  onSubmit={handleBillingPeriod}
                  defaultFrom={formData.billingPeriod?.from}
                  defaultTo={formData.billingPeriod?.to}
                />
              )}

              {/* Supplier Details */}
              {step === 'supplier' && (
                <SupplierForm
                  onSubmit={handleSupplierInfo}
                  defaultData={formData.supplier}
                  gstRate={formData.gstRate}
                  onGstRateChange={(rate) => setFormData((prev) => ({ ...prev, gstRate: rate }))}
                />
              )}

              {/* Client Details */}
              {step === 'client' && (
                <ClientForm
                  onSubmit={handleClientInfo}
                  defaultData={formData.client}
                />
              )}

              {/* Review */}
              {step === 'review' && (
                <InvoiceReview
                  formData={formData}
                  notes={formData.notes}
                  onNotesChange={(notes) => setFormData((prev) => ({ ...prev, notes }))}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex gap-2">
        {canGoBack && (
          <Button
            variant="outline"
            onClick={() => setStep(steps[currentStepIndex - 1])}
            disabled={isSubmitting}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        {canGoNext ? (
          <Button
            onClick={() => {
              if (step === 'select-project' && !formData.projectId) {
                toast.error('Please select a project');
                return;
              }
              setStep(steps[currentStepIndex + 1]);
            }}
            disabled={isSubmitting}
            className="flex-1"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isEditMode ? 'Update Invoice' : 'Create Invoice'}
              </>
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

// Sub-component: Billing Period Form
function BillingPeriodForm({
  onSubmit,
  defaultFrom,
  defaultTo,
}: {
  onSubmit: (from: string, to: string) => void;
  defaultFrom?: string;
  defaultTo?: string;
}) {
  const [from, setFrom] = useState(defaultFrom || '');
  const [to, setTo] = useState(defaultTo || '');

  const handleSubmit = () => {
    if (!from || !to) {
      toast.error(t('invoices.pleaseSelectBothDates'));
      return;
    }
    onSubmit(from, to);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full"
        />
      </div>
      <Button onClick={handleSubmit} className="w-full">
        Continue
      </Button>
    </div>
  );
}

// Sub-component: Supplier Form
function SupplierForm({
  onSubmit,
  defaultData,
  gstRate,
  onGstRateChange,
}: {
  onSubmit: (supplier: Supplier) => void;
  defaultData?: Supplier;
  gstRate: number;
  onGstRateChange: (rate: number) => void;
}) {
  const [companyName, setCompanyName] = useState(defaultData?.companyName || '');
  const [address, setAddress] = useState(defaultData?.address || '');
  const [gstin, setGstin] = useState(defaultData?.gstin || '');
  const [state, setState] = useState(defaultData?.state || '');

  const handleSubmit = () => {
    if (!companyName || !address || !gstin || !state) {
      toast.error(t('invoices.pleaseFillAllRequiredFields'));
      return;
    }
    onSubmit({ companyName, address, gstin, state });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Company Name *</label>
        <Input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Your company name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Address *</label>
        <Textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full address"
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">GSTIN *</label>
        <Input
          value={gstin}
          onChange={(e) => setGstin(e.target.value.toUpperCase())}
          placeholder="15-digit GSTIN"
          maxLength={15}
        />
        <p className="text-xs text-muted-foreground mt-1">Format: NNNNNNNNNNNNNN (15 digits)</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">State *</label>
        <Input
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">GST Rate (%)</label>
        <Input
          type="number"
          value={gstRate}
          onChange={(e) => onGstRateChange(parseFloat(e.target.value) || 18)}
          min="0"
          max="100"
          step="0.1"
        />
      </div>
      <Button onClick={handleSubmit} className="w-full">
        Continue
      </Button>
    </div>
  );
}

// Sub-component: Client Form
function ClientForm({
  onSubmit,
  defaultData,
}: {
  onSubmit: (client: Client) => void;
  defaultData?: Client;
}) {
  const [name, setName] = useState(defaultData?.name || '');
  const [address, setAddress] = useState(defaultData?.address || '');
  const [gstin, setGstin] = useState(defaultData?.gstin || '');
  const [state, setState] = useState(defaultData?.state || '');

  const handleSubmit = () => {
    if (!name || !address || !state) {
      toast.error(t('invoices.pleaseFillAllRequiredFields'));
      return;
    }
    onSubmit({ name, address, gstin: gstin || undefined, state });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Client Name *</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Address *</label>
        <Textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full address"
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">GSTIN</label>
        <Input
          value={gstin}
          onChange={(e) => setGstin(e.target.value.toUpperCase())}
          placeholder="15-digit GSTIN (optional)"
          maxLength={15}
        />
        <p className="text-xs text-muted-foreground mt-1">Optional - required for GST-registered clients</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">State *</label>
        <Input
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State name"
        />
      </div>
      <Button onClick={handleSubmit} className="w-full">
        Continue
      </Button>
    </div>
  );
}

// Sub-component: Review
function InvoiceReview({
  formData,
  notes,
  onNotesChange,
}: {
  formData: FormData;
  notes?: string;
  onNotesChange: (notes: string) => void;
}) {
  const project = formData.projectId;
  const billingPeriod = formData.billingPeriod;
  const supplier = formData.supplier;
  const client = formData.client;

  return (
    <div className="space-y-4">
      {/* Project */}
      <div className="p-3 rounded-xl bg-muted/50">
        <p className="text-xs font-medium text-muted-foreground mb-1">Project</p>
        <p className="text-sm font-medium text-foreground">{project}</p>
      </div>

      {/* Billing Period */}
      {billingPeriod && (
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">Billing Period</p>
          <p className="text-sm font-medium text-foreground">
            {new Date(billingPeriod.from).toLocaleDateString('en-IN')} to{' '}
            {new Date(billingPeriod.to).toLocaleDateString('en-IN')}
          </p>
        </div>
      )}

      {/* Supplier */}
      {supplier && (
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">Supplier</p>
          <p className="text-sm font-medium text-foreground">{supplier.companyName}</p>
          <p className="text-xs text-muted-foreground">{supplier.address}</p>
          <p className="text-xs text-muted-foreground">GSTIN: {supplier.gstin}</p>
          <p className="text-xs text-muted-foreground">State: {supplier.state}</p>
        </div>
      )}

      {/* Client */}
      {client && (
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">Client</p>
          <p className="text-sm font-medium text-foreground">{client.name}</p>
          <p className="text-xs text-muted-foreground">{client.address}</p>
          {client.gstin && <p className="text-xs text-muted-foreground">GSTIN: {client.gstin}</p>}
          <p className="text-xs text-muted-foreground">State: {client.state}</p>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
        <Textarea
          value={notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add any additional notes..."
          rows={4}
        />
      </div>

      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground mb-1">GST Calculation</p>
        <p className="text-sm font-medium text-foreground">
          {supplier && client && supplier.state === client.state ? (
            <>CGST + SGST ({formData.gstRate}%)</>
          ) : (
            <>IGST ({formData.gstRate}%)</>
          )}
        </p>
      </div>
    </div>
  );
}
