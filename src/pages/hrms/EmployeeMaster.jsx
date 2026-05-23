import { useState, useMemo } from "react";
import { 
  Users, Search, UserPlus, Eye, Trash2, CheckCircle2, UserCheck, Edit, ShieldCheck, HeartPulse,
  Fingerprint, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { toast } from "@/lib/toast";

function SearchableSelect({ value, onChange, options = [], placeholder = "Select option...", label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      (opt.label || opt.name || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search]);

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value || opt.id === value || opt.name === value);
  }, [options, value]);

  const displayLabel = selectedOption ? (selectedOption.label || selectedOption.name) : placeholder;

  return (
    <div className="space-y-1.5 relative w-full text-xs text-left">
      {label && <Label className="text-[10px] font-bold text-muted-foreground uppercase">{label}</Label>}
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full bg-background border border-border/80 rounded-lg py-2 px-3 h-9 text-xs font-bold flex items-center justify-between cursor-pointer hover:border-primary/50 transition"
      >
        <span className="text-foreground">{displayLabel}</span>
        <span className="text-muted-foreground text-[8px]">▼</span>
      </div>

      {isOpen && (
        <>
          {/* Backdrop for dismiss */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setSearch("");
            }} 
          />
          {/* Options Dropdown list overlay */}
          <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border/60 rounded-xl shadow-xl z-50 p-2 max-h-48 overflow-y-auto flex flex-col gap-1 scrollbar-thin">
            <Input 
              type="text" 
              placeholder="Search..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              onClick={e => e.stopPropagation()} 
              className="text-[11px] bg-background/50 h-8 border-border/40 mb-1 shrink-0"
              autoFocus
            />
            <div className="overflow-y-auto flex flex-col gap-0.5 max-h-36">
              {filteredOptions.length === 0 ? (
                <div className="p-2 text-center text-muted-foreground text-[10px]">No results found.</div>
              ) : (
                filteredOptions.map((opt, i) => {
                  const optVal = opt.value || opt.id || opt.name || "";
                  const optLabel = opt.label || opt.name || "";
                  return (
                    <div 
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(optVal);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={`p-2 rounded-lg cursor-pointer hover:bg-secondary/40 font-semibold text-[10.5px] transition ${
                        value === optVal ? "bg-primary/10 text-primary" : "text-foreground"
                      }`}
                    >
                      {optLabel}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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
  documentsList = [],
  salaryStructures = []
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
  const safeSalaryStructures = useMemo(() => Array.isArray(salaryStructures) ? salaryStructures : [], [salaryStructures]);

  // Profile Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isManualDept, setIsManualDept] = useState(false);
  const [isManualDesg, setIsManualDesg] = useState(false);

  // Onboarding Biometric Simulator Enrollment States
  const [isFaceEnrolling, setIsFaceEnrolling] = useState(false);
  const [faceEnrollHash, setFaceEnrollHash] = useState("");
  const [isThumbEnrolling, setIsThumbEnrolling] = useState(false);
  const [thumbEnrollId, setThumbEnrollId] = useState("");

  // Inline Roster Row Edit States
  const [activeEditRowType, setActiveEditRowType] = useState(null); // 'attendance', 'leave', 'document', 'performance', 'loan'
  const [editingRowData, setEditingRowData] = useState(null);
  const [isRowModalOpen, setIsRowModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
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
    first_name: "", middle_name: "", last_name: "", dob: "", gender: "male", marital_status: "single",
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
    status: "Active",
    
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


  // CSV Import/Export States
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isCsvUploading, setIsCsvUploading] = useState(false);
  const [csvUploadProgress, setCsvUploadProgress] = useState("");

  // Core RFC 4180 Compliant CSV Parser
  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(row);
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== '') {
      lines.push(row);
    }
    return lines;
  };

  // Core RFC 4180 Compliant CSV Generator
  const generateCSV = (rows) => {
    return rows.map(row => 
      row.map(val => {
        const stringVal = val === null || val === undefined ? "" : String(val);
        if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n") || stringVal.includes("\r")) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(",")
    ).join("\r\n");
  };

  // Handler: Download Sample CSV template for user guidance
  const handleDownloadSampleCsv = () => {
    const headers = [
      "employee_code", "first_name", "last_name", "department", "designation", 
      "basic_salary", "hra", "allowances", "bank_name", "account_number", 
      "ifsc_code", "biometric_id", "rfid_card_no", "work_location", "shift_sector",
      "present_days", "lop_days", "overtime_hours", "email", "phone"
    ];
    const sampleRow1 = [
      "EMP-2026-001", "Ramesh", "Kumar", "Manufacturing", "Floor Operator",
      "25000", "10000", "5000", "HDFC Bank", "5010022334455",
      "HDFC0001234", "BIO-9081", "RFID-29381", "Main Plant", "General Shift",
      "26", "0", "4", "ramesh@example.com", "9876543210"
    ];
    const sampleRow2 = [
      "EMP-2026-002", "Suresh", "Patil", "Sales & Marketing", "QC Specialist",
      "32000", "12000", "6000", "ICICI Bank", "000401567890",
      "ICIC0000004", "BIO-9082", "RFID-29382", "Main Plant", "General Shift",
      "25", "1", "0", "suresh@example.com", "9876543211"
    ];
    
    const csvString = generateCSV([headers, sampleRow1, sampleRow2]);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "employee_roster_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample CSV template downloaded successfully!");
  };

  // Handler: Export current filtered employees roster
  const handleExportRosterCsv = () => {
    const headers = [
      "employee_code", "first_name", "last_name", "department", "designation", 
      "basic_salary", "hra", "allowances", "bank_name", "account_number", 
      "ifsc_code", "biometric_id", "rfid_card_no", "work_location", "shift_sector",
      "present_days", "lop_days", "overtime_hours", "email", "phone"
    ];

    const rows = [headers];

    filteredEmployees.forEach(emp => {
      const matchStruct = safeSalaryStructures.find(s => s && s.employeeId === emp.id) || {};
      const firstName = emp.first_name || emp.name?.split(" ")[0] || "";
      const lastName = emp.last_name || emp.name?.split(" ").slice(1).join(" ") || "";
      
      rows.push([
        emp.employee_code || emp.employeeId || "",
        firstName,
        lastName,
        emp.department || emp.department_id || "Manufacturing",
        emp.designation || emp.designation_id || "Floor Operator",
        String(matchStruct.basic_salary || emp.basicSalary || "20000"),
        String(matchStruct.hra || emp.hra || "8000"),
        String(matchStruct.special_allowance || emp.allowances || "5000"),
        emp.bank_name || "",
        emp.account_number || "",
        emp.ifsc_code || "",
        emp.biometric_id || "",
        emp.rfid_card_no || "",
        emp.work_location || "Main Plant",
        emp.shift || emp.shift_id || "General Shift",
        String(emp.present_days !== undefined ? emp.present_days : (emp.presentDays !== undefined ? emp.presentDays : "26")),
        String(emp.lop_days !== undefined ? emp.lop_days : (emp.lopDays !== undefined ? emp.lopDays : "0")),
        String(emp.overtime_hours !== undefined ? emp.overtime_hours : (emp.overtimeHours !== undefined ? emp.overtimeHours : "0")),
        emp.personal_email || emp.work_email || "",
        emp.personal_phone || emp.work_phone || ""
      ]);
    });

    const csvString = generateCSV(rows);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `employee_roster_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Successfully exported roster of ${filteredEmployees.length} employees to CSV!`);
  };

  // Handler: Reconcile and Sync incoming CSV rows with database
  const handleImportRosterCsv = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCsvUploading(true);
    setCsvUploadProgress("Parsing spreadsheet rows...");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target.result;
          const parsed = parseCSV(text);
          if (parsed.length <= 1) {
            toast.error("CSV file is empty or only contains headers.");
            setIsCsvUploading(false);
            return;
          }

          const headers = parsed[0].map(h => h.trim().toLowerCase());
          const records = parsed.slice(1).filter(r => r.length > 0 && r.some(v => v.trim() !== ""));

          // Column indices mapper
          const colIndex = (colName) => headers.indexOf(colName);

          const codeIdx = colIndex("employee_code");
          const firstIdx = colIndex("first_name");
          const lastIdx = colIndex("last_name");

          if (codeIdx === -1 || firstIdx === -1 || lastIdx === -1) {
            toast.error("Invalid CSV structure. Make sure headers include: employee_code, first_name, last_name.");
            setIsCsvUploading(false);
            return;
          }

          setCsvUploadProgress(`Syncing ${records.length} roster profiles with cloud catalog...`);

          const companyId = localStorage.getItem("company_id") || "VOGATS";
          let successCount = 0;
          let newEmployeesCount = 0;

          // Import auth management functions
          const { manageStaffUser } = await import("@/firebase/functions");

          // Keep in-memory arrays to quickly track newly added entities within loop
          const localDepts = [...safeDepartmentsList];
          const localDesigs = [...safeDesignationsList];

          for (let i = 0; i < records.length; i++) {
            const row = records[i];
            const code = row[codeIdx]?.trim();
            const first = row[firstIdx]?.trim();
            const last = row[lastIdx]?.trim();

            if (!code || !first) continue;

            setCsvUploadProgress(`Processing ${i + 1}/${records.length}: [${code}] ${first}...`);

            const dept = colIndex("department") !== -1 ? row[colIndex("department")]?.trim() : "Manufacturing";
            const desg = colIndex("designation") !== -1 ? row[colIndex("designation")]?.trim() : "Floor Operator";
            const basic = colIndex("basic_salary") !== -1 ? Number(row[colIndex("basic_salary")]) || 20000 : 20000;
            const hra = colIndex("hra") !== -1 ? Number(row[colIndex("hra")]) || 8000 : 8000;
            const allowances = colIndex("allowances") !== -1 ? Number(row[colIndex("allowances")]) || 5000 : 5000;
            const bank = colIndex("bank_name") !== -1 ? row[colIndex("bank_name")]?.trim() : "";
            const account = colIndex("account_number") !== -1 ? row[colIndex("account_number")]?.trim() : "";
            const ifsc = colIndex("ifsc_code") !== -1 ? row[colIndex("ifsc_code")]?.trim() : "";
            const bio = colIndex("biometric_id") !== -1 ? row[colIndex("biometric_id")]?.trim() : "";
            const rfid = colIndex("rfid_card_no") !== -1 ? row[colIndex("rfid_card_no")]?.trim() : "";
            const loc = colIndex("work_location") !== -1 ? row[colIndex("work_location")]?.trim() : "Main Plant";
            const shift = colIndex("shift_sector") !== -1 ? row[colIndex("shift_sector")]?.trim() : "General Shift";
            const pres = colIndex("present_days") !== -1 ? String(row[colIndex("present_days")]?.trim() || "26") : "26";
            const lop = colIndex("lop_days") !== -1 ? String(row[colIndex("lop_days")]?.trim() || "0") : "0";
            const ot = colIndex("overtime_hours") !== -1 ? String(row[colIndex("overtime_hours")]?.trim() || "0") : "0";
            const email = colIndex("email") !== -1 && row[colIndex("email")]?.trim() 
              ? row[colIndex("email")]?.trim() 
              : `${code.replace(/[-\s]/g, "").toLowerCase()}@${companyId.toLowerCase()}.easybmt.app`;
            const phone = colIndex("phone") !== -1 && row[colIndex("phone")]?.trim() 
              ? row[colIndex("phone")]?.trim() 
              : "9876543210";

            // Ensure Department exists dynamically
            if (dept) {
              const deptExists = localDepts.some(d => d.name?.toLowerCase() === dept.toLowerCase());
              if (!deptExists) {
                const newCode = dept.substring(0, 3).toUpperCase() + Math.floor(10 + Math.random() * 90);
                try {
                  await base44.entities.Department.create({ name: dept, code: newCode });
                  localDepts.push({ name: dept, code: newCode });
                } catch (err) {
                  console.error("Auto-seeding department failed:", err);
                }
              }
            }

            // Ensure Designation exists dynamically
            if (desg) {
              const desgExists = localDesigs.some(d => d.name?.toLowerCase() === desg.toLowerCase());
              if (!desgExists) {
                const newCode = desg.substring(0, 3).toUpperCase() + Math.floor(10 + Math.random() * 90);
                try {
                  await base44.entities.Designation.create({ name: desg, code: newCode });
                  localDesigs.push({ name: desg, code: newCode });
                } catch (err) {
                  console.error("Auto-seeding designation failed:", err);
                }
              }
            }

            // Check if profile exists
            const existingEmp = safeEmployees.find(emp => 
              emp.employee_code?.trim().toLowerCase() === code.toLowerCase() ||
              emp.employeeId?.trim().toLowerCase() === code.toLowerCase() ||
              emp.id?.trim().toLowerCase() === code.toLowerCase()
            );

            const employeeData = {
              company_id: companyId,
              employee_code: code,
              first_name: first,
              last_name: last || "",
              full_name: `${first} ${last || ""}`,
              preferred_name: first,
              department: dept,
              department_id: dept,
              designation: desg,
              designation_id: desg,
              basicSalary: basic,
              hra: hra,
              allowances: allowances,
              bank_name: bank,
              account_number: account,
              ifsc_code: ifsc,
              account_holder_name: `${first} ${last || ""}`,
              biometric_id: bio,
              rfid_card_no: rfid,
              work_location: loc,
              shift: shift,
              shift_id: shift,
              present_days: pres,
              lop_days: lop,
              overtime_hours: ot,
              personal_email: email,
              work_email: email,
              personal_phone: phone,
              work_phone: phone,
              status: "active",
              leavesBalance: 15,
              leavesUsed: 0
            };

            const salaryData = {
              effective_from: new Date().toISOString().split("T")[0],
              ctc_annual: (basic + hra + allowances) * 12,
              basic_salary: basic,
              hra: hra,
              special_allowance: allowances,
              conveyance: 1600,
              medical_allowance: 1250,
              food_allowance: 2000,
              pf_employee: Math.round(basic * 0.12),
              pf_employer: Math.round(basic * 0.12),
              esic_employee: Math.round(basic * 0.0075),
              esic_employer: Math.round(basic * 0.0325),
              professional_tax: 200,
              professional_tax_state: "Maharashtra",
              tds_monthly: 0,
              net_take_home: basic + hra + allowances - Math.round(basic * 0.12) - 200,
              is_current: true
            };

            if (existingEmp) {
              // Reconcile Profile properties
              await base44.entities.Employee.update(existingEmp.id, employeeData);
              
              try {
                await base44.entities.User.update(existingEmp.id, {
                  name: `${first} ${last || ""}`,
                  salary: basic + hra,
                  branchId: loc
                });
              } catch (err) {
                console.warn(`Credentials node refresh skipped for user ${code}`, err);
              }

              // Sync salary scale structure
              const existingStructure = safeSalaryStructures.find(s => s && s.employeeId === existingEmp.id);
              if (existingStructure) {
                await base44.entities.SalaryStructure.update(existingStructure.id, salaryData);
              } else {
                await base44.entities.SalaryStructure.create({
                  employeeId: existingEmp.id,
                  company_id: companyId,
                  ...salaryData
                });
              }
              successCount++;
            } else {
              // Seamless onboarding of a new profile
              const newEmp = await base44.entities.Employee.create(employeeData);

              await base44.entities.SalaryStructure.create({
                employeeId: newEmp.id,
                company_id: companyId,
                ...salaryData
              });

              successCount++;
              newEmployeesCount++;
            }
          }

          toast.success(`Roster successfully reconciled: ${successCount} profiles synced, including ${newEmployeesCount} new onboardings!`);
          setIsCsvModalOpen(false);
          
          // Trigger data reload triggers
          refetchUsers();
          refetchDetails();
        } catch (err) {
          console.error(err);
          toast.error("Reconciliation error: " + err.message);
        } finally {
          setIsCsvUploading(false);
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error(error);
      toast.error("Failed to read roster CSV file.");
      setIsCsvUploading(false);
    }
  };

  // Unique Employee Code generation helper (EMP-YYYY-NNN)
  const autoGenerateCode = useMemo(() => {
    const year = new Date().getFullYear();
    const count = (safeEmployees.length + 1).toString().padStart(3, "0");
    return `EMP-${year}-${count}`;
  }, [safeEmployees]);

  // Set default generated code on mount / form open
  const handleOpenOnboarding = () => {

    setIsEditing(false);
    setEditingId(null);
    setIsManualDept(false);
    setIsManualDesg(false);
    setFaceEnrollHash("");
    setThumbEnrollId("");
    setOnboardForm({
      first_name: "", middle_name: "", last_name: "", dob: "", gender: "male", marital_status: "single",
      blood_group: "B+", nationality: "Indian", religion: "Hindu", caste_category: "general",
      physically_disabled: false, disability_details: "", photo_url: "", emergency_contacts: "",
      personal_email: "", work_email: "", personal_phone: "", work_phone: "", whatsapp_number: "",
      present_address: "", permanent_address: "", same_as_present: true,
      
      aadhaar_number: "", pan_number: "", passport_number: "", passport_expiry: "",
      voter_id: "", driving_license: "", dl_expiry: "", uan_number: "", esic_number: "",
      
      employee_code: autoGenerateCode, department_id: "", designation_id: "", employment_type: "full_time",
      grade: "L3", date_of_joining: new Date().toISOString().split("T")[0], probation_end_date: "",
      confirmation_date: "", date_of_leaving: "", notice_period_days: "30", reporting_manager: "",
      work_location: "Main Plant", shift_id: "", cost_center: "", work_from_home: false,
      
      education: "", certifications: "", skills: "", previous_experience: "",
      
      bank_name: "", account_number: "", ifsc_code: "", account_type: "savings",
      account_holder_name: "", payment_mode: "bank_transfer", upi_id: "",
      
      worker_category: "floor_worker", floor_zone: "A", biometric_id: "", rfid_card_no: "",
      is_piece_rate: false, piece_rate_per_unit: "10.00", machine_certified: "",
      
      basic_salary: "20000", hra: "8000", special_allowance: "4750", conveyance: "1600",
      medical_allowance: "1250", telephone_allowance: "500", food_allowance: "2000",
      variable_pay: "0", company_accommodation: false, accommodation_rent: "0", canteen_deduction: "50",
      provident_fund: true, esic_insurance: true, professional_tax_state: "Maharashtra", tds_tax_monthly: "0"
    });
    setOnboardActiveTab("personal");
    setIsOnboardingOpen(true);
  };

  // Pre-load onboard form state for editing
  const handleStartEdit = (emp) => {
    setIsEditing(true);
    setEditingId(emp.id);
    
    // Find matching salary structure
    const matchingSalary = safeSalaryStructures.find(s => s && s.employeeId === emp.id) || {};
    
    setOnboardForm({
      first_name: emp.first_name || emp.name?.split(" ")[0] || "",
      middle_name: emp.middle_name || "",
      last_name: emp.last_name || emp.name?.split(" ").slice(1).join(" ") || "",
      dob: emp.dob || "",
      gender: emp.gender || "male",
      marital_status: emp.marital_status || "single",
      blood_group: emp.blood_group || "B+",
      nationality: emp.nationality || "Indian",
      religion: emp.religion || "Hindu",
      caste_category: emp.caste_category || "general",
      physically_disabled: emp.physically_disabled || false,
      disability_details: emp.disability_details || "",
      photo_url: emp.photo_url || "",
      emergency_contacts: emp.emergency_contacts ? JSON.stringify(emp.emergency_contacts) : "",
      personal_email: emp.personal_email || "",
      work_email: emp.work_email || "",
      personal_phone: emp.personal_phone || "",
      work_phone: emp.work_phone || "",
      whatsapp_number: emp.whatsapp_number || "",
      present_address: emp.present_address?.line1 || "",
      permanent_address: emp.permanent_address?.line1 || "",
      same_as_present: emp.same_as_present || true,
      
      aadhaar_number: emp.aadhaar_number || "",
      pan_number: emp.pan_number || "",
      passport_number: emp.passport_number || "",
      passport_expiry: emp.passport_expiry || "",
      voter_id: emp.voter_id || "",
      driving_license: emp.driving_license || "",
      dl_expiry: emp.dl_expiry || "",
      uan_number: emp.uan_number || "",
      esic_number: emp.esic_number || "",
      
      employee_code: emp.employee_code || emp.employeeId || "",
      department_id: emp.department || emp.department_id || "",
      designation_id: emp.designation || emp.designation_id || "",
      employment_type: emp.employment_type || "full_time",
      grade: emp.grade || "L3",
      date_of_joining: emp.date_of_joining || emp.joiningDate || new Date().toISOString().split("T")[0],
      probation_end_date: emp.probation_end_date || "",
      confirmation_date: emp.confirmation_date || "",
      date_of_leaving: emp.date_of_leaving || "",
      notice_period_days: emp.notice_period_days || "30",
      reporting_manager: emp.reporting_manager || "",
      work_location: emp.work_location || "Main Plant",
      shift_id: emp.shift || emp.shift_id || "",
      cost_center: emp.cost_center || "",
      work_from_home: emp.work_from_home || false,
      
      education: emp.education || "",
      certifications: emp.certifications || "",
      skills: emp.skills || "",
      previous_experience: emp.previous_experience || "",
      
      bank_name: emp.bank_name || "",
      account_number: emp.account_number || "",
      ifsc_code: emp.ifsc_code || "",
      account_type: emp.account_type || "savings",
      account_holder_name: emp.account_holder_name || "",
      payment_mode: emp.payment_mode || "bank_transfer",
      upi_id: emp.upi_id || "",
      
      worker_category: emp.worker_category || "floor_worker",
      floor_zone: emp.floor_zone || "A",
      biometric_id: emp.biometric_id || "",
      rfid_card_no: emp.rfid_card_no || "",
      is_piece_rate: emp.is_piece_rate || false,
      piece_rate_per_unit: emp.piece_rate_per_unit || "10.00",
      machine_certified: emp.machine_certified ? emp.machine_certified.join(", ") : "",
      
      basic_salary: String(matchingSalary.basic_salary || emp.basicSalary || "20000"),
      hra: String(matchingSalary.hra || emp.hra || "8000"),
      special_allowance: String(matchingSalary.special_allowance || emp.allowances || "4750"),
      conveyance: String(matchingSalary.conveyance || "1600"),
      medical_allowance: String(matchingSalary.medical_allowance || "1250"),
      telephone_allowance: String(matchingSalary.telephone_allowance || "500"),
      food_allowance: String(matchingSalary.food_allowance || "2000"),
      variable_pay: String(matchingSalary.variable_pay || "0"),
      company_accommodation: matchingSalary.company_accommodation || false,
      accommodation_rent: String(matchingSalary.accommodation_rent || "0"),
      canteen_deduction: String(matchingSalary.canteen_deduction || "50"),
      provident_fund: matchingSalary.pf_employee > 0,
      esic_insurance: matchingSalary.esic_employee > 0,
      professional_tax_state: matchingSalary.professional_tax_state || "Maharashtra",
      tds_tax_monthly: String(matchingSalary.tds_monthly || "0")
    });
    
    setFaceEnrollHash("");
    setThumbEnrollId("");
    // Determine manual modes based on existing values not in preset lists
    const deptMatch = safeDepartmentsList.some(d => d.name === (emp.department || emp.department_id));
    const desgMatch = safeDesignationsList.some(d => d.name === (emp.designation || emp.designation_id));
    setIsManualDept(!deptMatch && !!(emp.department || emp.department_id));
    setIsManualDesg(!desgMatch && !!(emp.designation || emp.designation_id));

    setOnboardActiveTab("personal");
    setIsOnboardingOpen(true);
  };

  // Biometrics simulation enrollment actions
  const handleStartFaceEnroll = () => {
    setIsFaceEnrolling(true);
    setFaceEnrollHash("");
    setTimeout(() => {
      const mockHash = "SHA256:FAC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const newBioId = "BIO-FAC-" + Math.floor(1000 + Math.random() * 9000);
      setFaceEnrollHash(mockHash);
      setOnboardForm(prev => ({
        ...prev,
        biometric_id: newBioId
      }));
      setIsFaceEnrolling(false);
      toast.success("Face geometry enrolled successfully! ID: " + newBioId);
    }, 1000);
  };

  const handleStartThumbEnroll = () => {
    setIsThumbEnrolling(true);
    setThumbEnrollId("");
    setTimeout(() => {
      const mockKey = "SHA256:THM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const newRfid = "RFID-THM-" + Math.floor(1000 + Math.random() * 9000);
      setThumbEnrollId(mockKey);
      setOnboardForm(prev => ({
        ...prev,
        rfid_card_no: newRfid
      }));
      setIsThumbEnrolling(false);
      toast.success("Thumbprint map completed successfully! ID: " + newRfid);
    }, 1000);
  };

  // Submit onboarding details
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!onboardForm.first_name || !onboardForm.last_name) {
      return toast.error("First Name and Last Name are required");
    }

    try {
      const companyId = localStorage.getItem("company_id") || "VOGATS";
      const uCode = onboardForm.employee_code.replace(/[-\s]/g, "");
      const internalEmail = `${uCode.toLowerCase()}@${companyId.toLowerCase()}.easybmt.app`;

      // Dynamic Department creation if manual typed and unique
      let deptVal = onboardForm.department_id;
      if (deptVal) {
        const deptExists = safeDepartmentsList.some(d => d.name?.toLowerCase() === deptVal.toLowerCase());
        if (!deptExists) {
          const newCode = deptVal.substring(0, 3).toUpperCase() + Math.floor(10 + Math.random() * 90);
          try {
            await base44.entities.Department.create({ name: deptVal, code: newCode });
          } catch (err) {
            console.error("Failed to seed department:", err);
          }
        }
      }

      // Dynamic Designation creation if manual typed and unique
      let desgVal = onboardForm.designation_id;
      if (desgVal) {
        const desgExists = safeDesignationsList.some(d => d.name?.toLowerCase() === desgVal.toLowerCase());
        if (!desgExists) {
          const newCode = desgVal.substring(0, 3).toUpperCase() + Math.floor(10 + Math.random() * 90);
          try {
            await base44.entities.Designation.create({ name: desgVal, code: newCode });
          } catch (err) {
            console.error("Failed to seed designation:", err);
          }
        }
      }

      const employeeData = {
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
        work_email: onboardForm.work_email || internalEmail,
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
        
        department: onboardForm.department_id,
        department_id: onboardForm.department_id,
        designation: onboardForm.designation_id,
        designation_id: onboardForm.designation_id,
        employment_type: onboardForm.employment_type,
        grade: onboardForm.grade,
        date_of_joining: onboardForm.date_of_joining,
        probation_end_date: onboardForm.probation_end_date,
        reporting_manager: onboardForm.reporting_manager,
        work_location: onboardForm.work_location,
        shift: onboardForm.shift_id,
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
        machine_certified: onboardForm.machine_certified ? onboardForm.machine_certified.split(",").map(s => s.trim()) : [],
        
        leavesBalance: 15,
        leavesUsed: 0,
        status: "active",
        basicSalary: Number(onboardForm.basic_salary),
        hra: Number(onboardForm.hra),
        allowances: Number(onboardForm.special_allowance),
        joiningDate: onboardForm.date_of_joining
      };

      const salaryData = {
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
        professional_tax_state: onboardForm.professional_tax_state,
        tds_monthly: Number(onboardForm.tds_tax_monthly),
        net_take_home: Number(onboardForm.basic_salary) + Number(onboardForm.hra) + Number(onboardForm.special_allowance) - Math.round(Number(onboardForm.basic_salary) * 0.12) - 200,
        is_current: true
      };

      if (isEditing) {
        // Update Employee
        await base44.entities.Employee.update(editingId, employeeData);
        
        // Update User credentials if they exist
        try {
          await base44.entities.User.update(editingId, {
            name: `${onboardForm.first_name} ${onboardForm.last_name}`,
            salary: Number(onboardForm.basic_salary) + Number(onboardForm.hra),
            branchId: onboardForm.work_location
          });
        } catch (err) {
          console.log("No linked user account found to update, skipping User sync.");
        }

        // Update SalaryStructure
        const existingStructure = safeSalaryStructures.find(s => s && s.employeeId === editingId);
        if (existingStructure) {
          await base44.entities.SalaryStructure.update(existingStructure.id, salaryData);
        } else {
          await base44.entities.SalaryStructure.create({
            employeeId: editingId,
            company_id: companyId,
            ...salaryData
          });
        }

        toast.success(`Profile for ${onboardForm.first_name} updated successfully!`);
        setIsOnboardingOpen(false);
        setIsEditing(false);
        setEditingId(null);
        refetchUsers();
        refetchDetails();
        
        // Refresh selected employee view
        setSelectedEmployee({
          ...selectedEmployee,
          ...employeeData,
          name: `${onboardForm.first_name} ${onboardForm.last_name}`
        });

      } else {
        // Create Employee directly (Admin will decide later under Settings -> Users who gets a site login)
        const newEmp = await base44.entities.Employee.create(employeeData);

        await base44.entities.SalaryStructure.create({
          employeeId: newEmp.id,
          company_id: companyId,
          ...salaryData
        });

        toast.success(`Employee ${onboardForm.first_name} onboarded successfully!`);
        setIsOnboardingOpen(false);
        refetchDetails();
      }
    } catch (error) {
      toast.error("Onboarding failed: " + error.message);
    }
  };

  // Row edit dialog states
  const handleStartEditRow = (type, rowData) => {
    setActiveEditRowType(type);
    setEditingRowData({ ...rowData });
    setIsRowModalOpen(true);
  };

  const handleSaveRowEdit = async (e) => {
    e.preventDefault();
    if (!editingRowData || !editingRowData.id) {
      return toast.error("Row identifier missing");
    }

    try {
      if (activeEditRowType === "attendance") {
        await base44.entities.AttendanceLog.update(editingRowData.id, {
          date: editingRowData.date,
          time: editingRowData.time,
          type: editingRowData.type,
          status: editingRowData.status,
          faceMatchScore: Number(editingRowData.faceMatchScore || 98)
        });
      } else if (activeEditRowType === "leave") {
        await base44.entities.LeaveManagement.update(editingRowData.id, {
          leaveType: editingRowData.leaveType,
          startDate: editingRowData.startDate,
          endDate: editingRowData.endDate,
          durationDays: Number(editingRowData.durationDays || 1),
          status: editingRowData.status
        });
      } else if (activeEditRowType === "document") {
        await base44.entities.EmployeeDocument.update(editingRowData.id, {
          doc_type: editingRowData.doc_type,
          doc_name: editingRowData.doc_name,
          file_url: editingRowData.file_url
        });
      } else if (activeEditRowType === "performance") {
        await base44.entities.PerformanceReview.update(editingRowData.id, {
          review_period: editingRowData.review_period,
          overall_rating: editingRowData.overall_rating,
          overall_score: Number(editingRowData.overall_score || 4),
          increment_percent: Number(editingRowData.increment_percent || 0)
        });
      } else if (activeEditRowType === "loan") {
        await base44.entities.EmployeeLoan.update(editingRowData.id, {
          type: editingRowData.type,
          amount: Number(editingRowData.amount || 0),
          emi_amount: Number(editingRowData.emi_amount || 0),
          balance_outstanding: Number(editingRowData.balance_outstanding || 0),
          status: editingRowData.status
        });
      }

      toast.success(`${activeEditRowType.toUpperCase()} item updated successfully!`);
      setIsRowModalOpen(false);
      refetchDetails();
      
      if (selectedEmployee) {
        setSelectedEmployee({ ...selectedEmployee });
      }
    } catch (error) {
      toast.error("Failed to update item: " + error.message);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!emp || !emp.id) return toast.error("Employee details missing");
    const name = emp.name || emp.full_name || "this employee";
    const confirm1 = window.confirm(`CRITICAL WARNING:\nAre you absolutely sure you want to delete the profile of ${name}?\n\nThis will completely wipe all of their employee files, salary records, biometrics mapping, and portal access keys permanently.`);
    if (!confirm1) return;
    
    const confirm2 = window.confirm(`FINAL DOUBLE-CONFIRMATION:\nType OK to finalize deleting ${name}. This action is completely irreversible!`);
    if (!confirm2) return;

    try {
      await base44.entities.Employee.delete(emp.id);
      try {
        await base44.entities.User.delete(emp.id);
      } catch (err) {
        console.warn("User auth record failed to delete:", err);
      }

      const matchingSalary = safeSalaryStructures.find(s => s && s.employeeId === emp.id);
      if (matchingSalary && matchingSalary.id) {
        try {
          await base44.entities.SalaryStructure.delete(matchingSalary.id);
        } catch (err) {
          console.warn("Failed to delete salary structure:", err);
        }
      }

      toast.success(`Complete data record and credentials for ${name} deleted successfully!`);
      setSelectedEmployee(null);
      refetchUsers();
      refetchDetails();
    } catch (error) {
      toast.error("Failed to delete profile: " + error.message);
    }
  };

  const handleDeleteRow = async (type, id) => {
    const confirm = window.confirm(`Are you sure you want to permanently delete this ${type} record? This action is completely irreversible!`);
    if (!confirm) return;

    try {
      if (type === "attendance") {
        await base44.entities.AttendanceLog.delete(id);
      } else if (type === "leave") {
        await base44.entities.LeaveManagement.delete(id);
      } else if (type === "document") {
        await base44.entities.EmployeeDocument.delete(id);
      } else if (type === "performance") {
        await base44.entities.PerformanceReview.delete(id);
      } else if (type === "loan") {
        await base44.entities.EmployeeLoan.delete(id);
      }
      
      toast.success(`${type.toUpperCase()} record deleted successfully.`);
      refetchDetails();
      
      if (selectedEmployee) {
        setSelectedEmployee({ ...selectedEmployee });
      }
    } catch (error) {
      toast.error("Failed to delete record: " + error.message);
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
      const deptMatch = deptFilter === "all" || emp.department === deptFilter || emp.department_id === deptFilter;
      const statusMatch = statusFilter === "all" || (emp.status || "Active")?.toLowerCase() === statusFilter.toLowerCase();

      return nameMatch && roleMatch && deptMatch && statusMatch;
    });
  }, [safeEmployees, searchTerm, roleFilter, deptFilter, statusFilter]);

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
                placeholder="Smart Search Employee, Code or ID..."
                className="pl-9 bg-background/50 text-xs border-border/40 focus:border-primary/50"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
              <select 
                value={deptFilter} 
                onChange={e => setDeptFilter(e.target.value)}
                className="bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold h-9"
              >
                <option value="all">All Departments</option>
                {safeDepartmentsList.map((d, i) => (
                  <option key={i} value={d.name}>{d.name}</option>
                ))}
              </select>

              <select 
                value={roleFilter} 
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold h-9"
              >
                <option value="all">All Roles</option>
                {safeRoles.map(r => (
                  <option key={r.id} value={r.role_name}>{r.label}</option>
                ))}
              </select>

              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold h-9"
              >
                <option value="all">All Status</option>
                <option value="active">🟢 Active</option>
                <option value="inactive">🔴 Inactive</option>
              </select>
              
              <Button 
                onClick={handleOpenOnboarding} 
                className="text-xs gap-2 font-bold gold-gradient text-black h-9 shadow-lg shadow-amber-500/10 shrink-0"
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
          <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-xl border border-border/30 bg-slate-500/5 mb-6 text-center md:text-left relative">
            <img 
              src={profileDetails.photo_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
              alt={profileDetails.name} 
              className="w-24 h-24 rounded-2xl border-2 border-primary/20 object-cover shadow-lg"
            />
            <div className="space-y-1 flex-grow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-black text-foreground">{profileDetails.name || profileDetails.full_name}</h3>
                  <p className="text-xs font-bold text-primary">{profileDetails.designation || "Sr. Production Engineer"}</p>
                </div>
                <div className="flex gap-2 shrink-0 self-center md:self-auto">
                  <Button 
                    onClick={() => handleStartEdit(profileDetails)}
                    className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black h-8 px-4 flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Profile
                  </Button>
                  <Button 
                    onClick={() => handleDeleteEmployee(profileDetails)}
                    className="text-xs font-bold bg-destructive hover:bg-destructive/95 text-white h-8 px-4 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Profile
                  </Button>
                </div>
              </div>
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
                <TabsTrigger value="attendance" className="text-xs font-bold px-3">Attendance Logs</TabsTrigger>
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
                
                {/* Factory MES specific clearances */}
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
                    <div className="flex justify-between"><span>Professional Tax (PT)</span><strong className="text-red-400">-₹200</strong></div>
                    <div className="flex justify-between"><span>Monthly TDS Withholding Tax</span><strong className="text-red-400">-{Number(profileDetails.tds || 860).toLocaleString("en-IN")}</strong></div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: ATTENDANCE */}
            <TabsContent value="attendance" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl bg-background/30">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Swipe Date</th>
                      <th className="p-3">Gate Type</th>
                      <th className="p-3">Branch Location</th>
                      <th className="p-3">Face Verification</th>
                      <th className="p-3 text-center">Audit Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.attendance || []).map((log, i) => (
                      <tr key={log.id || i} className="hover:bg-secondary/15">
                        <td className="p-3 font-semibold">{log.date} <span className="text-[10px] text-muted-foreground block">{log.time}</span></td>
                        <td className="p-3 font-bold"><span className={`px-2 py-0.5 rounded text-[9px] ${log.type === "CHECK_IN" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"}`}>{log.type}</span></td>
                        <td className="p-3">{log.branchId}</td>
                        <td className="p-3 font-mono">{log.faceMatchScore}% Match</td>
                        <td className="p-3 text-center"><span className={`font-bold text-[9px] px-2 py-0.5 rounded ${log.status === "Verified" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive animate-pulse"}`}>{log.status}</span></td>
                        <td className="p-3 text-right flex gap-1.5 justify-end">
                          <Button 
                            onClick={() => handleStartEditRow("attendance", log)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-border/60 hover:bg-secondary/40"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button 
                            onClick={() => handleDeleteRow("attendance", log.id)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-red-500/50 hover:bg-red-500/10 text-red-400"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(profileDetails.attendance || []).length === 0 && (
                      <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No attendance swipes registered in database yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: LEAVES */}
            <TabsContent value="leaves" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl bg-background/30">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Leave Type</th>
                      <th className="p-3">From Date</th>
                      <th className="p-3">To Date</th>
                      <th className="p-3">Days Span</th>
                      <th className="p-3 text-center">Approval Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.leaves || []).map((req, i) => (
                      <tr key={req.id || i} className="hover:bg-secondary/15">
                        <td className="p-3 font-bold">{req.leaveType}</td>
                        <td className="p-3">{req.startDate}</td>
                        <td className="p-3">{req.endDate}</td>
                        <td className="p-3 font-bold text-primary">{req.durationDays} Days</td>
                        <td className="p-3 text-center"><span className={`font-bold text-[9px] px-2 py-0.5 rounded ${req.status === "Approved" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>{req.status}</span></td>
                        <td className="p-3 text-right flex gap-1.5 justify-end">
                          <Button 
                            onClick={() => handleStartEditRow("leave", req)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-border/60 hover:bg-secondary/40"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button 
                            onClick={() => handleDeleteRow("leave", req.id)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-red-500/50 hover:bg-red-500/10 text-red-400"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(profileDetails.leaves || []).length === 0 && (
                      <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No leave request logs processed.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: DOCUMENTS */}
            <TabsContent value="documents" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl bg-background/30">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Document Category</th>
                      <th className="p-3">Document Name</th>
                      <th className="p-3">Verification Link</th>
                      <th className="p-3 text-center">Audit Verified</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.documents || []).map((doc, i) => (
                      <tr key={doc.id || i} className="hover:bg-secondary/15">
                        <td className="p-3 font-bold capitalize">{doc.doc_type}</td>
                        <td className="p-3">{doc.doc_name}</td>
                        <td className="p-3"><a href={doc.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Download / Verify File</a></td>
                        <td className="p-3 text-center"><span className="text-emerald-500 font-extrabold">✓ COMPLIANT</span></td>
                        <td className="p-3 text-right flex gap-1.5 justify-end">
                          <Button 
                            onClick={() => handleStartEditRow("document", doc)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-border/60 hover:bg-secondary/40"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button 
                            onClick={() => handleDeleteRow("document", doc.id)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-red-500/50 hover:bg-red-500/10 text-red-400"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(profileDetails.documents || []).length === 0 && (
                      <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">No identity documents scanned to vault yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: PERFORMANCE */}
            <TabsContent value="performance" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl bg-background/30">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Review Period</th>
                      <th className="p-3">Overall Rating</th>
                      <th className="p-3">Increment Recommended</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.performance || []).map((p, i) => (
                      <tr key={p.id || i} className="hover:bg-secondary/15">
                        <td className="p-3 font-bold">{p.review_period}</td>
                        <td className="p-3 capitalize">{p.overall_rating} ({p.overall_score}/5.0)</td>
                        <td className="p-3 font-semibold text-emerald-500">+{p.increment_percent}% Hike</td>
                        <td className="p-3 text-center"><span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[9px] font-bold">Finalized</span></td>
                        <td className="p-3 text-right flex gap-1.5 justify-end">
                          <Button 
                            onClick={() => handleStartEditRow("performance", p)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-border/60 hover:bg-secondary/40"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button 
                            onClick={() => handleDeleteRow("performance", p.id)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-red-500/50 hover:bg-red-500/10 text-red-400"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(profileDetails.performance || []).length === 0 && (
                      <tr><td colSpan="5" className="p-4 text-center text-muted-foreground">No quarterly ratings finalized yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB: LOANS */}
            <TabsContent value="loans" className="space-y-6 animate-in fade-in duration-300 text-xs">
              <div className="overflow-x-auto border border-border/40 rounded-xl bg-background/30">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Advance Type</th>
                      <th className="p-3">Principal Borrowed</th>
                      <th className="p-3">EMI Monthly Deduction</th>
                      <th className="p-3">Outstanding Balance</th>
                      <th className="p-3 text-center">State Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {(profileDetails.loans || []).map((l, i) => (
                      <tr key={l.id || i} className="hover:bg-secondary/15">
                        <td className="p-3 font-bold capitalize">{l.type}</td>
                        <td className="p-3">₹{l.amount.toLocaleString("en-IN")}</td>
                        <td className="p-3">₹{l.emi_amount.toLocaleString("en-IN")}/mo</td>
                        <td className="p-3 font-semibold text-red-400">₹{l.balance_outstanding.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-center"><span className="bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded font-bold uppercase">{l.status}</span></td>
                        <td className="p-3 text-right flex gap-1.5 justify-end">
                          <Button 
                            onClick={() => handleStartEditRow("loan", l)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-border/60 hover:bg-secondary/40"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button 
                            onClick={() => handleDeleteRow("loan", l.id)}
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-[10px] px-3 font-bold border-red-500/50 hover:bg-red-500/10 text-red-400"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(profileDetails.loans || []).length === 0 && (
                      <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No active advance loans recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      )}

      {/* ==================== MODAL: ADD/EDIT EMPLOYEE ONBOARDING WIZARD (6 TABS) ==================== */}
      <Dialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen}>
        <DialogContent className="max-w-3xl bg-card border border-border/50 text-xs overflow-y-auto max-h-[85vh] scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-primary">
              {isEditing ? "Edit Enterprise Employee Profile" : "Onboard Enterprise Employee Portal"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure personal parameters, compliance identities, salary CTC details, and map biometric keys securely.
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
                
                {/* Swap standard Gender select with SearchableSelect */}
                <div className="space-y-1">
                  <SearchableSelect 
                    label="GENDER *"
                    value={onboardForm.gender}
                    onChange={val => setOnboardForm(prev => ({ ...prev, gender: val }))}
                    options={[
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" }
                    ]}
                    placeholder="Select Gender..."
                  />
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
                    disabled={isEditing}
                  />
                </div>

                {/* Swap Department select with SearchableSelect with manual option */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">DEPARTMENT *</Label>
                    <button 
                      type="button"
                      onClick={() => setIsManualDept(!isManualDept)}
                      className="text-[9px] text-amber-500 hover:underline font-bold"
                    >
                      {isManualDept ? "Select list" : "Type manually"}
                    </button>
                  </div>
                  {isManualDept ? (
                    <Input 
                      value={onboardForm.department_id}
                      onChange={e => setOnboardForm(prev => ({ ...prev, department_id: e.target.value }))}
                      placeholder="Enter Department Name..."
                      className="text-xs bg-background/50 h-9 font-bold"
                      required
                    />
                  ) : (
                    <SearchableSelect 
                      value={onboardForm.department_id}
                      onChange={val => setOnboardForm(prev => ({ ...prev, department_id: val }))}
                      options={safeDepartmentsList.map(d => ({ value: d.name, label: d.name }))}
                      placeholder="Select Department..."
                    />
                  )}
                </div>

                {/* Swap Designation select with SearchableSelect with manual option */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">DESIGNATION *</Label>
                    <button 
                      type="button"
                      onClick={() => setIsManualDesg(!isManualDesg)}
                      className="text-[9px] text-amber-500 hover:underline font-bold"
                    >
                      {isManualDesg ? "Select list" : "Type manually"}
                    </button>
                  </div>
                  {isManualDesg ? (
                    <Input 
                      value={onboardForm.designation_id}
                      onChange={e => setOnboardForm(prev => ({ ...prev, designation_id: e.target.value }))}
                      placeholder="Enter Designation Name..."
                      className="text-xs bg-background/50 h-9 font-bold"
                      required
                    />
                  ) : (
                    <SearchableSelect 
                      value={onboardForm.designation_id}
                      onChange={val => setOnboardForm(prev => ({ ...prev, designation_id: val }))}
                      options={safeDesignationsList.map(d => ({ value: d.name, label: d.name }))}
                      placeholder="Select Designation..."
                    />
                  )}
                </div>

                {/* Swap Shift select with SearchableSelect */}
                <div className="space-y-1">
                  <SearchableSelect 
                    label="SHIFT ROSTER *"
                    value={onboardForm.shift_id}
                    onChange={val => setOnboardForm(prev => ({ ...prev, shift_id: val }))}
                    options={safeShiftsList.map(s => ({ value: s.name, label: `${s.name} (${s.start_time} - ${s.end_time})` }))}
                    placeholder="Select Shift..."
                  />
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
              {/* High-Fidelity Interactive Biometric Enrollment simulator widget cards */}
              <div className="border border-border/40 p-4 rounded-xl bg-slate-500/5 space-y-3">
                <h4 className="font-black text-xs text-primary uppercase tracking-wider flex items-center gap-1">
                  <Fingerprint className="w-4.5 h-4.5 text-primary" /> Premium Biometric enrollment Terminal
                </h4>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Connect live hardware scanners to register employee credential maps. This matches cryptographic keys for floor gate scanners.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {/* Face Scan Card */}
                  <div className="bg-secondary/15 border border-border/40 p-4 rounded-xl flex flex-col items-center justify-between text-center relative overflow-hidden min-h-[200px]">
                    {isFaceEnrolling && (
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-bounce shadow-md shadow-amber-400" />
                    )}
                    <div className="w-16 h-16 rounded-full bg-slate-500/5 border border-border/40 flex items-center justify-center relative">
                      {isFaceEnrolling ? (
                        <Cpu className="w-8 h-8 text-amber-500 animate-pulse" />
                      ) : faceEnrollHash || onboardForm.biometric_id ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <Users className="w-8 h-8 text-slate-500" />
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <h5 className="font-extrabold text-[11px] text-foreground">Facial Recognition Scanner</h5>
                      <p className="text-[10px] text-muted-foreground leading-tight">Map high-precision biometric face geometry.</p>
                      {faceEnrollHash && (
                        <span className="text-[8.5px] font-mono text-emerald-400 block break-all max-w-[200px] mt-1 bg-black/30 p-1 rounded border border-emerald-500/10">{faceEnrollHash}</span>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleStartFaceEnroll}
                      disabled={isFaceEnrolling}
                      className="text-[10px] font-bold h-7 bg-primary text-black mt-3 px-3 w-full"
                    >
                      {isFaceEnrolling ? "Mapping..." : faceEnrollHash || onboardForm.biometric_id ? "Re-scan Face Geometry" : "Start Face Scan"}
                    </Button>
                  </div>

                  {/* Thumbprint Scan Card */}
                  <div className="bg-secondary/15 border border-border/40 p-4 rounded-xl flex flex-col items-center justify-between text-center relative overflow-hidden min-h-[200px]">
                    {isThumbEnrolling && (
                      <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                    )}
                    <div className="w-16 h-16 rounded-full bg-slate-500/5 border border-border/40 flex items-center justify-center relative">
                      {isThumbEnrolling ? (
                        <Fingerprint className="w-8 h-8 text-indigo-400 animate-bounce" />
                      ) : thumbEnrollId || onboardForm.rfid_card_no ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      ) : (
                        <UserCheck className="w-8 h-8 text-slate-500" />
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <h5 className="font-extrabold text-[11px] text-foreground">Capacitive Fingerprint Sensor</h5>
                      <p className="text-[10px] text-muted-foreground leading-tight">Enroll physical thumbprint cryptomap.</p>
                      {thumbEnrollId && (
                        <span className="text-[8.5px] font-mono text-emerald-400 block break-all max-w-[200px] mt-1 bg-black/30 p-1 rounded border border-emerald-500/10">{thumbEnrollId}</span>
                      )}
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleStartThumbEnroll}
                      disabled={isThumbEnrolling}
                      className="text-[10px] font-bold h-7 bg-indigo-500 text-black mt-3 px-3 hover:bg-indigo-600 w-full"
                    >
                      {isThumbEnrolling ? "Enrolling..." : thumbEnrollId || onboardForm.rfid_card_no ? "Re-scan Thumbprint" : "Scan & Map Thumbprint"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">BIOMETRIC CONSOLE DEVICE ID</Label>
                  <Input 
                    value={onboardForm.biometric_id}
                    onChange={e => setOnboardForm(prev => ({ ...prev, biometric_id: e.target.value }))}
                    placeholder="BIO-9901"
                    className="text-xs bg-background/50 h-9 font-mono"
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground">RFID CARD CODE NUMBER</Label>
                  <Input 
                    value={onboardForm.rfid_card_no}
                    onChange={e => setOnboardForm(prev => ({ ...prev, rfid_card_no: e.target.value }))}
                    placeholder="RFID-99802"
                    className="text-xs bg-background/50 h-9 font-mono"
                    disabled
                  />
                </div>
                
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
              </div>
              
              <div className="flex justify-between pt-4 border-t border-border/20 mt-4">
                <Button onClick={() => setOnboardActiveTab("bank")} type="button" variant="outline" className="text-xs h-8 px-4">Back</Button>
                <Button 
                  onClick={handleOnboardSubmit}
                  type="button" 
                  className="font-bold gold-gradient text-black text-xs h-9 px-6 shadow-lg shadow-amber-500/10 animate-pulse"
                >
                  {isEditing ? "Save & Update Profile" : "Onboard & Generate Credentials"}
                </Button>
              </div>
            </TabsContent>

          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: ROW LEVEL INLINE EDIT MODAL ==================== */}
      <Dialog open={isRowModalOpen} onOpenChange={setIsRowModalOpen}>
        <DialogContent className="max-w-md bg-card border border-border/50 text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-primary">Edit Profile Roster Item</DialogTitle>
            <DialogDescription className="text-[11px]">
              Modify historical parameters directly in the secure Firestore entity collection.
            </DialogDescription>
          </DialogHeader>

          {editingRowData && (
            <form onSubmit={handleSaveRowEdit} className="space-y-4 pt-2">
              {activeEditRowType === "attendance" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Punch Type</Label>
                    <select
                      value={editingRowData.type}
                      onChange={e => setEditingRowData({ ...editingRowData, type: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                    >
                      <option value="CHECK_IN">CHECK_IN</option>
                      <option value="CHECK_OUT">CHECK_OUT</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Date</Label>
                    <Input
                      type="date"
                      value={editingRowData.date}
                      onChange={e => setEditingRowData({ ...editingRowData, date: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Time</Label>
                    <Input
                      type="text"
                      value={editingRowData.time}
                      onChange={e => setEditingRowData({ ...editingRowData, time: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Match Score %</Label>
                    <Input
                      type="number"
                      value={editingRowData.faceMatchScore}
                      onChange={e => setEditingRowData({ ...editingRowData, faceMatchScore: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Audit Status</Label>
                    <select
                      value={editingRowData.status}
                      onChange={e => setEditingRowData({ ...editingRowData, status: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                    >
                      <option value="Verified">Verified</option>
                      <option value="Verification Required">Verification Required</option>
                    </select>
                  </div>
                </div>
              )}

              {activeEditRowType === "leave" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Leave Type</Label>
                    <Input
                      value={editingRowData.leaveType}
                      onChange={e => setEditingRowData({ ...editingRowData, leaveType: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Start Date</Label>
                    <Input
                      type="date"
                      value={editingRowData.startDate}
                      onChange={e => setEditingRowData({ ...editingRowData, startDate: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">End Date</Label>
                    <Input
                      type="date"
                      value={editingRowData.endDate}
                      onChange={e => setEditingRowData({ ...editingRowData, endDate: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Days Span</Label>
                    <Input
                      type="number"
                      value={editingRowData.durationDays}
                      onChange={e => setEditingRowData({ ...editingRowData, durationDays: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Approval Status</Label>
                    <select
                      value={editingRowData.status}
                      onChange={e => setEditingRowData({ ...editingRowData, status: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                    >
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              )}

              {activeEditRowType === "document" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Category</Label>
                    <Input
                      value={editingRowData.doc_type}
                      onChange={e => setEditingRowData({ ...editingRowData, doc_type: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Name</Label>
                    <Input
                      value={editingRowData.doc_name}
                      onChange={e => setEditingRowData({ ...editingRowData, doc_name: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">File URL</Label>
                    <Input
                      value={editingRowData.file_url}
                      onChange={e => setEditingRowData({ ...editingRowData, file_url: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                </div>
              )}

              {activeEditRowType === "performance" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Review Period</Label>
                    <Input
                      value={editingRowData.review_period}
                      onChange={e => setEditingRowData({ ...editingRowData, review_period: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Rating Scale</Label>
                    <Input
                      value={editingRowData.overall_rating}
                      onChange={e => setEditingRowData({ ...editingRowData, overall_rating: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Rating Score (1-5)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingRowData.overall_score}
                      onChange={e => setEditingRowData({ ...editingRowData, overall_score: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Increment %</Label>
                    <Input
                      type="number"
                      value={editingRowData.increment_percent}
                      onChange={e => setEditingRowData({ ...editingRowData, increment_percent: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                </div>
              )}

              {activeEditRowType === "loan" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Loan Category</Label>
                    <Input
                      value={editingRowData.type}
                      onChange={e => setEditingRowData({ ...editingRowData, type: e.target.value })}
                      className="bg-background/50 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Principal Borrowed</Label>
                    <Input
                      type="number"
                      value={editingRowData.amount}
                      onChange={e => setEditingRowData({ ...editingRowData, amount: e.target.value })}
                      className="bg-background/50 h-9 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Monthly EMI</Label>
                    <Input
                      type="number"
                      value={editingRowData.emi_amount}
                      onChange={e => setEditingRowData({ ...editingRowData, emi_amount: e.target.value })}
                      className="bg-background/50 h-9 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Outstanding Balance</Label>
                    <Input
                      type="number"
                      value={editingRowData.balance_outstanding}
                      onChange={e => setEditingRowData({ ...editingRowData, balance_outstanding: e.target.value })}
                      className="bg-background/50 h-9 font-bold text-red-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">State Status</Label>
                    <select
                      value={editingRowData.status}
                      onChange={e => setEditingRowData({ ...editingRowData, status: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg py-2 px-3 text-xs h-9 font-bold"
                    >
                      <option value="active">ACTIVE</option>
                      <option value="closed">CLOSED</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border/20 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRowModalOpen(false)}
                  className="text-xs h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="text-xs font-bold gold-gradient text-black h-8 px-5"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
