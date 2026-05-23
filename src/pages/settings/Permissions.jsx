import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Shield, Lock, Eye, Save, Sliders, ArrowLeft, ToggleLeft, ToggleRight, Sparkles, Server } from "lucide-react";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PermissionsSettings() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState("");

  // Grid permissions state
  const [permissionsMap, setPermissionsMap] = useState({});
  // Sensitive field access state
  const [sensitiveFieldsMap, setSensitiveFieldsMap] = useState({});

  // 1. Fetch collections
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles_rbac"],
    queryFn: () => base44.entities.Role.list(),
    enabled: !!currentUser,
  });

  const { data: permissions = [], isLoading: isLoadingPerms } = useQuery({
    queryKey: ["permissions_rbac"],
    queryFn: () => base44.entities.Permission.list(),
    enabled: !!currentUser,
  });

  const { data: sensitiveFieldAccess = [], isLoading: isLoadingSfa } = useQuery({
    queryKey: ["sensitive_field_rbac"],
    queryFn: () => base44.entities.SensitiveFieldAccess.list(),
    enabled: !!currentUser,
  });

  // Check if current user is authorized (Level <= 2: Owner, CEO)
  const isAuthorized = currentUser && currentUser.hierarchy_level <= 2;

  // Set default active tab
  useEffect(() => {
    if (roles.length > 0 && currentUser && !activeRoleId) {
      // Find the first role strictly below the current user if possible, or fallback to Accountant
      const sortedRoles = [...roles].sort((a, b) => a.hierarchy_level - b.hierarchy_level);
      const editableRole = sortedRoles.find(r => r.hierarchy_level > currentUser.hierarchy_level) || sortedRoles[0];
      if (editableRole) {
        setActiveRoleId(editableRole.id);
      }
    }
  }, [roles, currentUser, activeRoleId]);

  // Load configuration into state when activeRoleId changes
  useEffect(() => {
    if (!activeRoleId) return;

    const rolePerm = permissions.find(p => p.role_id === activeRoleId);
    if (rolePerm) {
      setPermissionsMap(rolePerm.permissions || {});
    } else {
      setPermissionsMap({});
    }

    const roleSfa = sensitiveFieldAccess.find(s => s.role_id === activeRoleId);
    if (roleSfa) {
      setSensitiveFieldsMap(roleSfa.fields || {});
    } else {
      setSensitiveFieldsMap({});
    }
  }, [activeRoleId, permissions, sensitiveFieldAccess]);

  const formatRoleName = (name) => {
    if (!name) return "";
    return name.toUpperCase().replace("_", " ");
  };

  const getRoleLevel = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.hierarchy_level : 7;
  };

  const modules = [
    { key: "pos", name: "POS & Billing Terminal", actions: ["view", "create", "edit", "delete", "export", "discount", "override", "shift", "reprint", "drawer"] },
    { key: "inventory", name: "Inventory & Catalog", actions: ["view", "create", "edit", "delete", "export", "adjust", "transfer", "barcode"] },
    { key: "accounting", name: "Accounting & ledger", actions: ["view", "create", "edit", "delete", "export"] },
    { key: "warehouse", name: "Warehouse & Procurement", actions: ["view", "create", "edit", "delete", "export"] },
    { key: "hr", name: "HR & Employee Payroll", actions: ["view", "create", "edit", "delete", "export", "attendance", "payslip"] },
    { key: "reports", name: "Executive Business Reports", actions: ["view", "create", "edit", "delete", "export"] }
  ];

  const sensitiveFields = [
    { key: "purchase_price", name: "Product Purchase Price", desc: "Strip item-level procurement costs from all listing queries" },
    { key: "profit_margin", name: "Profit Margin Ratios", desc: "Hide target profit percentages and overall markup rates" },
    { key: "salary", name: "Employee Salaries", desc: "Restrict salary and payout details from other users" }
  ];

  // Helper to toggle a matrix permission
  const handleTogglePermission = (moduleKey, actionKey) => {
    const activeRoleLevel = getRoleLevel(activeRoleId);
    
    // Safety check: Cannot edit a role equal to or higher than own level
    if (activeRoleLevel <= currentUser.hierarchy_level) {
      return toast.error("Access Denied: You cannot modify permissions of an equal or higher authority level.");
    }
    // Safety check: Owner permissions are static and immutable
    if (activeRoleLevel === 1) {
      return toast.error("SAP Rule: Owner permissions are immutable and locked.");
    }

    setPermissionsMap(prev => {
      const moduleData = prev[moduleKey] || {};
      const updatedModule = {
        ...moduleData,
        [actionKey]: !moduleData[actionKey]
      };
      return {
        ...prev,
        [moduleKey]: updatedModule
      };
    });
  };

  // Helper to toggle a sensitive field
  const handleToggleSensitiveField = (fieldKey) => {
    const activeRoleLevel = getRoleLevel(activeRoleId);

    if (activeRoleLevel <= currentUser.hierarchy_level) {
      return toast.error("Access Denied: You cannot modify field configurations of an equal or higher authority level.");
    }
    if (activeRoleLevel === 1) {
      return toast.error("SAP Rule: Owner sensitive field guards are immutable.");
    }

    setSensitiveFieldsMap(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  // Save changes to Firestore
  const handleSaveChanges = async () => {
    const activeRoleLevel = getRoleLevel(activeRoleId);
    if (activeRoleLevel <= currentUser.hierarchy_level) {
      return toast.error("Access Denied: You cannot modify permissions of an equal or higher authority level.");
    }
    if (activeRoleLevel === 1) {
      return toast.error("Owner permissions are protected and cannot be changed.");
    }

    setSaving(true);
    try {
      // 1. Update Permissions
      const activePermDoc = permissions.find(p => p.role_id === activeRoleId);
      if (activePermDoc) {
        await base44.entities.Permission.update(activePermDoc.id, {
          permissions: permissionsMap
        });
      }

      // 2. Update Sensitive Field Access
      const activeSfaDoc = sensitiveFieldAccess.find(s => s.role_id === activeRoleId);
      if (activeSfaDoc) {
        await base44.entities.SensitiveFieldAccess.update(activeSfaDoc.id, {
          fields: sensitiveFieldsMap
        });
      }

      toast.success(`SAP security matrix saved for ${formatRoleName(roles.find(r => r.id === activeRoleId)?.role_name)}!`);
      queryClient.invalidateQueries({ queryKey: ["permissions_rbac"] });
      queryClient.invalidateQueries({ queryKey: ["sensitive_field_rbac"] });
    } catch (err) {
      toast.error("Failed to update SAP permissions: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser || isLoadingRoles || isLoadingPerms || isLoadingSfa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Syncing security grids...</p>
      </div>
    );
  }

  // ACCESS DENIED VIEW
  if (!isAuthorized) {
    return (
      <div className="animate-fade-up max-w-2xl mx-auto mt-10">
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-8 backdrop-blur-md text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto text-destructive animate-pulse">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-destructive">SAP Permissions Lock Active</h1>
            <p className="text-muted-foreground text-sm">
              Your profile level <strong>({currentUser.role.toUpperCase()} - Level {currentUser.hierarchy_level})</strong> is locked out of the corporate permission control plane. Only Owners and CEOs are authorized to adjust the SAP grid.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/settings">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Return to Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeRoleLevel = getRoleLevel(activeRoleId);
  const isEditable = activeRoleLevel > currentUser.hierarchy_level && activeRoleLevel !== 1;

  return (
    <div className="animate-fade-up space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <Sliders className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">SAP Permission Grid Control</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Toggle corporate capabilities and configure column field-level protection guards.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="outline" className="gap-2 border-border/50 bg-background/50">
              <ArrowLeft className="w-4 h-4" /> Cancel
            </Button>
          </Link>
          <Button 
            className="gold-gradient text-black font-bold gap-2" 
            onClick={handleSaveChanges} 
            disabled={saving || !isEditable}
          >
            <Save className="w-4 h-4" /> {saving ? "Saving Grid..." : "Save Security Matrix"}
          </Button>
        </div>
      </div>

      {/* TABS FOR ROLES */}
      <Tabs value={activeRoleId} onValueChange={setActiveRoleId} className="w-full">
        <TabsList className="bg-secondary mb-4 flex-wrap h-auto gap-1">
          {roles
            .sort((a, b) => a.hierarchy_level - b.hierarchy_level)
            .map((role) => (
              <TabsTrigger 
                key={role.id} 
                value={role.id} 
                className="gap-1.5"
              >
                <Shield className={`w-3.5 h-3.5 ${role.hierarchy_level === 1 ? "text-amber-500" : "text-indigo-400"}`} /> 
                {formatRoleName(role.role_name)} 
                <span className="text-[10px] opacity-65 font-mono">(L{role.hierarchy_level})</span>
              </TabsTrigger>
            ))}
        </TabsList>

        <TabsContent value={activeRoleId} className="space-y-6">
          
          {/* MATRIX HEADER CARD */}
          <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-xl flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Sparkles className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="font-bold text-[15px]">Editing Role Profile: {formatRoleName(roles.find(r => r.id === activeRoleId)?.role_name)}</h3>
                <p className="text-[11px] text-muted-foreground">Clearance Hierarchy Level: {activeRoleLevel} of 7</p>
              </div>
            </div>
            
            {activeRoleLevel === 1 ? (
              <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full font-black flex items-center gap-1.5 animate-pulse">
                👑 Owner Account clearance is absolute and immutable
              </span>
            ) : !isEditable ? (
              <span className="text-xs bg-destructive/10 text-destructive border border-destructive/20 px-3 py-1 rounded-full font-black flex items-center gap-1.5">
                🔒 You cannot configure roles higher than or equal to yours
              </span>
            ) : (
              <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1 rounded-full font-black flex items-center gap-1.5">
                🟢 Write clearance active for this matrix node
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            
            {/* COLUMN DATA SHIELD & FIELD GUARDS */}
            <div className="xl:col-span-1 space-y-4">
              <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <h3 className="font-black text-[14px]">Sensitive Field Guards</h3>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Enforces strict data restriction at the query proxy level. If checked, the keys are completely stripped from lists returned to the front-end.
                </p>

                <div className="space-y-4">
                  {sensitiveFields.map((field) => {
                    const isChecked = !!sensitiveFieldsMap[field.key];
                    return (
                      <div 
                        key={field.key} 
                        className={`flex flex-col border p-3.5 rounded-xl transition-all duration-300 ${
                          isChecked 
                            ? "bg-slate-500/5 border-emerald-500/30" 
                            : "bg-destructive/5 border-destructive/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs tracking-tight">{field.name}</span>
                          <button
                            type="button"
                            disabled={!isEditable}
                            onClick={() => handleToggleSensitiveField(field.key)}
                            className={`transition-colors duration-200 outline-none focus:outline-none ${
                              !isEditable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                            }`}
                          >
                            {isChecked ? (
                              <div className="flex items-center gap-1 text-xs font-black text-emerald-500">
                                Visible <ToggleRight className="w-8 h-8 text-emerald-500 fill-emerald-500/20" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs font-semibold text-destructive">
                                Masked <ToggleLeft className="w-8 h-8 text-destructive fill-destructive/20" />
                              </div>
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 font-medium leading-relaxed">{field.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ACTION MATRICES */}
            <div className="xl:col-span-3">
              <div className="bg-card/50 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-xl space-y-4 overflow-x-auto">
                <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                  <Server className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-black text-[14px]">Standard Capabilities Matrix</h3>
                </div>

                <div className="min-w-[650px] space-y-4">
                  {modules.map((mod) => (
                    <div key={mod.key} className="border border-border/50 rounded-xl p-4 bg-slate-500/5 hover:bg-slate-500/10 transition-all">
                      <div className="flex items-center justify-between border-b border-border/20 pb-2 mb-3">
                        <span className="font-black text-sm text-indigo-400">{mod.name}</span>
                        <span className="text-[9px] font-mono uppercase bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded">
                          entity: {mod.key}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-2.5">
                        {mod.actions.map((act) => {
                          const isAllowed = !!permissionsMap[mod.key]?.[act];
                          return (
                            <button
                              key={act}
                              type="button"
                              disabled={!isEditable}
                              onClick={() => handleTogglePermission(mod.key, act)}
                              className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all select-none ${
                                isAllowed
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-500 shadow-sm"
                                  : "bg-transparent border-border/50 text-muted-foreground hover:bg-muted/30"
                              } ${!isEditable ? "opacity-60 cursor-not-allowed" : "cursor-pointer active:scale-95"}`}
                            >
                              <Eye className={`w-4 h-4 mb-1.5 ${isAllowed ? "opacity-100 animate-pulse" : "opacity-40"}`} />
                              <span className="text-[10px] font-black uppercase tracking-wider">{act}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}
