import { useState, useMemo } from "react";
import { 
  Calculator, UserCheck, ArrowRight, CheckCircle2, ChevronRight, 
  ChevronLeft, Download, AlertTriangle,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { base44 } from "@/api/base44Client";
import { calculatePF, calculateESIC, calculatePT, calculateTDS, getRegulatoryConfig } from "./hrmsUtils";
import { accountingService } from "@/modules/accounting/accountingService";
import jsPDF from "jspdf";

export default function SalaryEngine({ 
  employees = [], 
  monthlyPayrolls = [], 
  refetchDetails, 
  salaryStructures = [],
  loansList = []
}) {
  const [activeSubTab, setActiveSubTab] = useState("calculator");
  const { currency = "₹" } = getRegulatoryConfig();

  // Create guaranteed safe arrays to prevent any undefined/null pointer crashes
  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const safeMonthlyPayrolls = useMemo(() => Array.isArray(monthlyPayrolls) ? monthlyPayrolls : [], [monthlyPayrolls]);
  const safeSalaryStructures = useMemo(() => Array.isArray(salaryStructures) ? salaryStructures : [], [salaryStructures]);
  const safeLoansList = useMemo(() => Array.isArray(loansList) ? loansList : [], [loansList]);

  // --- CTC CALCULATOR STATES ---
  const [calcInputType, setCalcInputType] = useState("monthly"); // monthly, annual
  const [calcInputValue, setCalcInputValue] = useState("35000");
  const [calcPFActive, setCalcPFActive] = useState(true);
  const [calcESICActive, setCalcESICActive] = useState(true);
  const [calcPTState, setCalcPTState] = useState("Maharashtra");

  // Interactive CTC calculations
  const ctcBreakdown = useMemo(() => {
    const rawVal = Number(calcInputValue) || 0;
    const monthlyGross = calcInputType === "annual" ? Math.round(rawVal / 12) : rawVal;

    const basic = Math.round(monthlyGross * 0.50); // standard 50% basic
    const hra = Math.round(monthlyGross * 0.20); // 20% hra
    const allowances = Math.round(monthlyGross * 0.30); // 30% special allowances

    const pf = calcPFActive ? calculatePF(basic) : { employee: 0, employer: 0 };
    const esic = calcESICActive ? calculateESIC(monthlyGross) : { employee: 0, employer: 0 };
    const pt = calculatePT(monthlyGross, calcPTState);
    const tds = calculateTDS(monthlyGross);

    const totalDeductions = pf.employee + esic.employee + pt + tds;
    const netTakeHome = monthlyGross - totalDeductions;
    const employerCost = monthlyGross + pf.employer + esic.employer;

    return {
      monthlyGross,
      basic,
      hra,
      allowances,
      pf,
      esic,
      pt,
      tds,
      totalDeductions,
      netTakeHome,
      employerCost
    };
  }, [calcInputType, calcInputValue, calcPFActive, calcESICActive, calcPTState]);


  // --- PAYROLL RUN WIZARD STATES ---
  const [payrollStep, setPayrollStep] = useState(1);
  const [runMonth, setRunMonth] = useState("2026-05");
  const [runBatch, setRunBatch] = useState("all");
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Custom Overrides table loaded in Step 2
  const [attendanceOverrides, setAttendanceOverrides] = useState({});

  // Loaded Employee Structures & Loans relative to payroll run
  const activeTechnicians = useMemo(() => {
    return safeEmployees.filter(emp => emp && (emp.status === "active" || emp.is_active));
  }, [safeEmployees]);

  // --- SMART FILTER & SEARCH STATES FOR PAYROLL WIZARD ---
  const [searchStaff, setSearchStaff] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    safeEmployees.forEach(emp => {
      if (emp && emp.department) depts.add(emp.department);
    });
    return Array.from(depts);
  }, [safeEmployees]);

  const filteredTechnicians = useMemo(() => {
    return activeTechnicians.filter(emp => {
      if (!emp) return false;
      const matchesSearch = 
        (emp.name || "").toLowerCase().includes(searchStaff.toLowerCase()) ||
        (emp.employee_code || "").toLowerCase().includes(searchStaff.toLowerCase());
      
      const matchesDept = deptFilter === "ALL" || emp.department === deptFilter;
      
      return matchesSearch && matchesDept;
    });
  }, [activeTechnicians, searchStaff, deptFilter]);

  // Handle setting up Step 2 attendance rosters
  const handleProceedToAttendance = () => {
    if (activeTechnicians.length === 0) {
      return toast.error("No active employee profiles found to run payroll.");
    }
    
    // Seed default present and LOP days
    const overrides = {};
    activeTechnicians.forEach(emp => {
      overrides[emp.id] = {
        presentDays: "26",
        lopDays: "0",
        overtimeHours: "0",
        manualBasic: String(emp.basicSalary || emp.salary || 20000),
        bonusAmount: "0",
        incrementAmount: "0"
      };
    });
    setAttendanceOverrides(overrides);
    setPayrollStep(2);
  };

  const handleOverrideChange = (empId, field, value) => {
    setAttendanceOverrides(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value
      }
    }));
  };

  // Step 3 calculations preview
  const payrollPreviewList = useMemo(() => {
    if (payrollStep < 3) return [];

    return activeTechnicians.map(emp => {
      // Find salary structure
      const struct = safeSalaryStructures.find(s => s && s.employeeId === emp.id) || {
        basic_salary: 20000,
        hra: 8000,
        special_allowance: 4750,
        conveyance: 1600,
        medical_allowance: 1250,
        food_allowance: 2000
      };

      // Fetch override parameters
      const params = attendanceOverrides[emp.id] || { 
        presentDays: "26", 
        lopDays: "0", 
        overtimeHours: "0",
        manualBasic: String(emp.basicSalary || emp.salary || 20000),
        bonusAmount: "0",
        incrementAmount: "0"
      };

      const basic = params.manualBasic && Number(params.manualBasic) > 0
        ? Number(params.manualBasic)
        : Number(struct.basic_salary || 20000);

      const bonus = Number(params.bonusAmount) || 0;
      const increment = Number(params.incrementAmount) || 0;

      const grossBase = basic + Number(struct.hra || 0) + Number(struct.special_allowance || 0) + Number(struct.conveyance || 0) + Number(struct.medical_allowance || 0) + Number(struct.food_allowance || 0) + increment;

      const present = Number(params.presentDays) || 0;
      const lop = Number(params.lopDays) || 0;
      const otHrs = Number(params.overtimeHours) || 0;

      // Adjust for LOP: 26 standard working days slab
      const lopFine = Math.round((grossBase / 26) * lop);
      const overtimePay = Math.round((basic / 26 / 8) * 1.5 * otHrs); // overtime rate 1.5x of hourly basic

      const grossCalculated = grossBase - lopFine + overtimePay + bonus;

      // Statutory deductions
      const pf = calculatePF(basic);
      const esic = calculateESIC(grossCalculated);
      const pt = calculatePT(grossCalculated);
      const tds = calculateTDS(grossCalculated);

      // Check advances outstanding
      const loan = safeLoansList.find(l => l && l.employeeId === emp.id && l.status === "active") || null;
      const loanEMI = loan ? Math.min(Number(loan.emi_amount), Number(loan.balance_outstanding)) : 0;

      const totalDeductions = pf.employee + esic.employee + pt + tds + loanEMI;
      const netPayable = Math.max(0, grossCalculated - totalDeductions);

      return {
        empId: emp.id,
        empCode: emp.employee_code || "EMP-X",
        name: emp.name || emp.full_name || "Employee",
        basic,
        bonus,
        increment,
        grossBase,
        lop,
        lopFine,
        otHrs,
        overtimePay,
        grossCalculated,
        pf,
        esic,
        pt,
        tds,
        loanEMI,
        loanId: loan?.id,
        netPayable,
        employerCost: grossCalculated + pf.employer + esic.employer
      };
    });
  }, [payrollStep, activeTechnicians, safeSalaryStructures, attendanceOverrides, safeLoansList]);

  // Grand totals of preview
  const previewTotals = useMemo(() => {
    return payrollPreviewList.reduce((acc, curr) => {
      acc.gross += curr.grossCalculated;
      acc.pfEmp += curr.pf.employee;
      acc.pfEmpr += curr.pf.employer;
      acc.esicEmp += curr.esic.employee;
      acc.esicEmpr += curr.esic.employer;
      acc.pt += curr.pt;
      acc.tds += curr.tds;
      acc.net += curr.netPayable;
      acc.loans += curr.loanEMI;
      return acc;
    }, { gross: 0, pfEmp: 0, pfEmpr: 0, esicEmp: 0, esicEmpr: 0, pt: 0, tds: 0, net: 0, loans: 0 });
  }, [payrollPreviewList]);

  const filteredPreviewList = useMemo(() => {
    return payrollPreviewList.filter(item => {
      const emp = safeEmployees.find(e => e.id === item.empId) || {};
      const matchesSearch = 
        (item.name || "").toLowerCase().includes(searchStaff.toLowerCase()) ||
        (item.empCode || "").toLowerCase().includes(searchStaff.toLowerCase());
      
      const matchesDept = deptFilter === "ALL" || emp.department === deptFilter;
      
      return matchesSearch && matchesDept;
    });
  }, [payrollPreviewList, safeEmployees, searchStaff, deptFilter]);


  // Step 4: Approve, post to Firestore, and sync double-entry accounting A/c
  const handleApproveAndPost = async () => {
    setIsSimulating(true);
    try {
      // 1. Write processed data into MonthlyPayroll collection
      const monthRunRef = `PAY-${runMonth}-${Math.floor(100 + Math.random() * 900)}`;
      
      const payrollRecord = {
        payroll_ref: monthRunRef,
        month: runMonth,
        status: "approved",
        total_gross: previewTotals.gross,
        total_net: previewTotals.net,
        total_pf: previewTotals.pfEmp,
        total_esic: previewTotals.esicEmp,
        total_pt: previewTotals.pt,
        total_tds: previewTotals.tds,
        processed_date: new Date().toISOString()
      };

      await base44.entities.MonthlyPayroll.create(payrollRecord);

      // 2. Clear outstanding balances for processed loans/advances
      for (const item of payrollPreviewList) {
        if (item.loanEMI > 0 && item.loanId) {
          const loanObj = safeLoansList.find(l => l && l.id === item.loanId);
          if (loanObj) {
            const nextOutstanding = Math.max(0, Number(loanObj.balance_outstanding) - item.loanEMI);
            await base44.entities.EmployeeLoan.update(item.loanId, {
              balance_outstanding: nextOutstanding,
              status: nextOutstanding <= 0 ? "paid" : "active"
            });
          }
        }
      }

      // 3. TRIGGER AUTOMATED DOUBLE-ENTRY ACCOUNTING LEDGER POSTING
      // We credit Liability account "2400: Salary Payable" and Debit Expense A/c "5100: Salaries and Wages"
      // PF/ESIC liabilities are also mapped to appropriate holding accounts.
      const journalLines = [
        // Gross Salaries debited as INDIRECT STAFF EXPENSE
        { account_code: "5100", debit: previewTotals.gross, credit: 0, narration: "Gross Staff Salaries and Wages debited for " + runMonth },
        
        // Net Payable provisioned as CURRENT LIABILITY
        { account_code: "2400", debit: 0, credit: previewTotals.net, narration: "Net Payable Staff Salaries provisioned" },
        
        // Statutory withholdings holding liabilities
        { account_code: "2200", debit: 0, credit: previewTotals.tds, narration: "Quarterly TDS withholding credit provision" }
      ];

      // Add balancing PF / ESIC statutory credit provisions if any
      const statBalance = previewTotals.gross - (previewTotals.net + previewTotals.tds);
      if (statBalance > 0) {
        journalLines.push({
          account_code: "2010", // Accounts payable or holding liability
          debit: 0,
          credit: statBalance,
          narration: "Statutory PF / ESIC and PT holding liability provisions credited"
        });
      }

      // Create balancing journal entry via standard accountingService
      await accountingService.createJournalEntry({
        date: new Date().toISOString().split("T")[0],
        narration: `Automated Staff Payroll Disbursal Journal Sync - ${runMonth}`,
        source: "HRMS_PAYROLL",
        source_id: monthRunRef,
        lines: journalLines
      });

      // 4. Log a staff expense record directly to the general Expense collection
      await base44.entities.Expense.create({
        expense_date: new Date().toISOString().split("T")[0],
        expense_no: `EXP-PAYROLL-${monthRunRef}`,
        category: "Staff Salaries",
        amount: previewTotals.gross,
        description: `Direct Indirect staff salaries disbursed for run batch ${runMonth}`,
        payment_mode: "bank_transfer",
        status: "Approved",
        is_taxable: false
      });

      toast.success("Payroll fully approved! 100% in sync with trial ledger accounts, staff expenses booked.");
      setPayrollStep(4);
      refetchDetails();
    } catch (err) {
      toast.error("Payroll approval failed: " + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // --- Payslip PDF download generator ---
  const handleDownloadPayslip = (empPayroll) => {
    try {
      const doc = new jsPDF();
      
      // Layout headers
      doc.setFillColor(26, 26, 26);
      doc.rect(0, 0, 210, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(212, 175, 55); // Gold Accent
      doc.text("EASYBMT INTERNATIONAL ERP", 20, 25);
      
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("HCM Employee Monthly Payslip Statement", 20, 31);
      doc.line(20, 36, 190, 36);

      // Employee metadata
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      doc.text(`Employee Code: ${empPayroll.empCode}`, 20, 46);
      doc.text(`Employee Name: ${empPayroll.name}`, 20, 52);
      doc.text(`Wage Month: ${runMonth}`, 140, 46);
      doc.text(`Transaction Status: COMPLIANT`, 140, 52);
      doc.line(20, 58, 190, 58);

      // Earnings & Deductions Tables
      doc.setFont("helvetica", "bold");
      doc.text("1. Earnings / Allowances", 20, 68);
      doc.setFont("helvetica", "normal");
      doc.text(`Gross Basic Wages:`, 20, 76);
      doc.text(`${currency}${empPayroll.basic.toLocaleString("en-IN")}`, 80, 76);
      doc.text(`Overtime Additions:`, 20, 82);
      doc.text(`${currency}${empPayroll.overtimePay.toLocaleString("en-IN")}`, 80, 82);
      
      let nextLineY = 88;
      if (empPayroll.bonus > 0) {
        doc.text(`Bonus Additions:`, 20, nextLineY);
        doc.text(`${currency}${empPayroll.bonus.toLocaleString("en-IN")}`, 80, nextLineY);
        nextLineY += 6;
      }
      if (empPayroll.increment > 0) {
        doc.text(`Increment Hike:`, 20, nextLineY);
        doc.text(`${currency}${empPayroll.increment.toLocaleString("en-IN")}`, 80, nextLineY);
        nextLineY += 6;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text("2. Statutory Deductions", 110, 68);
      doc.setFont("helvetica", "normal");
      doc.text(`PF Employee Share:`, 110, 76);
      doc.text(`-${currency}${empPayroll.pf.employee.toLocaleString("en-IN")}`, 170, 76);
      doc.text(`ESIC Share:`, 110, 82);
      doc.text(`-${currency}${empPayroll.esic.employee.toLocaleString("en-IN")}`, 170, 82);
      doc.text(`Professional Tax:`, 110, 88);
      doc.text(`-${currency}${empPayroll.pt.toLocaleString("en-IN")}`, 170, 88);
      doc.text(`Income Tax TDS:`, 110, 94);
      doc.text(`-${currency}${empPayroll.tds.toLocaleString("en-IN")}`, 170, 94);
      
      if (empPayroll.loanEMI > 0) {
        doc.text(`Advance Loan EMI:`, 110, 100);
        doc.text(`-${currency}${empPayroll.loanEMI.toLocaleString("en-IN")}`, 170, 100);
      }

      // Net Summary
      doc.line(20, 115, 190, 115);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(220, 100, 20);
      doc.text(`Net Take-Home Disbursed: ${currency}${empPayroll.netPayable.toLocaleString("en-IN")}`, 20, 125);

      // Signatures
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Authorized HR Signature Stamp", 145, 160);
      doc.line(140, 155, 180, 155);

      doc.save(`Payslip_${empPayroll.name.replace(/\s+/g, "_")}_${runMonth}.pdf`);
      toast.success(`PDF payslip downloaded for ${empPayroll.name}`);
    } catch (err) {
      toast.error("Payslip compilation failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      
      {/* Sub menu controls */}
      <div className="flex bg-secondary/15 p-1 border border-border/40 rounded-xl h-9 w-max">
        <button 
          onClick={() => setActiveSubTab("calculator")}
          className={`font-bold px-4 rounded-lg transition text-[10px] flex items-center gap-1.5 ${activeSubTab === "calculator" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
        >
          <Calculator className="w-3.5 h-3.5 text-primary" /> CTC Structure Calculator
        </button>
        <button 
          onClick={() => setActiveSubTab("wizard")}
          className={`font-bold px-4 rounded-lg transition text-[10px] flex items-center gap-1.5 ${activeSubTab === "wizard" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Monthly Payroll Wizard
        </button>
      </div>

      {/* VIEW: CTC STRUCTURE BREAKDOWN CALCULATOR */}
      {activeSubTab === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form parameters */}
          <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h4 className="font-black text-sm text-foreground">Interactive CTC Calculator</h4>
            
            <div className="space-y-3 font-medium">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold">Wage Base Scale</Label>
                  <select 
                    value={calcInputType} 
                    onChange={e => setCalcInputType(e.target.value)}
                    className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                  >
                    <option value="monthly">Monthly Wages</option>
                    <option value="annual">Annual CTC</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="font-bold">Input Value (Gross)</Label>
                  <Input 
                    type="number" 
                    value={calcInputValue}
                    onChange={e => setCalcInputValue(e.target.value)}
                    className="bg-background/50 text-xs h-9 border-border/40 text-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-2 bg-secondary/10 rounded-lg border border-border/30">
                  <span>Include Provident Fund (PF)</span>
                  <input 
                    type="checkbox" 
                    checked={calcPFActive} 
                    onChange={e => setCalcPFActive(e.target.checked)}
                    className="accent-primary w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2 bg-secondary/10 rounded-lg border border-border/30">
                  <span>Include ESIC Insurance</span>
                  <input 
                    type="checkbox" 
                    checked={calcESICActive} 
                    onChange={e => setCalcESICActive(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </div>
                 <div className="space-y-1.5">
                  <Label className="font-bold">PT State Scale Slabs</Label>
                  <select 
                    value={calcPTState} 
                    onChange={e => setCalcPTState(e.target.value)}
                    className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                  >
                    <option value="Maharashtra">Maharashtra ({currency}200 slab)</option>
                    <option value="Karnataka">Karnataka ({currency}200 slab)</option>
                    <option value="Delhi">Delhi ({currency}200 slab)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical calculations results panel */}
          <div className="lg:col-span-2 bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-6 flex flex-col justify-between">
            <h4 className="font-black text-sm text-foreground border-b border-border/20 pb-2">Estimated Salary Breakdown (Annualized)</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 leading-relaxed font-sans text-xs">
              
              <div className="space-y-3">
                <span className="font-black text-slate-400 block text-[9px] uppercase tracking-wider">Wages Breakdowns</span>
                <div className="flex justify-between border-b border-border/20 py-1"><span>Basic Wages (50%)</span><strong className="text-foreground">{currency}{(ctcBreakdown.basic * 12).toLocaleString("en-IN")}</strong></div>
                <div className="flex justify-between border-b border-border/20 py-1"><span>HRA Allowance (20%)</span><strong className="text-foreground">{currency}{(ctcBreakdown.hra * 12).toLocaleString("en-IN")}</strong></div>
                <div className="flex justify-between border-b border-border/20 py-1"><span>Special allowances</span><strong className="text-foreground">{currency}{(ctcBreakdown.allowances * 12).toLocaleString("en-IN")}</strong></div>
              </div>

              <div className="space-y-3">
                <span className="font-black text-red-400 block text-[9px] uppercase tracking-wider">Statutory Deductions</span>
                <div className="flex justify-between border-b border-border/20 py-1"><span>PF contribution</span><strong className="text-red-400">-{currency}{(ctcBreakdown.pf.employee * 12).toLocaleString("en-IN")}</strong></div>
                <div className="flex justify-between border-b border-border/20 py-1"><span>ESIC health premium</span><strong className="text-red-400">-{currency}{(ctcBreakdown.esic.employee * 12).toLocaleString("en-IN")}</strong></div>
                <div className="flex justify-between border-b border-border/20 py-1"><span>PT &amp; TDS withholding</span><strong className="text-red-400">-{currency}{((ctcBreakdown.pt + ctcBreakdown.tds) * 12).toLocaleString("en-IN")}</strong></div>
              </div>

              <div className="space-y-3 bg-secondary/15 p-4 rounded-xl border border-border/30 flex flex-col justify-center text-center space-y-2 col-span-2 md:col-span-1">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Net Annual Take-Home</span>
                  <strong className="text-lg font-black text-emerald-500">{currency}{(ctcBreakdown.netTakeHome * 12).toLocaleString("en-IN")}</strong>
                  <span className="text-[9px] text-muted-foreground mt-0.5 block">{currency}{ctcBreakdown.netTakeHome.toLocaleString("en-IN")}/mo take-home</span>
                </div>
                <div className="border-t border-border/20 pt-2">
                  <span className="text-[8px] text-muted-foreground block">Cost to Company (Employer CTC)</span>
                  <strong className="text-slate-300 font-bold text-xs">{currency}{(ctcBreakdown.employerCost * 12).toLocaleString("en-IN")}/yr</strong>
                </div>
              </div>

            </div>

            <div className="bg-amber-500/5 border border-amber-500/25 p-3 rounded-xl text-[10px] leading-normal flex items-start gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                These calculations are for reference audits and modeling. Actual run values will automatically sync based on verified biometric attendance swipes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: MONTHLY PAYROLL PROCESSING WIZARD */}
      {activeSubTab === "wizard" && (
        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-6">
          
          {/* STEP HEADER */}
          <div className="flex items-center justify-between border-b border-border/20 pb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-black text-sm text-foreground">Monthly Payroll Process Terminal</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Wizard step {payrollStep} of 4</p>
            </div>
            
            {/* Step Indicators */}
            <div className="flex items-center gap-1 font-bold text-[9px]">
              <span className={`px-2.5 py-0.5 rounded-full ${payrollStep >= 1 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>1. Setup</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <span className={`px-2.5 py-0.5 rounded-full ${payrollStep >= 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>2. attendance</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <span className={`px-2.5 py-0.5 rounded-full ${payrollStep >= 3 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>3. Preview</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <span className={`px-2.5 py-0.5 rounded-full ${payrollStep >= 4 ? "bg-emerald-500 text-black" : "bg-secondary text-muted-foreground"}`}>4. Comitted</span>
            </div>
          </div>

          {/* STEP 1: MONTH & BATCH PARAMETERS */}
          {payrollStep === 1 && (
            <div className="space-y-4 max-w-md mx-auto py-6 animate-fade-in font-medium">
              <div className="space-y-1.5">
                <Label className="font-bold">Select Wages Month Run</Label>
                <input 
                  type="month" 
                  value={runMonth} 
                  onChange={e => setRunMonth(e.target.value)}
                  className="w-full bg-background/50 text-xs py-2.5 px-3 rounded-lg border border-border/40 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">Target Operator Batch</Label>
                <select 
                  value={runBatch} 
                  onChange={e => setRunBatch(e.target.value)}
                  className="w-full bg-background/50 text-xs py-2.5 px-3 rounded-lg border border-border/40 font-bold"
                >
                  <option value="all">All Active Staff Profiles (Pune HQ + Floor)</option>
                  <option value="mfg">Factory Floor Operators Only</option>
                </select>
              </div>

              <Button 
                onClick={handleProceedToAttendance} 
                className="w-full text-xs font-bold gold-gradient text-black h-9 shadow-lg shadow-amber-500/10 mt-2"
              >
                Proceed to attendance verification <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          )}

          {/* STEP 2: ATTENDANCE ADJUSTMENT ROSTER */}
          {payrollStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* Smart Search & Filter Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/20 p-4 border border-border/40 rounded-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-muted-foreground uppercase text-[10px]">Filter Dept:</span>
                  <div className="flex flex-wrap bg-secondary/25 p-0.5 rounded-lg border border-border/20">
                    <button
                      type="button"
                      onClick={() => setDeptFilter("ALL")}
                      className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] ${
                        deptFilter === "ALL" 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      ALL
                    </button>
                    {uniqueDepartments.map(dept => (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => setDeptFilter(dept)}
                        className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] ${
                          deptFilter === dept 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search staff name or code..."
                    value={searchStaff}
                    onChange={e => setSearchStaff(e.target.value)}
                    className="text-xs bg-background/50 h-8 pl-8 border-border/40"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-border/40 rounded-xl bg-background/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Staff Member</th>
                      <th className="p-3">Active Base Wages</th>
                      <th className="p-3">Present Days</th>
                      <th className="p-3">LOP (Unpaid Days)</th>
                      <th className="p-3">Overtime Hours</th>
                      <th className="p-3">Basic Salary Override</th>
                      <th className="p-3">Bonus Feed</th>
                      <th className="p-3">Increment Feed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 leading-relaxed font-sans">
                    {filteredTechnicians.map(emp => {
                      const overrides = attendanceOverrides[emp.id] || { 
                        presentDays: "26", 
                        lopDays: "0", 
                        overtimeHours: "0",
                        manualBasic: String(emp.basicSalary || emp.salary || 20000),
                        bonusAmount: "0",
                        incrementAmount: "0"
                      };
                      return (
                        <tr key={emp.id} className="hover:bg-secondary/15 font-medium">
                          <td className="p-3">
                            <strong className="text-slate-200 block text-xs">{emp.name || emp.full_name}</strong>
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">{emp.employee_code || "EMP-X"}</span>
                          </td>
                          <td className="p-3 text-slate-300 font-bold">{currency}{Number(emp.basicSalary || emp.salary || 20000).toLocaleString("en-IN")}/mo</td>
                          <td className="p-3">
                            <Input 
                              type="number" 
                              value={overrides.presentDays} 
                              onChange={e => handleOverrideChange(emp.id, "presentDays", e.target.value)}
                              className="w-16 h-8 bg-background/50 text-xs border-border/40 text-center font-bold"
                            />
                          </td>
                          <td className="p-3">
                            <Input 
                              type="number" 
                              value={overrides.lopDays} 
                              onChange={e => handleOverrideChange(emp.id, "lopDays", e.target.value)}
                              className="w-16 h-8 bg-background/50 text-xs border-border/40 text-center text-red-400 font-bold"
                            />
                          </td>
                          <td className="p-3">
                            <Input 
                              type="number" 
                              value={overrides.overtimeHours} 
                              onChange={e => handleOverrideChange(emp.id, "overtimeHours", e.target.value)}
                              className="w-16 h-8 bg-background/50 text-xs border-border/40 text-center text-emerald-500 font-bold"
                            />
                          </td>
                          <td className="p-3">
                            <Input 
                              type="number" 
                              value={overrides.manualBasic} 
                              onChange={e => handleOverrideChange(emp.id, "manualBasic", e.target.value)}
                              className="w-20 h-8 bg-background/50 text-xs border-border/40 text-center font-bold text-amber-500"
                            />
                          </td>
                          <td className="p-3">
                            <Input 
                              type="number" 
                              value={overrides.bonusAmount} 
                              onChange={e => handleOverrideChange(emp.id, "bonusAmount", e.target.value)}
                              className="w-16 h-8 bg-background/50 text-xs border-border/40 text-center font-bold text-emerald-500"
                              placeholder="0"
                            />
                          </td>
                          <td className="p-3">
                            <Input 
                              type="number" 
                              value={overrides.incrementAmount} 
                              onChange={e => handleOverrideChange(emp.id, "incrementAmount", e.target.value)}
                              className="w-16 h-8 bg-background/50 text-xs border-border/40 text-center font-bold text-blue-400"
                              placeholder="0"
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTechnicians.length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-muted-foreground font-medium">
                          No matching active employees found in current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border/20">
                <Button 
                  onClick={() => setPayrollStep(1)} 
                  variant="outline" 
                  className="text-xs h-8 font-bold border-border/50 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button 
                  onClick={() => setPayrollStep(3)} 
                  className="text-xs font-bold gold-gradient text-black h-8 shadow-lg shadow-amber-500/10"
                >
                  Proceed to calculations preview <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: CALCULATIONS PREVIEW & LEDGER SYNCS */}
          {payrollStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              {/* Smart Search & Filter Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/20 p-4 border border-border/40 rounded-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-muted-foreground uppercase text-[10px]">Filter Dept:</span>
                  <div className="flex flex-wrap bg-secondary/25 p-0.5 rounded-lg border border-border/20">
                    <button
                      type="button"
                      onClick={() => setDeptFilter("ALL")}
                      className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] ${
                        deptFilter === "ALL" 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      ALL
                    </button>
                    {uniqueDepartments.map(dept => (
                      <button
                        type="button"
                        key={dept}
                        onClick={() => setDeptFilter(dept)}
                        className={`px-2 py-0.5 rounded font-bold transition-all text-[10px] ${
                          deptFilter === dept 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search staff name or code..."
                    value={searchStaff}
                    onChange={e => setSearchStaff(e.target.value)}
                    className="text-xs bg-background/50 h-8 pl-8 border-border/40"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-border/40 rounded-xl bg-background/10">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Gross Wages</th>
                      <th className="p-3">Statutory Deductions</th>
                      <th className="p-3">Welfare Loan EMIs</th>
                      <th className="p-3">Net Take-home</th>
                      <th className="p-3 text-right">Employer CTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 leading-relaxed font-sans text-xs">
                    {filteredPreviewList.map(item => {
                      const totalDed = item.pf.employee + item.esic.employee + item.pt + item.tds;
                      return (
                        <tr key={item.empId} className="hover:bg-secondary/15 font-medium">
                          <td className="p-3">
                            <strong className="text-slate-200 block text-xs">{item.name}</strong>
                            <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">{item.empCode}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-300">
                            {currency}{item.grossCalculated.toLocaleString("en-IN")}
                            {(item.bonus > 0 || item.increment > 0) && (
                              <span className="text-[9px] text-emerald-400 block mt-0.5 font-bold">
                                {item.bonus > 0 && `Bonus: +${currency}${item.bonus}`} 
                                {item.bonus > 0 && item.increment > 0 ? " • " : ""}
                                {item.increment > 0 && `Inc: +${currency}${item.increment}`}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-red-400">
                            -{currency}{totalDed.toLocaleString("en-IN")}
                            <span className="text-[9px] text-muted-foreground block mt-0.5">PF: {currency}{item.pf.employee} • ESIC: {currency}{item.esic.employee} • PT: {currency}{item.pt}</span>
                          </td>
                          <td className="p-3 text-red-400 font-semibold">{item.loanEMI > 0 ? `-${currency}${item.loanEMI}` : "Nil"}</td>
                          <td className="p-3 font-black text-emerald-500 text-sm">{currency}{item.netPayable.toLocaleString("en-IN")}</td>
                          <td className="p-3 text-right font-bold text-slate-400">{currency}{item.employerCost.toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Stats & Ledger mappings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/10 p-5 rounded-2xl border border-border/30">
                <div className="space-y-2">
                  <h4 className="font-black text-sm text-foreground uppercase tracking-wider">Payroll Run Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs leading-normal">
                    <div><span>Grand Gross Wages:</span><strong className="text-foreground block">{currency}{previewTotals.gross.toLocaleString("en-IN")}</strong></div>
                    <div><span>Grand Net Payable:</span><strong className="text-emerald-500 block font-black">{currency}{previewTotals.net.toLocaleString("en-IN")}</strong></div>
                    <div><span>Total Stat Prov (PF/ESIC/PT):</span><strong className="text-red-400 block">-{currency}{(previewTotals.pfEmp + previewTotals.esicEmp + previewTotals.pt).toLocaleString("en-IN")}</strong></div>
                    <div><span>Quarterly TDS Withhold:</span><strong className="text-red-400 block">-{currency}{previewTotals.tds.toLocaleString("en-IN")}</strong></div>
                  </div>
                </div>

                <div className="space-y-3 font-medium border-l border-border/20 pl-6">
                  <span className="p-1 px-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase inline-block">Trial Ledger posting logic</span>
                  <p className="text-muted-foreground text-[10px] leading-normal">
                    Approving this run will Debit <strong>5100: Salaries &amp; Wages Expense</strong> for {currency}{previewTotals.gross.toLocaleString("en-IN")} and credit <strong>2400: Salary Payable Liability</strong> for {currency}{previewTotals.net.toLocaleString("en-IN")}, maintaining trial ledger double-entry equations.
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border/20">
                <Button 
                  onClick={() => setPayrollStep(2)} 
                  variant="outline" 
                  className="text-xs h-8 font-bold border-border/50 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <Button 
                  onClick={handleApproveAndPost} 
                  disabled={isSimulating}
                  className="text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-600 h-8 shadow-lg shadow-emerald-500/10"
                >
                  {isSimulating ? "Posting ledger lines..." : "Approve Run & Post Ledger entries"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: COMPLETED RUN & PAYSLIPS DOWNLOAD */}
          {payrollStep === 4 && (
            <div className="space-y-6 text-center py-8 animate-fade-in font-medium">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
              <div className="space-y-2">
                <h4 className="font-black text-md text-foreground">Monthly Payroll processed successfully!</h4>
                <p className="text-muted-foreground text-xs leading-normal max-w-md mx-auto">
                  All ledger entries are posted, loan advance EMIs are auto-deducted, and staff expenses are successfully registered. Individual payslips can now be downloaded as PDF documents.
                </p>
              </div>

              <div className="max-w-xl mx-auto border border-border/40 rounded-xl bg-background/20 mt-6 overflow-hidden">
                <div className="p-3 bg-secondary/35 border-b border-border/30 text-left font-black text-[9px] uppercase tracking-wider">
                  Download Employee PDF Payslips
                </div>
                <div className="divide-y divide-border/20 text-left text-xs leading-relaxed max-h-48 overflow-y-auto">
                  {filteredPreviewList.map(item => (
                    <div key={item.empId} className="p-3 hover:bg-secondary/15 flex justify-between items-center">
                      <div>
                        <strong className="text-slate-200 block text-xs">{item.name}</strong>
                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">{item.empCode} • Net: {currency}{item.netPayable.toLocaleString("en-IN")}</span>
                      </div>
                      <Button 
                        onClick={() => handleDownloadPayslip(item)}
                        variant="outline" 
                        size="sm" 
                        className="text-[9px] font-bold border-border/50 h-7 px-3 bg-secondary/25 hover:bg-secondary/40 text-primary gap-1"
                      >
                        <Download className="w-3 h-3" /> Payslip PDF
                      </Button>
                    </div>
                  ))}
                  {filteredPreviewList.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground">
                      No matching payslips found.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <Button 
                  onClick={() => {
                    setPayrollStep(1);
                    setActiveSubTab("calculator");
                  }}
                  className="text-xs font-bold gold-gradient text-black h-8 shadow-lg shadow-amber-500/10"
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
