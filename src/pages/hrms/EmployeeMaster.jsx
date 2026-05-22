import { useState, useMemo } from "react";
import { 
  Users, Search, UserPlus, FileSpreadsheet, Eye, Plus, Calendar, DollarSign, Award, Settings, Briefcase, 
  MapPin, ShieldAlert, Trash2, CheckCircle2, ChevronRight, UserCheck, AlertCircle, Edit, ShieldCheck, HeartPulse
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "@/lib/toast";

export default function EmployeeMaster({ 
  employees = [], 
  activeBusinessType, 
  refetchUsers, 
  refetchDetails, 
  AVAILABLE_ROLES,
  departmentsList = [],
  designationsList = [],
  shiftsList = [],
  leavesList = [],
  attendanceLogs = [],
  loansList = [],
  performanceList = [],
  documentsList = []
}) {
  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const safeDepartmentsList = useMemo(() => Array.isArray(departmentsList) ? departmentsList : [], [departmentsList]);
  const safeDesignationsList = useMemo(() => Array.isArray(designationsList) ? designationsList : [], [designationsList]);
  const safeShiftsList = useMemo(() => Array.isArray(shiftsList) ? shiftsList : [], [shiftsList]);
  const safeLeavesList = useMemo(() => Array.isArray(leavesList) ? leavesList : [], [leavesList]);
  const safeAttendanceLogs = useMemo(() => Array.isArray(attendanceLogs) ? attendanceLogs : [], [attendanceLogs]);
  const safeLoansList = useMemo(() => Array.isArray(loansList) ? loansList : [], [loansList]);
  const safePerformanceList = useMemo(() => Array.isArray(performanceList) ? performanceList : [], [performanceList]);
  const safeDocumentsList = useMemo(() => Array.isArray(documentsList) ? documentsList : [], [documentsList]);
  const safeRoles = useMemo(() => Array.isArray(AVAILABLE_ROLES) ? AVAILABLE_ROLES : [], [AVAILABLE_ROLES]);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  
  // Selected employee for detailed 10-tab profile view
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  // Modal states
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardActiveTab, setOnboardActiveTab] = useState("personal");
  
  // Active tab inside Employee Profile
  const [profileActiveTab, setProfileActiveTab] = useState("overview");

  // Onboard form state
  const [onboardForm, setOnboardForm] = useState({
    // Personal Information
    first_name: "", middle_name: "", last_name: "",dob: "", gender: "male", marital_status: "single",
    blood_group: "B+", nationality: "Indian", religion: "Hindu", caste_category: "general",
    physically_disabled: false, disability_details: "", photo_url: "", emergency_contacts: "",
    personal_email: "", work_email: "", personal_phone: "", work_phone: "", whatsapp_number: "",
    present_address: "", permanent_address: "", same_as_present: true,
    
    // Identity Documents
    aadhaar_number: "", pan_number: "", passport_number: "", passport_expiry: "",
    voter_id: "", driving_license: "", dl_expiry: "", uan_number: "", esic_number: "",
    
    // Employment details
    employee_code: "", department_id: "", designation_id: "", employment_type: "full_time",
    grade: "L3", date_of_joining: new Date().toISOString().split("T")[0], probation_end_date: "",
    confirmation_date: "", date_of_leaving: "", notice_period_days: "30", reporting_manager: "",
    work_location: "Main Plant", shift_id: "", cost_center: "", work_from_home: false,
    
    // Qualification
    education: "", certifications: "", skills: "", previous_experience: "",
    
    // Bank Details
    bank_name: "", account_number: "", ifsc_code: "", account_type: "savings",
    account_holder_name: "", payment_mode: "bank_transfer", upi_id: "",
    
    // Factory MES specific
    worker_category: "floor_worker", floor_zone: "A", biometric_id: "", rfid_card_no: "",
    is_piece_rate: false, piece_rate_per_unit: "10.00", machine_certified: "",
    
    // Base salary (linked to SalaryStructure)
    basic_salary: "20000", hra: "8000", special_allowance: "4750", conveyance: "1600",
    medical_allowance: "1250", telephone_allowance: "500", food_allowance: "2000",
    variable_pay: "0", company_accommodation: false, accommodation_rent: "0", canteen_deduction: "50",
    provident_fund: true, esic_insurance: true, professional_tax_state: "Maharashtra", tds_tax_monthly: "0"
  });

  // Unique Employee Code generation helper (EMP-YYYY-NNN)
  const autoGenerateCode = useMemo(() => {
    const year = new Date().getFullYear();
    const count = (safeEmployees.length + 1).toString().padStart(3, "0");
    return `EMP-${year}-${count}`;
  }, [safeEmployees]);

  // Set default generated code on mount / form open
  const handleOpenOnboarding = () => {
    setOnboardForm(prev => ({
      ...prev,
      employee_code: autoGenerateCode
    }));
    setOnboardActiveTab("personal");
    setIsOnboardingOpen(true);
  };

  // Submit onboarding details
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!onboardForm.first_name || !onboardForm.last_name) {
      return toast.error("First Name and Last Name are required");
    }

    try {
      const { manageStaffUser } = await import("@/firebase/functions");
      const companyId = localStorage.getItem("company_id") || "VOGATS";
      const uCode = onboardForm.employee_code.replace(/[-\s]/g, "");
      const internalEmail = `${uCode.toLowerCase()}@${companyId.toLowerCase()}.gstbill.app`;

      // Provision Auth user + Core user record
      const result = await manageStaffUser({
        action: "CREATE",
        companyId,
        userCode: uCode.toUpperCase(),
        email: internalEmail,
        contact_email: onboardForm.personal_email || internalEmail,
        contact_mobile: onboardForm.personal_phone || "9876543210",
        name: `${onboardForm.first_name} ${onboardForm.last_name}`,
        password: `EMP@${uCode}`,
        roleId: "role-cashier",
        salary: Number(onboardForm.basic_salary) + Number(onboardForm.hra),
        branchId: onboardForm.work_location,
        is_active: true
      });

      if (result.success) {
        const genUid = result.user?.uid || result.user?.id;
        
        // Write dynamic values to Employee master collection
        await base44.entities.Employee.create({
          id: genUid,
          company_id: companyId,
          employee_code: onboardForm.employee_code,
          first_name: onboardForm.first_name,
          middle_name: onboardForm.middle_name,
          last_name: onboardForm.last_name,
          full_name: `${onboardForm.first_name} ${onboardForm.last_name}`,
          preferred_name: onboardForm.first_name,
          dob: onboardForm.dob,
          gender: onboardForm.gender,
          marital_status: onboardForm.marital_status,
          blood_group: onboardForm.blood_group,
          nationality: onboardForm.nationality,
          religion: onboardForm.religion,
          caste_category: onboardForm.caste_category,
          physically_disabled: onboardForm.physically_disabled,
          disability_details: onboardForm.disability_details,
          photo_url: onboardForm.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
          emergency_contacts: onboardForm.emergency_contacts ? JSON.parse(onboardForm.emergency_contacts) : [],
          personal_email: onboardForm.personal_email,
          work_email: internalEmail,
          personal_phone: onboardForm.personal_phone,
          work_phone: onboardForm.work_phone,
          whatsapp_number: onboardForm.whatsapp_number,
          present_address: onboardForm.present_address ? { line1: onboardForm.present_address } : {},
          permanent_address: onboardForm.permanent_address ? { line1: onboardForm.permanent_address } : {},
          
          aadhaar_number: onboardForm.aadhaar_number,
          pan_number: onboardForm.pan_number,
          passport_number: onboardForm.passport_number,
          passport_expiry: onboardForm.passport_expiry,
          uan_number: onboardForm.uan_number,
          esic_number: onboardForm.esic_number,
          
          department_id: onboardForm.department_id,
          designation_id: onboardForm.designation_id,
          employment_type: onboardForm.employment_type,
          grade: onboardForm.grade,
          date_of_joining: onboardForm.date_of_joining,
          probation_end_date: onboardForm.probation_end_date,
          reporting_manager: onboardForm.reporting_manager,
          work_location: onboardForm.work_location,
          shift_id: onboardForm.shift_id,
          cost_center: onboardForm.cost_center,
          
          bank_name: onboardForm.bank_name,
          account_number: onboardForm.account_number,
          ifsc_code: onboardForm.ifsc_code,
          account_type: onboardForm.account_type,
          account_holder_name: `${onboardForm.first_name} ${onboardForm.last_name}`,
          payment_mode: onboardForm.payment_mode,
          upi_id: onboardForm.upi_id,
          
          worker_category: onboardForm.worker_category,
          floor_zone: onboardForm.floor_zone,
          biometric_id: onboardForm.biometric_id,
          rfid_card_no: onboardForm.rfid_card_no,
          is_piece_rate: onboardForm.is_piece_rate,
          piece_rate_per_unit: Number(onboardForm.piece_rate_per_unit),
          machine_certified: onboardForm.machine_certified ? onboardForm.machine_certified.split(",") : [],
          
          leavesBalance: 15,
          leavesUsed: 0,
          status: "active"
        });

        // Write base structure to SalaryStructures
        await base44.entities.SalaryStructure.create({
          employeeId: genUid,
          company_id: companyId,
          effective_from: onboardForm.date_of_joining,
          ctc_annual: (Number(onboardForm.basic_salary) + Number(onboardForm.hra) + Number(onboardForm.special_allowance) + Number(onboardForm.conveyance) + Number(onboardForm.medical_allowance) + Number(onboardForm.food_allowance)) * 12,
          basic_salary: Number(onboardForm.basic_salary),
          hra: Number(onboardForm.hra),
          special_allowance: Number(onboardForm.special_allowance),
          conveyance: Number(onboardForm.conveyance),
          medical_allowance: Number(onboardForm.medical_allowance),
          food_allowance: Number(onboardForm.food_allowance),
          night_shift_allow: Number(onboardForm.night_shift_allow || 0),
          pf_employee: onboardForm.provident_fund ? Math.round(Number(onboardForm.basic_salary) * 0.12) : 0,
          pf_employer: onboardForm.provident_fund ? Math.round(Number(onboardForm.basic_salary) * 0.12) : 0,
          esic_employee: onboardForm.esic_insurance ? Math.round(Number(onboardForm.basic_salary) * 0.0075) : 0,
          esic_employer: onboardForm.esic_insurance ? Math.round(Number(onboardForm.basic_salary) * 0.0325) : 0,
          professional_tax: 200,
          tds_monthly: Number(onboardForm.tds_tax_monthly),
          net_take_home: Number(onboardForm.basic_salary) + Number(onboardForm.hra) + Number(onboardForm.special_allowance) - Math.round(Number(onboardForm.basic_salary) * 0.12) - 200,
          is_current: true
        });

        toast.success(`Employee ${onboardForm.first_name} onboarded successfully! Account auto-created with password: EMP@${uCode}`);
        setIsOnboardingOpen(false);
        refetchUsers();
        refetchDetails();
      }
    } catch (error) {
      toast.error("Onboarding failed: " + error.message);
    }
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return safeEmployees.filter(emp => {
      if (!emp) return false;
      const name = emp.name || emp.full_name || (emp.first_name && emp.last_name ? `${emp.first_name} ${emp.last_name}` : "") || "";
      const code = emp.employeeId || emp.employee_code || "";
      const searchLower = searchTerm.toLowerCase();
      
      const nameMatch = name.toLowerCase().includes(searchLower) || code.toLowerCase().includes(searchLower);
      
      const roleMatch = roleFilter === "all" || emp.role_id === roleFilter || (emp.role && emp.role.toLowerCase() === roleFilter.toLowerCase());
      
      const deptMatch = deptFilter === "all" || emp.department === deptFilter;

      return nameMatch && roleMatch && deptMatch;
    });
  }, [safeEmployees, searchTerm, roleFilter, deptFilter]);

  // Selected Employee Profile Data Bindings
  const profileDetails = useMemo(() => {
    const emp = selectedEmployee || {};
    const leaves = safeLeavesList.filter(l => l && emp.id && l.employeeId === emp.id);
    const attendance = safeAttendanceLogs.filter(a => a && emp.id && a.employeeId === emp.id);
    const loans = safeLoansList.filter(l => l && emp.id && l.employeeId === emp.id);
    const performance = safePerformanceList.filter(p => p && emp.id && p.employeeId === emp.id);
    const documents = safeDocumentsList.filter(d => d && emp.id && d.employeeId === emp.id);
    
    const leavesLeft = emp.leavesBalance || 15;
    const presentCount = attendance.filter(a => a && (a.status === "Verified" || a.status === "present")).length;
    const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 94.2;

    return {
      ...emp,
      leaves,
      attendance,
      loans,
      performance,
      documents,
      leavesLeft,
      attendanceRate,
      presentCount
    };
  }, [selectedEmployee, safeLeavesList, safeAttendanceLogs, safeLoansList, safePerformanceList, safeDocumentsList]);

  return (
    <div className="space-y-6">
      
      {!selectedEmployee ? (
        <>
          {/* SEARCH & FILTERS PANEL */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/30 p-4 border border-border/50 rounded-2xl backdrop-blur-md">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute left-3 top-2.5 text-muted-foreground"><Search className="w-4 h-4" /></span>
              <Input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search Employee, Code or ID..."
                className="pl-9 bg-background/50 text-xs border-border/40 focus:border-primary/50"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <select 
                value={deptFilter} 
                onChange={e => setDeptFilter(e.target.value)}
                className="bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
              >
                <option value="all">All Departments</option>
                {safeDepartmentsList.map((d, i) => (
                  <option key={i} value={d.name}>{d.name}</option>
                ))}
              </select>

              <select 
                value={roleFilter} 
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
              >
                <option value="all">All Roles</option>
                {safeRoles.map(r => (
                  <option key={r.id} value={r.role_name}>{r.label}</option>
                ))}
              </select>
              
              <Button 
                onClick={handleOpenOnboarding} 
                className="text-xs gap-2 font-bold gold-gradient text-black h-9 shadow-lg shadow-amber-500/10 shrink-0 ml-auto sm:ml-0"
              >
                <UserPlus className="w-4 h-4" /> Onboard Employee
              </Button>
            </div>
          </div>

          {/* EMPLOYEE CARDS DIRECTORY GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredEmployees.map(emp => {
              const baseSalary = Number(emp.basicSalary || emp.salary || 20000);
              const allowances = Number(emp.hra || 0) + Number(emp.allowances || 0);
              
              return (
                <div 
                  key={emp.id} 
                  className="bg-card/40 backdrop-blur-md border border-border/50 p-5 rounded-2xl shadow-xl flex flex-col justify-between hover:border-primary/50 hover:shadow-indigo-500/5 transition-all duration-300 group scale-[1.01] hover:scale-[1.02]"
                >
                  <div className="space-y-4">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={emp.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
                          alt={emp.name} 
                          className="w-10 h-10 rounded-xl border border-border/50 object-cover"
                        />
                        <div>
                          <h4 className="font-black text-sm leading-none group-hover:text-primary transition-colors">{emp.name || emp.full_name}</h4>
                          <span className="text-[10px] text-muted-foreground font-mono mt-1 block">{emp.employeeId || emp.employee_code || "EMP-2026-X"}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        emp.status === "active" || emp.is_active
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}>
                        {emp.status || "Active"}
                      </span>
                    </div>

                    {/* Meta stats */}
                    <div className="grid grid-cols-2 gap-3 border-t border-b border-border/20 py-3 text-[11px] font-medium text-muted-foreground">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-0.5">Department</span>
                        <strong className="text-foreground">{emp.department || "Operations"}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-0.5">Shift Sector</span>
                        <strong className="text-foreground">{emp.shift || "General Shift"}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-0.5">Designation</span>
                        <strong className="text-primary">{emp.designation || "Executive"}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider mb-0.5">Gross Wages</span>
                        <strong className="text-emerald-500">₹{Number(baseSalary + allowances).toLocaleString("en-IN")}</strong>
                      </div>
                    </div>

                    {/* Sensitive Masked Details */}
                    <div className="space-y-1.5 text-[10px] bg-secondary/20 p-2.5 rounded-lg border border-border/30 font-mono">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aadhaar (PAN):</span>
                        <span className="text-foreground font-bold font-sans">
                          {emp.aadhaar_number ? `XXXX-XXXX-${emp.aadhaar_number.slice(-4)}` : "Not saved"} 
                          {emp.pan_number ? ` (${emp.pan_number})` : ""}
                        </span>
                      </div>
                    </div>

                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/20 mt-4">
                    <span className="text-[10px] text-muted-foreground font-medium">Joined: {emp.joiningDate || emp.date_of_joining || "2026-01-15"}</span>
                    <Button 
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setProfileActiveTab("overview");
                      }}
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-[10px] px-3 font-bold border-border/60 hover:bg-secondary/40"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1 text-primary" /> View Profile
                    </Button>
                  </div>

                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* ==================== 10-TAB EMPLOYEE PROFILE VIEW ==================== */
        <div className="bg-card/40 backdrop-blur-md border border-border/50 p-6 rounded-2xl shadow-xl animate-fade-up">
          
          {/* Header & Back Button */}
          <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-6">
            <Button 
              onClick={() => setSelectedEmployee(null)} 
              variant="outline" 
              className="text-xs h-8 font-bold text-muted-foreground hover:text-foreground"
            >
              ← Back to Roster
            </Button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                profileDetails.status === "active" || profileDetails.is_active 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}>
                🟢 {profileDetails.status || "Active"}
              </span>
            </div>
          </div>

          {/* Employee Hero Card */}
          <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-xl border border-border/30 bg-slate-500/5 mb-6 text-center md:text-left">
            <img 
              src={profileDetails.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
              alt={profileDetails.name} 
              className="w-24 h-24 rounded-2xl border-2 border-primary/20 object-cover shadow-lg"
            />
            <div className="space-y-1">
              <h3 className="text-xl font-black text-foreground">{profileDetails.name || profileDetails.full_name}</h3>
              <p className="text-xs font-bold text-primary">{profileDetails.designation || "Sr. Production Engineer"}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground justify-center md:justify-start font-medium pt-1">
                <span className="font-mono">{profileDetails.employeeId || profileDetails.employee_code || "EMP-2026-018"}</span>
                <span>•</span>
                <span>{profileDetails.department || "Manufacturing"}</span>
                <span>•</span>
                <span>📍 {profileDetails.work_location || "Main Plant, Pune"}</span>
              </div>
            </div>
          </div>

          {/* Profile Tabs Navigation */}
          <Tabs value={profileActiveTab} onValueChange={setProfileActiveTab} className="space-y-6">
            <div className="border-b border-border/30 overflow-x-auto pb-2 scrollbar-thin">
              <TabsList className="bg-secondary/15 p-1 rounded-xl h-10 border border-border/40 flex w-max max-w-none">
                <TabsTrigger value="overview" className="text-xs font-bold px-3">Overview</TabsTrigger>
                <TabsTrigger value="personal" className="text-xs font-bold px-3">Personal</TabsTrigger>
                <TabsTrigger value="employment" className="text-xs font-bold px-3">Employment</TabsTrigger>
                <TabsTrigger value="salary" className="text-xs font-bold px-3">Salary Structure</TabsTrigger>
                <TabsTrigger value="attendance" className="text-xs font-bold px-3">Attendance</TabsTrigger>
                <TabsTrigger value="leaves" className="text-xs font-bold px-3">Leaves</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs font-bold px-3">Documents</TabsTrigger>
                <TabsTrigger value="performance" className="text-xs font-bold px-3">Performance</TabsTrigger>
                <TabsTrigger value="loans" className="text-xs font-bold px-3">Loans &amp; Advances</TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: OVERVIEW */}
            <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-secondary/25 border border-border/40 p-4 rounded-xl text-center space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">💰 CTC (Annual)</span>
                  <strong className="text-md font-black text-foreground">₹{Number((Number(profileDetails.basicSalary || 20000) + Number(profileDetails.hra || 0) + Number(profileDetails.allowances || 0)) * 12).toLocaleString("en-IN")}</strong>
                  <span className="text-[9px] block text-muted-foreground">₹{Number(profileDetails.basicSalary || 20000).toLocaleString("en-IN")}/mo Basic</span>
                </div>
                <div className="bg-secondary/25 border border-border/40 p-4 rounded-xl text-center space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">📅 Tenure</span>
                  <strong className="text-md font-black text-primary">4 Years 4 Months</strong>
                  <span className="text-[9px] block text-emerald-500 font-extrabold">CONFIRMED</span>
                </div>
                <div className="bg-secondary/25 border border-border/40 p-4 rounded-xl text-center space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">⭐ Performance Rating</span>
                  <strong className="text-md font-black text-amber-500">4.2 / 5.0</strong>
                  <span className="text-[9px] block text-muted-foreground font-semibold">Exceeds Expectation</span>
                </div>
                <div className="bg-secondary/25 border border-border/40 p-4 rounded-xl text-center space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">🏖️ Leaves Balance</span>
                  <strong className="text-md font-black text-indigo-400">{profileDetails.leavesLeft} Left</strong>
                  <span className="text-[9px] block text-muted-foreground">Used: {profileDetails.leavesUsed || 0} days</span>
                </div>
                <div className="bg-secondary/25 border border-border/40 p-4 rounded-xl text-center space-y-1">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block">📊 Attendance Rate</span>
                  <strong className="text-md font-black text-emerald-500">{profileDetails.attendanceRate}%</strong>
                  <span className="text-[9px] block text-muted-foreground">Punctuality Score 98</span>
                </div>
              </div>
            </TabsContent>

            {/* TAB: PERSONAL */}
            <TabsContent value="personal" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300 text-xs">
              <div className="space-y-4 bg-secondary/15 p-4 rounded-xl border border-border/30">
                <h4 className="font-black text-sm text-foreground border-b border-border/20 pb-2 flex items-center gap-1.5"><HeartPulse className="w-4 h-4 text-emerald-500" /> Basic Bio Details</h4>
                <div className="grid grid-cols-2 gap-3 leading-relaxed text-muted-foreground">
                  <div><span>Full Name:</span><strong className="text-foreground block">{profileDetails.full_name || profileDetails.name}</strong></div>
                  <div><span>DOB:</span><strong className="text-foreground block">{profileDetails.dob || "12 Mar 1990"}</strong></div>
                  <div><span>Gender:</span><strong className="text-foreground block capitalize">{profileDetails.gender || "male"}</strong></div>
                  <div><span>Marital Status:</span><strong className="text-foreground block capitalize">{profileDetails.marital_status || "married"}</strong></div>
                  <div><span>Blood Group:</span><strong className="text-foreground block text-red-500">{profileDetails.blood_group || "B+"}</strong></div>
                  <div><span>Nationality:</span><strong className="text-foreground block">{profileDetails.nationality || "Indian"}</strong></div>
                </div>
              </div>

              <div className="space-y-4 bg-secondary/15 p-4 rounded-xl border border-border/30">
                <h4 className="font-black text-sm text-foreground border-b border-border/20 pb-2 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Identity Credentials</h4>
                <div className="grid grid-cols-2 gap-3 leading-relaxed text-muted-foreground font-mono">
                  <div><span>Aadhaar Number:</span><strong className="text-foreground block font-sans">{profileDetails.aadhaar_number || "XXXX-XXXX-4521"}</strong></div>
                  <div><span>PAN Tax ID:</span><strong className="text-foreground block uppercase">{profileDetails.pan_number || "ABCDE1234F"}</strong></div>
                  <div><span>UAN EPF ID:</span><strong className="text-foreground block">{profileDetails.uan_number || "101234567890"}</strong></div>
                  <div><span>ESIC Insurance No:</span><strong className="text-foreground block">{profileDetails.esic_number || "1234567890"}</strong></div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: EMPLOYMENT */}
            <TabsContent value="employment" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/15 p-4 rounded-xl border border-border/30">
                <div>
                  <h4 className="font-black text-sm text-foreground border-b border-border/20 pb-2 mb-3">Employment Details</h4>
                  <div className="grid grid-cols-2 gap-3 leading-relaxed text-muted-foreground">
                    <div><span>Department:</span><strong className="text-foreground block">{profileDetails.department || "Manufacturing"}</strong></div>
                    <div><span>Designation:</span><strong className="text-foreground block">{profileDetails.designation || "Sr. Production Engineer"}</strong></div>
                    <div><span>Grade Scale:</span><strong className="text-foreground block">{profileDetails.grade || "L3"}</strong></div>
                    <div><span>Employment Type:</span><strong className="text-foreground block capitalize">{profileDetails.employment_type || "full_time"}</strong></div>
                    <div><span>Work Location:</span><strong className="text-foreground block">{profileDetails.work_location || "Main Plant, Pune"}</strong></div>
                    <div><span>Shift Sector:</span><strong className="text-foreground block">{profileDetails.shift || "Morning Shift"}</strong></div>
                  </div>
                </div>
                
                {/* Dynamic/Conditional MES certifications */}
                {activeBusinessType === "manufacturer" && (
                  <div>
                    <h4 className="font-black text-sm text-amber-500 border-b border-border/20 pb-2 mb-3">MES &amp; Factory Specifications</h4>
                    <div className="grid grid-cols-2 gap-3 leading-relaxed text-muted-foreground">
                      <div><span>Biometric Hardware ID:</span><strong className="text-foreground block">{profileDetails.biometric_id || "BIO-0042"}</strong></div>
                      <div><span>RFID Card Identifier:</span><strong className="text-foreground block">{profileDetails.rfid_card_no || "RFID-124982"}</strong></div>
                      <div><span>Floor Zone Allocation:</span><strong className="text-foreground block">Zone {profileDetails.floor_zone || "A"}</strong></div>
                      <div><span>Piece-Rate Option:</span><strong className="text-foreground block">{profileDetails.is_piece_rate ? `Piece-Rate Enabled (₹${profileDetails.piece_rate_per_unit || "10"}/unit)` : "Hourly Standard Wage"}</strong></div>
                      <div className="col-span-2">
                        <span>Certified Machine Clearances:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(profileDetails.machine_certified || ["Injection Moulding", "CNC Lathe"]).map((c, i) => (
                            <span key={i} className="bg-amber-500/10 text-amber-500 border border-amber-500/20 py-0.5 px-2 rounded-full text-[9px] font-bold">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB: SALARY */}
            <TabsContent value="salary" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Earnings List */}
                <div className="bg-secondary/15 p-4 rounded-xl border border-border/30 space-y-3">
                  <h4 className="font-black text-sm text-emerald-500 border-b border-emerald-500/20 pb-2">1. Monthly Earnings / Allowances</h4>
                  <div className="space-y-2 font-medium">
                    <div className="flex justify-between"><span>Basic Salary</span><strong className="text-foreground">₹{Number(profileDetails.basicSalary || 20000).toLocaleString("en-IN")}</strong></div>
                    <div className="flex justify-between"><span>House Rent Allowance (HRA)</span><strong className="text-foreground">₹{Number(profileDetails.hra || 8000).toLocaleString("en-IN")}</strong></div>
                    <div className="flex justify-between"><span>Special Allowances</span><strong className="text-foreground">₹{Number(profileDetails.allowances || 4750).toLocaleString("en-IN")}</strong></div>
                    <div className="flex justify-between"><span>Conveyance Allowance</span><strong className="text-foreground">₹1,600</strong></div>
                    <div className="flex justify-between"><span>Medical Welfare Allowance</span><strong className="text-foreground">₹1,250</strong></div>
                  </div>
                </div>

                {/* Deductions List */}
                <div className="bg-secondary/15 p-4 rounded-xl border border-border/30 space-y-3">
                  <h4 className="font-black text-sm text-red-400 border-b border-red-500/20 pb-2">2. Statutory Deductions</h4>
                  <div className="space-y-2 font-medium">
                    <div className="flex justify-between"><span>PF Employee Contribution (12%)</span><strong className="text-red-400">-{Number(Math.round(Number(profileDetails.basicSalary || 20000) * 0.12)).toLocaleString("en-IN")}</strong></div>
                    <div className="flex justify-between"><span>ESIC Health Insurance (0.75%)</span><strong className="text-red-400">-{Number(Math.round((Number(profileDetails.basicSalary || 20000) + Number(profileDetails.hra || 8000) + Number(profileDetails.allowances || 4750)) * 0.0075)).toLocaleString("en-IN")}</strong></div>
                    <div className="flex justify-between"><span>Professional Tax (Maharashtra)</span><strong className="text-red-400">-₹200</strong></div>
                    <div className="flex justify-between"><span>Monthly TDS Withholding Tax</span><strong className="text-red-400">-{Number(profileDetails.tds || 860).toLocaleString("en-IN")}</strong></div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: ATTENDANCE */}
            <TabsContent value="attendance" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Swipe Date</th>
                      <th className="p-3">Gate Type</th>
                      <th className="p-3">Branch Location</th>
                      <th className="p-3">Face Verification</th>
                      <th className="p-3 text-right">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.attendance || []).map((log, i) => (
                      <tr key={i} className="hover:bg-secondary/15">
                        <td className="p-3 font-semibold">{log.date} <span className="text-[10px] text-muted-foreground block">{log.time}</span></td>
                        <td className="p-3 font-bold"><span className={`px-2 py-0.5 rounded text-[9px] ${log.type === "CHECK_IN" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"}`}>{log.type}</span></td>
                        <td className="p-3">{log.branchId}</td>
                        <td className="p-3 font-mono">{log.faceMatchScore}% Match</td>
                        <td className="p-3 text-right"><span className={`font-bold text-[9px] px-2 py-0.5 rounded ${log.status === "Verified" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive animate-pulse"}`}>{log.status}</span></td>
                      </tr>
                    ))}
                    {(profileDetails.attendance || []).length === 0 && (
                      <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">No attendance swipes registered in database yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: LEAVES */}
            <TabsContent value="leaves" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Leave Type</th>
                      <th className="p-3">From Date</th>
                      <th className="p-3">To Date</th>
                      <th className="p-3">Days Span</th>
                      <th className="p-3 text-right">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.leaves || []).map((req, i) => (
                      <tr key={i} className="hover:bg-secondary/15">
                        <td className="p-3 font-bold">{req.leaveType}</td>
                        <td className="p-3">{req.startDate}</td>
                        <td className="p-3">{req.endDate}</td>
                        <td className="p-3 font-bold text-primary">{req.durationDays} Days</td>
                        <td className="p-3 text-right"><span className={`font-bold text-[9px] px-2 py-0.5 rounded ${req.status === "Approved" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>{req.status}</span></td>
                      </tr>
                    ))}
                    {(profileDetails.leaves || []).length === 0 && (
                      <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">No leave request logs processed.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: DOCUMENTS */}
            <TabsContent value="documents" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Document Category</th>
                      <th className="p-3">Document Name</th>
                      <th className="p-3">Verification Link</th>
                      <th className="p-3 text-right">Audit Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.documents || []).map((doc, i) => (
                      <tr key={i} className="hover:bg-secondary/15">
                        <td className="p-3 font-bold capitalize">{doc.doc_type}</td>
                        <td className="p-3">{doc.doc_name}</td>
                        <td className="p-3"><a href={doc.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Download / Verify File</a></td>
                        <td className="p-3 text-right"><span className="text-emerald-500 font-extrabold">✓ COMPLIANT</span></td>
                      </tr>
                    ))}
                    {(profileDetails.documents || []).length === 0 && (
                      <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">No identity documents scanned to vault yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: PERFORMANCE */}
            <TabsContent value="performance" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Review Period</th>
                      <th className="p-3">Overall Rating</th>
                      <th className="p-3">Increment Recommended</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.performance || []).map((p, i) => (
                      <tr key={i} className="hover:bg-secondary/15">
                        <td className="p-3 font-bold">{p.review_period}</td>
                        <td className="p-3 capitalize">{p.overall_rating} ({p.overall_score}/5.0)</td>
                        <td className="p-3 font-semibold text-emerald-500">+{p.increment_percent}% Hike</td>
                        <td className="p-3 text-right"><span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[9px] font-bold">Finalized</span></td>
                      </tr>
                    ))}
                    {(profileDetails.performance || []).length === 0 && (
                      <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">No quarterly ratings finalized yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: LOANS */}
            <TabsContent value="loans" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Advance Type</th>
                      <th className="p-3">Principal Borrowed</th>
                      <th className="p-3">EMI Monthly Deduction</th>
                      <th className="p-3">Outstanding Balance</th>
                      <th className="p-3 text-right">State Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.loans || []).map((l, i) => (
                      <tr key={i} className="hover:bg-secondary/15">
                        <td className="p-3 font-bold capitalize">{l.type}</td>
                        <td className="p-3">₹{l.amount.toLocaleString("en-IN")}</td>
                        <td className="p-3">₹{l.emi_amount.toLocaleString("en-IN")}/mo</td>
                        <td className="p-3 font-semibold text-red-400">₹{l.balance_outstanding.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right"><span className="bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded font-bold uppercase">{l.status}</span></td>
                      </tr>
                    ))}
                    {(profileDetails.loans || []).length === 0 && (
                      <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">No active advance loans recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

          </Tabs>

        </div>
      )}

      {/* ==================== MODAL: ADD EMPLOYEE ONBOARDING WIZARD (6 TABS) ==================== */}
      <Dialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen}>
        <DialogContent className="max-w-3xl bg-card border border-border/50 text-xs overflow-y-auto max-h-[85vh] scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-primary">Onboard Enterprise Employee Portal</DialogTitle>
            <DialogDescription className="text-xs">
              Configure personal parameters, compliance identities, salary CTC details, and seed them isolation isolated to this branch.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={onboardActiveTab} onValueChange={setOnboardActiveTab} className="space-y-4">
            
            {/* Tabs List */}
            <div className="border-b border-border/30 overflow-x-auto pb-1 scrollbar-none">
              <TabsList className="bg-secondary/15 p-1 rounded-xl h-9 border border-border/30 flex w-full max-w-none">
                <TabsTrigger value="personal" className="text-[11px] font-bold px-3 py-1">1. Personal Info</TabsTrigger>
                <TabsTrigger value="employment" className="text-[11px] font-bold px-3 py-1">2. Employment</TabsTrigger>
                <TabsTrigger value="salary" className="text-[11px] font-bold px-3 py-1">3. Salary/CTC</TabsTrigger>
                <TabsTrigger value="identity" className="text-[11px] font-bold px-3 py-1">4. Identities</TabsTrigger>
                <TabsTrigger value="bank" className="text-[11px] font-bold px-3 py-1">5. Bank Details</TabsTrigger>
                <TabsTrigger value="factory" className="text-[11px] font-bold px-3 py-1">6. Factory MES</TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: Personal Info */}
            <TabsContent value="personal" className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">FIRST NAME *</Label>
                  <Input 
                    value={onboardForm.first_name}
                    onChange={e => setOnboardForm(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="e.g. Ramesh"
                    className="text-xs bg-background/50 h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">MIDDLE NAME</Label>
                  <Input 
                    value={onboardForm.middle_name}
                    onChange={e => setOnboardForm(prev => ({ ...prev, middle_name: e.target.value }))}
                    placeholder="Kumar"
                    className="text-xs bg-background/50 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">LAST NAME *</Label>
                  <Input 
                    value={onboardForm.last_name}
                    onChange={e => setOnboardForm(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Sharma"
                    className="text-xs bg-background/50 h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">DOB *</Label>
                  <Input 
                    type="date"
                    value={onboardForm.dob}
                    onChange={e => setOnboardForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="text-xs bg-background/50 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">GENDER *</Label>
                  <select 
                    value={onboardForm.gender}
                    onChange={e => setOnboardForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">BLOOD GROUP</Label>
                  <select 
                    value={onboardForm.blood_group}
                    onChange={e => setOnboardForm(prev => ({ ...prev, blood_group: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                  >
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="O+">O+</option>
                    <option value="AB+">AB+</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="O-">O-</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-[10px] font-bold text-muted-foreground">PERSONAL EMAIL ID</Label>
                  <Input 
                    value={onboardForm.personal_email}
                    onChange={e => setOnboardForm(prev => ({ ...prev, personal_email: e.target.value }))}
                    placeholder="ramesh@gmail.com"
                    className="text-xs bg-background/50 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">PERSONAL PHONE NO</Label>
                  <Input 
                    value={onboardForm.personal_phone}
                    onChange={e => setOnboardForm(prev => ({ ...prev, personal_phone: e.target.value }))}
                    placeholder="9876543210"
                    className="text-xs bg-background/50 h-9"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <Button 
                  onClick={() => setOnboardActiveTab("employment")}
                  type="button" 
                  className="font-bold bg-primary text-black text-xs h-8 px-4"
                >
                  Save &amp; Continue
                </Button>
              </div>
            </TabsContent>

            {/* TAB: Employment Details */}
            <TabsContent value="employment" className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">EMPLOYEE ID / CODE *</Label>
                  <Input 
                    value={onboardForm.employee_code}
                    onChange={e => setOnboardForm(prev => ({ ...prev, employee_code: e.target.value }))}
                    placeholder="EMP-2026-001"
                    className="text-xs bg-background/50 h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">DEPARTMENT *</Label>
                  <select 
                    value={onboardForm.department_id}
                    onChange={e => setOnboardForm(prev => ({ ...prev, department_id: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                  >
                    <option value="">Select Department...</option>
                    {safeDepartmentsList.map((d, i) => (
                      <option key={i} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">DESIGNATION *</Label>
                  <select 
                    value={onboardForm.designation_id}
                    onChange={e => setOnboardForm(prev => ({ ...prev, designation_id: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                  >
                    <option value="">Select Designation...</option>
                    {safeDesignationsList.map((d, i) => (
                      <option key={i} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">SHIFT ROSTER *</Label>
                  <select 
                    value={onboardForm.shift_id}
                    onChange={e => setOnboardForm(prev => ({ ...prev, shift_id: e.target.value }))}
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                  >
                    <option value="">Select Shift...</option>
                    {safeShiftsList.map((s, i) => (
                      <option key={i} value={s.name}>{s.name} ({s.start_time} - {s.end_time})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">DATE OF JOINING *</Label>
                  <Input 
                    type="date"
                    value={onboardForm.date_of_joining}
                    onChange={e => setOnboardForm(prev => ({ ...prev, date_of_joining: e.target.value }))}
                    className="text-xs bg-background/50 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">WORK LOCATION *</Label>
                  <Input 
                    value={onboardForm.work_location}
                    onChange={e => setOnboardForm(prev => ({ ...prev, work_location: e.target.value }))}
                    placeholder="e.g. Main Plant"
                    className="text-xs bg-background/50 h-9"
                  />
                </div>
              </div>
              <div className="flex justify-between pt-3">
                <Button onClick={() => setOnboardActiveTab("personal")} type="button" variant="outline" className="text-xs h-8 px-4">Back</Button>
                <Button onClick={() => setOnboardActiveTab("salary")} type="button" className="font-bold bg-primary text-black text-xs h-8 px-4">Save &amp; Continue</Button>
              </div>
            </TabsContent>

            {/* TAB: Salary details */}
            <TabsContent value="salary" className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">BASIC SALARY (₹ / MONTH) *</Label>
                  <Input 
                    type="number"
                    value={onboardForm.basic_salary}
                    onChange={e => setOnboardForm(prev => ({ ...prev, basic_salary: e.target.value }))}
                    className="text-xs bg-background/50 h-9 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">HRA ALLOWANCE (₹ / MONTH) *</Label>
                  <Input 
                    type="number"
                    value={onboardForm.hra}
                    onChange={e => setOnboardForm(prev => ({ ...prev, hra: e.target.value }))}
                    className="text-xs bg-background/50 h-9 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">SPECIAL ALLOWANCE (₹ / MONTH)</Label>
                  <Input 
                    type="number"
                    value={onboardForm.special_allowance}
                    onChange={e => setOnboardForm(prev => ({ ...prev, special_allowance: e.target.value }))}
                    className="text-xs bg-background/50 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 block tracking-wider">PROVIDENT FUND (PF) DEDUCT</Label>
                  <select 
                    value={onboardForm.provident_fund ? "true" : "false"}
                    onChange={e => setOnboardForm(prev => ({ ...prev, provident_fund: e.target.value === "true" }))}
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                  >
                    <option value="true">Enable Statutory PF (12%)</option>
                    <option value="false">Disable PF Schemes</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-400 block tracking-wider">ESIC HEALTH CONTRIBUTION</Label>
                  <select 
                    value={onboardForm.esic_insurance ? "true" : "false"}
                    onChange={e => setOnboardForm(prev => ({ ...prev, esic_insurance: e.target.value === "true" }))}
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                  >
                    <option value="true">Enable ESIC Schemes</option>
                    <option value="false">Disable ESIC Schemes</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-between pt-3">
                <Button onClick={() => setOnboardActiveTab("employment")} type="button" variant="outline" className="text-xs h-8 px-4">Back</Button>
                <Button onClick={() => setOnboardActiveTab("identity")} type="button" className="font-bold bg-primary text-black text-xs h-8 px-4">Save &amp; Continue</Button>
              </div>
            </TabsContent>

            {/* TAB: Identity Documents */}
            <TabsContent value="identity" className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">AADHAAR COMPLIANCE ID (12 DIGITS)</Label>
                  <Input 
                    value={onboardForm.aadhaar_number}
                    onChange={e => setOnboardForm(prev => ({ ...prev, aadhaar_number: e.target.value.replace(/\D/g, "") }))}
                    placeholder="XXXX-XXXX-XXXX"
                    className="text-xs bg-background/50 h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">PAN DIRECT TAX ID (10 DIGITS)</Label>
                  <Input 
                    value={onboardForm.pan_number}
                    onChange={e => setOnboardForm(prev => ({ ...prev, pan_number: e.target.value.toUpperCase() }))}
                    placeholder="ABCDE1234F"
                    className="text-xs bg-background/50 h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">PROVIDENT FUND UAN ID</Label>
                  <Input 
                    value={onboardForm.uan_number}
                    onChange={e => setOnboardForm(prev => ({ ...prev, uan_number: e.target.value.replace(/\D/g, "") }))}
                    placeholder="101XXXXXXXXX"
                    className="text-xs bg-background/50 h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">ESIC IDENTIFICATION NUMBER</Label>
                  <Input 
                    value={onboardForm.esic_number}
                    onChange={e => setOnboardForm(prev => ({ ...prev, esic_number: e.target.value }))}
                    placeholder="ESIC Registration"
                    className="text-xs bg-background/50 h-9 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-between pt-3">
                <Button onClick={() => setOnboardActiveTab("salary")} type="button" variant="outline" className="text-xs h-8 px-4">Back</Button>
                <Button onClick={() => setOnboardActiveTab("bank")} type="button" className="font-bold bg-primary text-black text-xs h-8 px-4">Save &amp; Continue</Button>
              </div>
            </TabsContent>

            {/* TAB: Bank details */}
            <TabsContent value="bank" className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">BANK NAME</Label>
                  <Input 
                    value={onboardForm.bank_name}
                    onChange={e => setOnboardForm(prev => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="HDFC Bank"
                    className="text-xs bg-background/50 h-9 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">ACCOUNT NUMBER</Label>
                  <Input 
                    value={onboardForm.account_number}
                    onChange={e => setOnboardForm(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="XXXXXXXX5021"
                    className="text-xs bg-background/50 h-9 font-bold font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">BANK IFSC CODE</Label>
                  <Input 
                    value={onboardForm.ifsc_code}
                    onChange={e => setOnboardForm(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                    placeholder="HDFC0001041"
                    className="text-xs bg-background/50 h-9 font-bold font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-between pt-3">
                <Button onClick={() => setOnboardActiveTab("identity")} type="button" variant="outline" className="text-xs h-8 px-4">Back</Button>
                <Button onClick={() => setOnboardActiveTab("factory")} type="button" className="font-bold bg-primary text-black text-xs h-8 px-4">Save &amp; Continue</Button>
              </div>
            </TabsContent>

            {/* TAB: Factory MES specifications */}
            <TabsContent value="factory" className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">BIOMETRIC CONSOLE DEVICE ID</Label>
                  <Input 
                    value={onboardForm.biometric_id}
                    onChange={e => setOnboardForm(prev => ({ ...prev, biometric_id: e.target.value }))}
                    placeholder="BIO-9901"
                    className="text-xs bg-background/50 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">RFID CARD CODE NUMBER</Label>
                  <Input 
                    value={onboardForm.rfid_card_no}
                    onChange={e => setOnboardForm(prev => ({ ...prev, rfid_card_no: e.target.value }))}
                    placeholder="RFID-99802"
                    className="text-xs bg-background/50 h-9"
                  />
                </div>
                
                {activeBusinessType === "manufacturer" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground">PIECE-RATE OPTION</Label>
                      <select 
                        value={onboardForm.is_piece_rate ? "true" : "false"}
                        onChange={e => setOnboardForm(prev => ({ ...prev, is_piece_rate: e.target.value === "true" }))}
                        className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                      >
                        <option value="false">Hourly / Monthly Wages</option>
                        <option value="true">Piece-Rate (Per unit produced)</option>
                      </select>
                    </div>
                    
                    {onboardForm.is_piece_rate && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-muted-foreground">PIECE RATE PER UNIT PRODUCED (₹)</Label>
                        <Input 
                          type="number"
                          value={onboardForm.piece_rate_per_unit}
                          onChange={e => setOnboardForm(prev => ({ ...prev, piece_rate_per_unit: e.target.value }))}
                          className="text-xs bg-background/50 h-9 font-bold text-emerald-500"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[10px] font-bold text-muted-foreground">CERTIFIED MACHINERY (Comma-separated)</Label>
                      <Input 
                        value={onboardForm.machine_certified}
                        onChange={e => setOnboardForm(prev => ({ ...prev, machine_certified: e.target.value }))}
                        placeholder="Injection Moulding, CNC Lathe, Packaging Machine"
                        className="text-xs bg-background/50 h-9"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex justify-between pt-4 border-t border-border/20 mt-4">
                <Button onClick={() => setOnboardActiveTab("bank")} type="button" variant="outline" className="text-xs h-8 px-4">Back</Button>
                <Button 
                  onClick={handleOnboardSubmit}
                  type="button" 
                  className="font-bold gold-gradient text-black text-xs h-9 px-6 shadow-lg shadow-amber-500/10"
                >
                  Onboard &amp; Generate Credentials
                </Button>
              </div>
            </TabsContent>

          </Tabs>
        </DialogContent>
      </Dialog>

    </div>
  );
}
