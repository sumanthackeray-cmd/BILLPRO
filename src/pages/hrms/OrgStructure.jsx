import { useState, useMemo } from "react";
import { 
  Building2, Award, Plus, Trash2, ShieldAlert, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { base44 } from "@/api/base44Client";

export default function OrgStructure({
  departmentsList = [],
  designationsList = [],
  refetchDetails
}) {
  const [isDeptSubmitting, setIsDeptSubmitting] = useState(false);
  const [isDesgSubmitting, setIsDesgSubmitting] = useState(false);

  // Form states for new department
  const [newDept, setNewDept] = useState({ name: "", code: "" });
  // Form states for new designation
  const [newDesg, setNewDesg] = useState({ name: "", code: "" });

  const safeDepts = useMemo(() => Array.isArray(departmentsList) ? departmentsList : [], [departmentsList]);
  const safeDesgs = useMemo(() => Array.isArray(designationsList) ? designationsList : [], [designationsList]);

  // Handle department creation
  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!newDept.name.trim()) return toast.error("Department Name is required");

    setIsDeptSubmitting(true);
    try {
      const generatedCode = newDept.code.trim().toUpperCase() || 
        newDept.name.trim().substring(0, 3).toUpperCase() + Math.floor(10 + Math.random() * 90);

      // Verify department name is unique
      const exists = safeDepts.some(d => d.name?.toLowerCase() === newDept.name.trim().toLowerCase());
      if (exists) {
        throw new Error("A department with this name already exists");
      }

      await base44.entities.Department.create({
        name: newDept.name.trim(),
        code: generatedCode
      });

      toast.success(`Department "${newDept.name}" created successfully!`);
      setNewDept({ name: "", code: "" });
      if (refetchDetails) refetchDetails();
    } catch (err) {
      toast.error(err.message || "Failed to create department");
    } finally {
      setIsDeptSubmitting(false);
    }
  };

  // Handle designation creation
  const handleAddDesg = async (e) => {
    e.preventDefault();
    if (!newDesg.name.trim()) return toast.error("Designation / Role Name is required");

    setIsDesgSubmitting(true);
    try {
      const generatedCode = newDesg.code.trim().toUpperCase() || 
        newDesg.name.trim().substring(0, 3).toUpperCase() + Math.floor(10 + Math.random() * 90);

      // Verify designation name is unique
      const exists = safeDesgs.some(d => d.name?.toLowerCase() === newDesg.name.trim().toLowerCase());
      if (exists) {
        throw new Error("A designation with this name already exists");
      }

      await base44.entities.Designation.create({
        name: newDesg.name.trim(),
        code: generatedCode
      });

      toast.success(`Role / Designation "${newDesg.name}" created successfully!`);
      setNewDesg({ name: "", code: "" });
      if (refetchDetails) refetchDetails();
    } catch (err) {
      toast.error(err.message || "Failed to create designation");
    } finally {
      setIsDesgSubmitting(false);
    }
  };

  // Handle department deletion
  const handleDeleteDept = async (id, name) => {
    const confirm = window.confirm(`WARNING:\nAre you sure you want to permanently delete the department "${name}"?\n\nThis will remove it from the master lists. Employees currently mapped to this department will retain their custom profile labels but new onboardings will not be able to select it.`);
    if (!confirm) return;

    try {
      await base44.entities.Department.delete(id);
      toast.success(`Department "${name}" deleted.`);
      if (refetchDetails) refetchDetails();
    } catch (err) {
      toast.error("Failed to delete department: " + err.message);
    }
  };

  // Handle designation deletion
  const handleDeleteDesg = async (id, name) => {
    const confirm = window.confirm(`WARNING:\nAre you sure you want to permanently delete the role / designation "${name}"?\n\nThis will remove it from the master lists.`);
    if (!confirm) return;

    try {
      await base44.entities.Designation.delete(id);
      toast.success(`Designation "${name}" deleted.`);
      if (refetchDetails) refetchDetails();
    } catch (err) {
      toast.error("Failed to delete designation: " + err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in text-xs">
      
      {/* COLUMN 1: DEPARTMENTS */}
      <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Building2 className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-foreground">Enterprise Departments</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Manage operational business sectors</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-secondary/35 text-slate-300 border border-border/20">
              {safeDepts.length} Registered
            </span>
          </div>

          {/* Creation Form */}
          <form onSubmit={handleAddDept} className="bg-secondary/10 border border-border/30 p-4 rounded-xl space-y-3 font-medium">
            <span className="text-[9px] font-black uppercase text-pink-400 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" /> Add New Department
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Department Name *</Label>
                <Input 
                  value={newDept.name}
                  onChange={e => setNewDept(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Research & Development"
                  className="bg-background/50 text-xs h-9 border-border/40"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Department Code (Optional)</Label>
                <Input 
                  value={newDept.code}
                  onChange={e => setNewDept(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. RND"
                  className="bg-background/50 text-xs h-9 border-border/40"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={isDeptSubmitting}
              className="w-full text-xs font-bold bg-pink-500 hover:bg-pink-600 text-white h-8 shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> {isDeptSubmitting ? "Creating..." : "Register Department"}
            </Button>
          </form>

          {/* List Table */}
          <div className="overflow-x-auto border border-border/40 rounded-xl bg-background/10 max-h-64 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider sticky top-0 z-10">
                  <th className="p-3">Sector Name</th>
                  <th className="p-3">Reference Code</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 leading-relaxed font-sans font-medium">
                {safeDepts.map((d, i) => (
                  <tr key={d.id || i} className="hover:bg-secondary/15">
                    <td className="p-3">
                      <strong className="text-slate-200 block text-xs">{d.name}</strong>
                    </td>
                    <td className="p-3 font-mono font-bold text-pink-400">{d.code || "N/A"}</td>
                    <td className="p-3 text-right">
                      <Button 
                        type="button"
                        onClick={() => handleDeleteDept(d.id, d.name)}
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-[10px] px-2.5 font-bold border-red-500/40 hover:bg-red-500/10 text-red-400 gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {safeDepts.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-muted-foreground">
                      No departments registered yet. Use the form above to add some.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-pink-500/5 border border-pink-500/25 p-3 rounded-xl text-[10px] leading-normal flex items-start gap-2 mt-4">
          <ShieldAlert className="w-4.5 h-4.5 text-pink-400 shrink-0 mt-0.5" />
          <p className="text-muted-foreground font-medium">
            Deleting a department removes it from the roster selectors. Existing employees with this department label are not modified automatically.
          </p>
        </div>
      </div>

      {/* COLUMN 2: DESIGNATIONS (ROLES) */}
      <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Award className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-foreground">Designations &amp; Roles</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Manage hierarchical administrative ranks</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-secondary/35 text-slate-300 border border-border/20">
              {safeDesgs.length} Active Ranks
            </span>
          </div>

          {/* Creation Form */}
          <form onSubmit={handleAddDesg} className="bg-secondary/10 border border-border/30 p-4 rounded-xl space-y-3 font-medium">
            <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" /> Add New Role / Designation
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Designation Name *</Label>
                <Input 
                  value={newDesg.name}
                  onChange={e => setNewDesg(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Lead UI Designer"
                  className="bg-background/50 text-xs h-9 border-border/40"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold">Designation Code (Optional)</Label>
                <Input 
                  value={newDesg.code}
                  onChange={e => setNewDesg(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. LUD"
                  className="bg-background/50 text-xs h-9 border-border/40"
                />
              </div>
            </div>
            <Button 
              type="submit" 
              disabled={isDesgSubmitting}
              className="w-full text-xs font-bold gold-gradient text-black hover:bg-amber-600 h-8 shrink-0 flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" /> {isDesgSubmitting ? "Creating..." : "Register Designation"}
            </Button>
          </form>

          {/* List Table */}
          <div className="overflow-x-auto border border-border/40 rounded-xl bg-background/10 max-h-64 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider sticky top-0 z-10">
                  <th className="p-3">Rank Designation</th>
                  <th className="p-3">Reference Code</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 leading-relaxed font-sans font-medium">
                {safeDesgs.map((d, i) => (
                  <tr key={d.id || i} className="hover:bg-secondary/15">
                    <td className="p-3">
                      <strong className="text-slate-200 block text-xs">{d.name}</strong>
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-500">{d.code || "N/A"}</td>
                    <td className="p-3 text-right">
                      <Button 
                        type="button"
                        onClick={() => handleDeleteDesg(d.id, d.name)}
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-[10px] px-2.5 font-bold border-red-500/40 hover:bg-red-500/10 text-red-400 gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {safeDesgs.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-muted-foreground">
                      No designations registered yet. Use the form above to add some.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/25 p-3 rounded-xl text-[10px] leading-normal flex items-start gap-2 mt-4">
          <ShieldAlert className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-muted-foreground font-medium">
            Ranks are used for salary scale modeling and compliance classification. Purging old designations keeps the corporate directory clean.
          </p>
        </div>
      </div>

    </div>
  );
}
