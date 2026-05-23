import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { 
  Building, Factory, Building2, Warehouse, Cpu, Users, DollarSign, BookOpen, Sliders, Briefcase, FileText, CheckCircle
} from "lucide-react";

// Modular HRMS Sub-components
import HRMSDashboard from "./hrms/HRMSDashboard";
import EmployeeMaster from "./hrms/EmployeeMaster";
import SalaryEngine from "./hrms/SalaryEngine";
import AccountingLink from "./hrms/AccountingLink";
import ComplianceCenter from "./hrms/ComplianceCenter";
import DocumentVault from "./hrms/DocumentVault";
import FactoryMES from "./hrms/FactoryMES";
import OrgStructure from "./hrms/OrgStructure";


// Master seed trigger logic & compliance utilities
import { ensureHRMSeedData } from "./hrms/hrmsUtils";
import ResponsiveTabs from "@/components/ui/ResponsiveTabs";

const AVAILABLE_ROLES = [
  { id: "role-owner", role_name: "owner", label: "Owner", hierarchy_level: 1 },
  { id: "role-ceo", role_name: "ceo", label: "Chief Executive (CEO)", hierarchy_level: 2 },
  { id: "role-ca", role_name: "ca", label: "Chartered Accountant (CA)", hierarchy_level: 3 },
  { id: "role-accountant", role_name: "accountant", label: "Accountant", hierarchy_level: 4 },
  { id: "role-store_manager", role_name: "store_manager", label: "Store Manager", hierarchy_level: 5 },
  { id: "role-warehouse_manager", role_name: "warehouse_manager", label: "Warehouse Manager", hierarchy_level: 6 },
  { id: "role-cashier", role_name: "cashier", label: "Cashier", hierarchy_level: 7 }
];

export default function HRMS() {
  const { user, companyId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Auto-seed default departments, designations, shifts, and holidays if they are empty
  useEffect(() => {
    if (user && companyId) {
      ensureHRMSeedData().then(() => {
        // Refetch seed collections once done
        queryClient.invalidateQueries({ queryKey: ["hrms_departments"] });
        queryClient.invalidateQueries({ queryKey: ["hrms_designations"] });
        queryClient.invalidateQueries({ queryKey: ["hrms_shifts"] });
        queryClient.invalidateQueries({ queryKey: ["hrms_holidays"] });
      });
    }
  }, [user, companyId, queryClient]);

  // --- QUERY HOOKS FOR THE 12 DB COLLECTIONS ---
  
  // 1. Shop settings query
  const { data: shopSettingsList = [] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
    enabled: !!user,
  });
  const shopSettings = shopSettingsList[0] || {};
  const activeBusinessType = shopSettings.business_type || "retail";

  // 2. Base Auth Users collection
  const { data: users = [], refetch: refetchUsers } = useQuery({
    queryKey: ["hrms_users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  // 3. Extended Employees properties collection
  const { data: employeeDetails = [], refetch: refetchDetails } = useQuery({
    queryKey: ["hrms_employee_details"],
    queryFn: () => base44.entities.Employee.list(),
    enabled: !!user,
  });

  // 4. Biometric check-in Logs collection
  const { data: attendanceLogs = [], refetch: refetchAttendance } = useQuery({
    queryKey: ["hrms_attendance"],
    queryFn: () => base44.entities.AttendanceLog.list(),
    enabled: !!user,
  });

  // 5. Leave management collection
  const { data: leaveRequests = [], refetch: refetchLeaves } = useQuery({
    queryKey: ["hrms_leaves"],
    queryFn: () => base44.entities.LeaveManagement.list(),
    enabled: !!user,
  });

  // 6. Annual CTC structures collection
  const { data: salaryStructures = [], refetch: refetchSalary } = useQuery({
    queryKey: ["hrms_salary_structures"],
    queryFn: () => base44.entities.SalaryStructure.list(),
    enabled: !!user,
  });

  // 7. Monthly payroll logs collection
  const { data: monthlyPayrolls = [], refetch: refetchPayrolls } = useQuery({
    queryKey: ["hrms_payroll_logs"],
    queryFn: () => base44.entities.MonthlyPayroll.list(),
    enabled: !!user,
  });

  // 8. Staff Advance Loans collection
  const { data: loansList = [], refetch: refetchLoans } = useQuery({
    queryKey: ["hrms_loans"],
    queryFn: () => base44.entities.EmployeeLoan.list(),
    enabled: !!user,
  });

  // 9. Document vault collection
  const { data: documentsList = [], refetch: refetchDocs } = useQuery({
    queryKey: ["hrms_documents"],
    queryFn: () => base44.entities.EmployeeDocument.list(),
    enabled: !!user,
  });

  // 10. KRA/KPI Performance collection
  const { data: performanceList = [], refetch: refetchPerformance } = useQuery({
    queryKey: ["hrms_performance"],
    queryFn: () => base44.entities.PerformanceReview.list(),
    enabled: !!user,
  });

  // 11. Master seed queries
  const { data: departmentsList = [], refetch: refetchDepts } = useQuery({
    queryKey: ["hrms_departments"],
    queryFn: () => base44.entities.Department.list(),
    enabled: !!user,
  });

  const { data: designationsList = [], refetch: refetchDesigs } = useQuery({
    queryKey: ["hrms_designations"],
    queryFn: () => base44.entities.Designation.list(),
    enabled: !!user,
  });

  const { data: shiftsList = [] } = useQuery({
    queryKey: ["hrms_shifts"],
    queryFn: () => base44.entities.Shift.list(),
    enabled: !!user,
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["hrms_holidays"],
    queryFn: () => base44.entities.Holiday.list(),
    enabled: !!user,
  });

  // Refetch all queries utility
  const handleRefetchAll = () => {
    refetchUsers();
    refetchDetails();
    refetchAttendance();
    refetchLeaves();
    refetchSalary();
    refetchPayrolls();
    refetchLoans();
    refetchDocs();
    refetchPerformance();
    if (refetchDepts) refetchDepts();
    if (refetchDesigs) refetchDesigs();
  };

  // Combine baseline Auth records with custom Employee collections details
  const employees = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : [];
    const safeEmployeeDetails = Array.isArray(employeeDetails) ? employeeDetails : [];
    return safeUsers.map(u => {
      if (!u) return {};
      const ext = safeEmployeeDetails.find(e => e && e.id === u.id) || {};
      return {
        ...u,
        ...ext,
        id: u.id,
        name: u.name || ext.full_name || u.email?.split("@")[0] || "Staff",
        basicSalary: Number(ext.basic_salary || u.salary || 20000),
        hra: Number(ext.hra || 8000),
        allowances: Number(ext.special_allowance || 4750),
        joiningDate: ext.date_of_joining || u.created_date?.split("T")[0] || "2026-01-15",
        status: ext.status || (u.is_active ? "active" : "inactive")
      };
    });
  }, [users, employeeDetails]);

  // Business Profile descriptor header metadata
  const hrProfile = useMemo(() => {
    const profiles = {
      manufacturer: {
        title: "Enterprise MES & Floor Factory HR Suite",
        badge: "MES Compliance",
        icon: <Factory className="w-5 h-5 text-amber-500" />,
        accentClass: "border-amber-500/30 text-amber-500 bg-amber-500/10",
        desc: "Automates factory operator biometric face match scans, registers machine certifications, and computes daily piece-rates."
      },
      wholesaler: {
        title: "Logistics Warehouse Operations",
        badge: "Logistics",
        icon: <Warehouse className="w-5 h-5 text-purple-400" />,
        accentClass: "border-purple-500/30 text-purple-400 bg-purple-500/10",
        desc: "Tracks warehouse pick/pack logistics metrics and geofence delivery ranges."
      },
      retail: {
        title: "General Retail Store & POS HCM",
        badge: "Retail Outlets",
        icon: <Building className="w-5 h-5 text-blue-400" />,
        accentClass: "border-blue-500/30 text-blue-400 bg-blue-500/10",
        desc: "Manages quick shift changes, cashier registers, and standard sales overtime."
      },
      other: {
        title: "Enterprise Corporate HCM Dashboard",
        badge: "Enterprise Grade",
        icon: <Building2 className="w-5 h-5 text-slate-400" />,
        accentClass: "border-slate-500/30 text-slate-400 bg-slate-500/10",
        desc: "Advanced double-entry ledger audits, Form 24Q TDS withholdings, and document expirations."
      }
    };
    return profiles[activeBusinessType] || profiles.other;
  }, [activeBusinessType]);

  return (
    <div className="animate-fade-up space-y-6 text-xs">
      
      {/* Module Activator Premium Header */}
      <div className="bg-card/40 backdrop-blur-md border border-border/50 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-slate-500/5 flex items-center justify-center border border-border/30">
            {hrProfile.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-tight text-foreground leading-none">{hrProfile.title}</h2>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${hrProfile.accentClass}`}>
                {hrProfile.badge}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 leading-normal max-w-2xl">{hrProfile.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-emerald-500 font-extrabold bg-emerald-500/10 border border-emerald-500/20 py-1 px-3 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> India statutory compliant
          </span>
        </div>
      </div>

      {/* Main Glassmorphic Sub-tab Switchers */}
      <ResponsiveTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        containerClassName="border-b border-border/30 overflow-x-auto pb-2 scrollbar-thin bg-transparent shadow-none"
        tabs={[
          { id: "dashboard", label: "HCM Insights", icon: <Cpu className="w-3.5 h-3.5 text-primary" /> },
          { id: "employees", label: "Employee Master", icon: <Users className="w-3.5 h-3.5 text-blue-400" /> },
          { id: "org_structure", label: "Departments & Roles", icon: <Briefcase className="w-3.5 h-3.5 text-pink-400" /> },
          { id: "salary", label: "Salary & Payroll Engine", icon: <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> },
          { id: "accounting", label: "Accounting sync", icon: <BookOpen className="w-3.5 h-3.5 text-amber-500" /> },
          { id: "mes", label: "Biometrics & MES Terminal", icon: <Factory className="w-3.5 h-3.5 text-purple-400" /> },
          { id: "compliance", label: "Regulatory compliance", icon: <Sliders className="w-3.5 h-3.5 text-red-400" /> },
          { id: "vault", label: "Document Vault", icon: <FileText className="w-3.5 h-3.5 text-indigo-400" /> }
        ]}
      />

      {/* RENDER MODULAR SUB-TAB WITH REAL STATE BINDINGS */}
      <div className="space-y-6">
        {activeTab === "dashboard" && (
          <HRMSDashboard 
            employees={employees} 
            attendanceLogs={attendanceLogs} 
            leaveRequests={leaveRequests} 
            holidays={holidays} 
            monthlyPayrolls={monthlyPayrolls}
          />
        )}

        {activeTab === "employees" && (
          <EmployeeMaster 
            employees={employees} 
            activeBusinessType={activeBusinessType}
            refetchUsers={refetchUsers}
            refetchDetails={refetchDetails}
            AVAILABLE_ROLES={AVAILABLE_ROLES}
            departmentsList={departmentsList}
            designationsList={designationsList}
            shiftsList={shiftsList}
            loansList={loansList}
            performanceList={performanceList}
            documentsList={documentsList}
            attendanceLogs={attendanceLogs}
            leavesList={leaveRequests}
            salaryStructures={salaryStructures}
          />
        )}

        {activeTab === "org_structure" && (
          <OrgStructure 
            departmentsList={departmentsList}
            designationsList={designationsList}
            refetchDetails={handleRefetchAll}
          />
        )}

        {activeTab === "salary" && (
          <SalaryEngine 
            employees={employees}
            monthlyPayrolls={monthlyPayrolls}
            refetchDetails={handleRefetchAll}
            salaryStructures={salaryStructures}
            loansList={loansList}
          />
        )}

        {activeTab === "accounting" && (
          <AccountingLink 
            employees={employees}
            monthlyPayrolls={monthlyPayrolls}
            refetchDetails={handleRefetchAll}
          />
        )}

        {activeTab === "mes" && (
          <FactoryMES 
            employees={employees}
            refetchDetails={handleRefetchAll}
            activeBusinessType={activeBusinessType}
            attendanceLogs={attendanceLogs}
          />
        )}

        {activeTab === "compliance" && (
          <ComplianceCenter 
            employees={employees}
            monthlyPayrolls={monthlyPayrolls}
            refetchDetails={handleRefetchAll}
          />
        )}

        {activeTab === "vault" && (
          <DocumentVault 
            employees={employees}
            documentsList={documentsList}
            refetchDetails={handleRefetchAll}
          />
        )}
      </div>

    </div>
  );
}
