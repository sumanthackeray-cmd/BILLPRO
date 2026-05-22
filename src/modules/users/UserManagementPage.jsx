import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/hooks/useAuth";
import { manageStaffUser } from "@/firebase/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  UserPlus,
  Shield,
  UserX,
  UserCheck,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import FieldGuard from "@/components/guards/FieldGuard";

const AVAILABLE_ROLES = [
  { id: "role-owner", role_name: "owner", label: "Owner", hierarchy_level: 1 },
  { id: "role-ceo", role_name: "ceo", label: "Chief Executive (CEO)", hierarchy_level: 2 },
  { id: "role-ca", role_name: "ca", label: "Chartered Accountant (CA)", hierarchy_level: 3 },
  { id: "role-accountant", role_name: "accountant", label: "Accountant", hierarchy_level: 4 },
  { id: "role-store_manager", role_name: "store_manager", label: "Store Manager", hierarchy_level: 5 },
  { id: "role-warehouse_manager", role_name: "warehouse_manager", label: "Warehouse Manager", hierarchy_level: 6 },
  { id: "role-cashier", role_name: "cashier", label: "Cashier", hierarchy_level: 7 }
];

export default function UserManagementPage() {
  const { role: currentUserRole, companyId } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [userCode, setUserCode] = useState("");
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMobile, setContactMobile] = useState("");
  const [staffId, setStaffId] = useState("");
  const [roleId, setRoleId] = useState("role-cashier");
  const [salary, setSalary] = useState("");
  const [branchId, setBranchId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const currentRoleObj = AVAILABLE_ROLES.find(r => r.role_name === currentUserRole) || { hierarchy_level: 7 };
  const currentHierarchy = currentRoleObj.hierarchy_level;

  // Filter roles that the logged in user is allowed to assign (hierarchy level must be strictly greater than current user's)
  const assignableRoles = AVAILABLE_ROLES.filter(r => r.hierarchy_level > currentHierarchy);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.User.list();
      setUsers(list);
    } catch (e) {
      console.error("Failed to fetch users list:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setActionLoading(true);

    const selectedRole = AVAILABLE_ROLES.find(r => r.id === roleId);
    if (!selectedRole) {
      setError("Invalid role selected.");
      setActionLoading(false);
      return;
    }

    // Role hierarchy check
    if (selectedRole.hierarchy_level <= currentHierarchy) {
      setError(`Hierarchy violation: You cannot create a user with role '${selectedRole.label}' (Level ${selectedRole.hierarchy_level}) which is equal to or higher than your role (Level ${currentHierarchy}).`);
      setActionLoading(false);
      return;
    }

    try {
      const newUserCode = userCode.trim().toUpperCase();
      const internalEmail = `${newUserCode}@${companyId.replace("-", "")}.easybmt.app`;

      const result = await manageStaffUser({
        action: "CREATE",
        companyId,
        userCode: newUserCode,
        email: internalEmail,
        contact_email: contactEmail,
        contact_mobile: contactMobile,
        staff_id: staffId,
        name,
        password,
        roleId,
        salary: salary ? Number(salary) : 0,
        branchId: branchId || "MAIN",
        is_active: true
      });

      if (result.success) {
        setSuccess(`User ${newUserCode} created successfully! Internal Email: ${internalEmail}`);
        setUserCode("");
        setName("");
        setContactEmail("");
        setContactMobile("");
        setStaffId("");
        setSalary("");
        setBranchId("");
        setPassword("");
        fetchUsers();
      } else {
        setError(result.message || "Failed to create user.");
      }
    } catch (err) {
      setError(err.message || "An error occurred while creating staff user.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (userRecord) => {
    setError("");
    setSuccess("");
    
    const userRoleObj = AVAILABLE_ROLES.find(r => r.id === userRecord.role_id) || { hierarchy_level: 7 };
    if (userRoleObj.hierarchy_level <= currentHierarchy) {
      setError("Hierarchy Rejection: You cannot modify status of a user equal to or higher than your hierarchy level.");
      return;
    }

    setActionLoading(true);
    try {
      const nextStatus = !userRecord.is_active;
      const result = await manageStaffUser({
        action: "UPDATE",
        companyId,
        uid: userRecord.id,
        is_active: nextStatus
      });

      if (result.success) {
        setSuccess(`User status updated to ${nextStatus ? "Active" : "Deactivated"}`);
        fetchUsers();
      } else {
        setError(result.message || "Failed to update status.");
      }
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
            <Users className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">SU01 - Staff User Management</h1>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Administer workspace user accounts, credentials, and hierarchy-based authorization levels
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Form */}
        <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit">
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-bold text-white">Register Staff User</h2>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">User Code (e.g. CASHIER-02)</Label>
              <Input
                value={userCode}
                onChange={(e) => setUserCode(e.target.value.replace(/[@\s]/g, ''))}
                placeholder="CASHIER-02"
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anand Sharma"
                required
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Email Address (Optional)</Label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="staff@company.com"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Mobile Number (Optional)</Label>
                <Input
                  value={contactMobile}
                  onChange={(e) => setContactMobile(e.target.value)}
                  placeholder="9876543210"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Role / Authorization Level</Label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {assignableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label} (Lvl {role.hierarchy_level})
                  </option>
                ))}
                {assignableRoles.length === 0 && (
                  <option value="">No assignable roles available</option>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Salary Details (₹ / Month)</Label>
              <Input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="25000"
                className="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Branch ID</Label>
                <Input
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  placeholder="MAIN"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Staff ID (Optional)</Label>
                <Input
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="STF-001"
                  className="bg-slate-950 border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Initial Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-950 border-slate-800 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={actionLoading || assignableRoles.length === 0}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl h-11 border-0 shadow-lg shadow-indigo-500/10 mt-6"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register User
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Staff Table */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-slate-800 rounded-3xl p-6 shadow-xl h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-400" />
              Active Workspace Users
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="border-slate-800 text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800/80 text-xs font-semibold text-slate-400 uppercase">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 px-4">Role</th>
                  <th className="pb-3 px-4">Salary</th>
                  <th className="pb-3 px-4">Branch</th>
                  <th className="pb-3 px-4 text-center">Status</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-violet-500 mb-2" />
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No staff users registered.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const roleDetails = AVAILABLE_ROLES.find(r => r.id === u.role_id) || { label: u.role_id || "Cashier" };
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/5">
                        <td className="py-3 pr-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{u.name}</span>
                            <span className="text-xs text-slate-500 font-mono">{u.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            {roleDetails.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <FieldGuard fieldName="salary" fallback="₹***">
                            ₹{u.salary?.toLocaleString() || 0}
                          </FieldGuard>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{u.branch_id || "ALL"}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                              u.is_active
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {u.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(u)}
                            className={u.is_active ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"}
                            disabled={actionLoading}
                          >
                            {u.is_active ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
