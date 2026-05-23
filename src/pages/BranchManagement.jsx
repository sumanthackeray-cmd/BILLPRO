import { useState, useEffect } from 'react';
import {
  Plus, Edit2, Trash2, MapPin, Phone,
  Building2, GitBranch, CheckCircle, AlertCircle, Store, Warehouse, Landmark, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createBranch, getAllBranches, updateBranch, deactivateBranch } from '@/api/branchService';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/LanguageContext';

const BRANCH_TYPES = [
  { value: 'HQ', label: 'Head Quarters', icon: Landmark, color: 'text-purple-400' },
  { value: 'Store', label: 'Retail Store', icon: Store, color: 'text-amber-400' },
  { value: 'Warehouse', label: 'Warehouse', icon: Warehouse, color: 'text-blue-400' },
  { value: 'Kiosk', label: 'Kiosk / Counter', icon: Zap, color: 'text-green-400' },
];

const EMPTY_FORM = {
  name: '', code: '', type: 'Store',
  address: { street: '', city: '', state: '', zipcode: '', country: 'India' },
  contact: { phone: '', email: '', manager: '' },
  gst: { gstNumber: '', registrationType: 'Regular' },
  settings: { currency: 'INR', timezone: 'Asia/Kolkata', billPrefix: '', enableOfflineBilling: true, enableLoyalty: true },
};

export default function BranchManagement() {
  const { t } = useLanguage();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllBranches();
      setBranches(data);
    } catch (error) {
      toast.error(t('branches.failed_load') || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditMode(false);
    setSelectedBranch(null);
  };

  const handleOpenDialog = (branch = null) => {
    if (branch) {
      setFormData({
        ...EMPTY_FORM,
        ...branch,
        address: { ...EMPTY_FORM.address, ...(branch.address || {}) },
        contact: { ...EMPTY_FORM.contact, ...(branch.contact || {}) },
        gst: { ...EMPTY_FORM.gst, ...(branch.gst || {}) },
        settings: { ...EMPTY_FORM.settings, ...(branch.settings || {}) },
      });
      setSelectedBranch(branch);
      setEditMode(true);
    } else {
      resetForm();
    }
    setIsOpen(true);
  };

  const set = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const updated = { ...prev };
      if (keys.length === 1) {
        updated[keys[0]] = value;
      } else {
        updated[keys[0]] = { ...updated[keys[0]], [keys[1]]: value };
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error(t('branches.name_required') || 'Branch name is required'); return; }
    if (!formData.code.trim()) { toast.error(t('branches.code_required') || 'Branch code is required'); return; }
    setSaving(true);
    try {
      if (editMode) {
        await updateBranch(selectedBranch.id, formData);
        toast.success(t('branches.update_success') || 'Branch updated successfully!');
      } else {
        await createBranch(formData);
        toast.success(t('branches.create_success') || 'Branch created successfully!');
      }
      await loadBranches();
      window.dispatchEvent(new Event('branchListChanged'));
      setIsOpen(false);
      resetForm();
    } catch (error) {
      toast.error((editMode ? 'Failed to update' : 'Failed to create') + ' branch: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch) => {
    if (!confirm((t('branches.deactivate_confirm') || `Deactivate branch "{name}"? It will be hidden but data preserved.`).replace('{name}', branch.name))) return;
    try {
      await deactivateBranch(branch.id);
      toast.success(t('branches.deactivated') || 'Branch deactivated');
      loadBranches();
      window.dispatchEvent(new Event('branchListChanged'));
    } catch (error) {
      toast.error((t('branches.failed_deactivate') || 'Failed to deactivate: ') + error.message);
    }
  };

  const getBranchTypeConfig = (type) => BRANCH_TYPES.find(t => t.value === type) || BRANCH_TYPES[1];

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" /> {t('branches.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('branches.subtitle')}</p>
        </div>
        <Button className="gold-gradient text-black font-bold gap-2" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4" /> {t('branches.add')}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('branches.total_branches'), value: branches.length, icon: Building2, color: 'text-amber-400' },
          { label: t('branches.stores'), value: branches.filter(b => b.type === 'Store').length, icon: Store, color: 'text-green-400' },
          { label: t('branches.warehouses'), value: branches.filter(b => b.type === 'Warehouse').length, icon: Warehouse, color: 'text-blue-400' },
          { label: t('branches.hq_kiosks'), value: branches.filter(b => ['HQ', 'Kiosk'].includes(b.type)).length, icon: Zap, color: 'text-purple-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0", stat.color)}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-black">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-48" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="font-bold text-lg">{t('branches.no_branches')}</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">{t('branches.create_first')}</p>
          <Button className="gold-gradient text-black font-bold gap-2" onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4" /> {t('branches.create_branch')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map(branch => {
            const typeConfig = getBranchTypeConfig(branch.type);
            const Icon = typeConfig.icon;
            return (
              <div key={branch.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-10 h-10 rounded-xl bg-secondary flex items-center justify-center", typeConfig.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-[14px] leading-tight">{branch.name}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground">{branch.code}</span>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", typeConfig.color, "bg-secondary border-current/20")}>
                    {branch.type}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-[12px] text-muted-foreground mb-4">
                  {branch.address?.city && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{branch.address.city}{branch.address.state ? `, ${branch.address.state}` : ''}</span>
                    </div>
                  )}
                  {branch.contact?.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      <span>{branch.contact.phone}</span>
                    </div>
                  )}
                  {branch.contact?.manager && (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 shrink-0 text-green-500" />
                      <span>Mgr: {branch.contact.manager}</span>
                    </div>
                  )}
                  {branch.gst?.gstNumber && (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 shrink-0 text-amber-500" />
                      <span className="font-mono text-[10px]">{branch.gst.gstNumber}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border/50">
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-[12px] font-bold" onClick={() => handleOpenDialog(branch)}>
                    <Edit2 className="w-3 h-3 mr-1" /> {t('common.edit')}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-[12px] font-bold text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDelete(branch)}>
                    <Trash2 className="w-3 h-3 mr-1" /> {t('branches.remove')}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[88vh] overflow-y-auto p-0">
          <DialogHeader className="p-5 pb-3 border-b border-border sticky top-0 bg-card z-10">
            <DialogTitle className="text-base font-black flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-primary" />
              {editMode ? t('branches.update_branch') : t('branches.create_branch')}
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-5">
            {/* Basic Info */}
            <section className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{t('branches.basic_info')}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">{t('branches.branch_name')} *</Label>
                  <Input value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Main Store" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">{t('branches.branch_code')} *</Label>
                  <Input value={formData.code} onChange={e => set('code', e.target.value)} placeholder="BR001" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">{t('branches.branch_type')}</Label>
                <Select value={formData.type} onValueChange={v => set('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCH_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* Address */}
            <section className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{t('common.address')}</p>
              <Input value={formData.address.street} onChange={e => set('address.street', e.target.value)} placeholder="Street / Area" />
              <div className="grid grid-cols-2 gap-3">
                <Input value={formData.address.city} onChange={e => set('address.city', e.target.value)} placeholder="City" />
                <Input value={formData.address.state} onChange={e => set('address.state', e.target.value)} placeholder="State" />
              </div>
              <Input value={formData.address.zipcode} onChange={e => set('address.zipcode', e.target.value)} placeholder="Pincode" />
            </section>

            {/* Contact */}
            <section className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{t('branches.contact')}</p>
              <Input value={formData.contact.phone} onChange={e => set('contact.phone', e.target.value)} placeholder="Phone Number" type="tel" />
              <Input value={formData.contact.email} onChange={e => set('contact.email', e.target.value)} placeholder="Email Address" type="email" />
              <Input value={formData.contact.manager} onChange={e => set('contact.manager', e.target.value)} placeholder="Branch Manager Name" />
            </section>

            {/* GST */}
            <section className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">{t('branches.gst_billing')}</p>
              <Input value={formData.gst.gstNumber} onChange={e => set('gst.gstNumber', e.target.value)} placeholder="GST Number (optional)" className="font-mono" />
              <Input value={formData.settings.billPrefix} onChange={e => set('settings.billPrefix', e.target.value)} placeholder="Invoice Prefix (e.g. BR1-)" />
            </section>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-5 pt-0 sticky bottom-0 bg-card border-t border-border">
            <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>{t('common.cancel')}</Button>
            <Button className="flex-1 gold-gradient text-black font-bold" onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving') : editMode ? t('branches.update_branch') : t('branches.create_branch')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
