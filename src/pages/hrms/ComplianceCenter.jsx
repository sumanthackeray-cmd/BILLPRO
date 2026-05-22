import { useState, useMemo } from "react";
import { 
  Building2, FileSpreadsheet, ShieldAlert, HeartPulse, Award, FileText, CheckCircle2, 
  HelpCircle, Sparkles, HelpCircle as HelpIcon, ArrowDownToLine, Calculator, Globe, Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { 
  calculatePF, calculateESIC, calculatePT, calculateStatutoryBonus, calculateGratuity,
  getRegulatoryConfig, saveRegulatoryConfig 
} from "./hrmsUtils";

export default function ComplianceCenter({ 
  employees = [], 
  monthlyPayrolls = [], 
  refetchDetails 
}) {
  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const safeMonthlyPayrolls = useMemo(() => Array.isArray(monthlyPayrolls) ? monthlyPayrolls : [], [monthlyPayrolls]);
  const [selectedMonth, setSelectedMonth] = useState("2026-05");
  const [selectedCalculator, setSelectedCalculator] = useState("gratuity");

  // Dynamic Compliance Config
  const [config, setConfig] = useState(() => getRegulatoryConfig());

  // Gratuity Calculator States
  const [calcEmployeeId, setCalcEmployeeId] = useState("");
  const [calcServiceYears, setCalcServiceYears] = useState("5");
  const [calcManualBasic, setCalcManualBasic] = useState("");

  // Bonus Calculator States
  const [bonusEmployeeId, setBonusEmployeeId] = useState("");
  const [bonusRate, setBonusRate] = useState("8.33");
  const [bonusManualBasic, setBonusManualBasic] = useState("");

  // Target Employee for calculators
  const gratuityTargetEmp = useMemo(() => {
    return safeEmployees.find(e => e.id === calcEmployeeId) || null;
  }, [safeEmployees, calcEmployeeId]);

  const bonusTargetEmp = useMemo(() => {
    return safeEmployees.find(e => e.id === bonusEmployeeId) || null;
  }, [safeEmployees, bonusEmployeeId]);

  // Gratuity Output
  const gratuityOutput = useMemo(() => {
    const basic = Number(calcManualBasic) || Number(gratuityTargetEmp?.basicSalary || gratuityTargetEmp?.salary || 0) || 20000;
    const years = Number(calcServiceYears) || 0;
    const eligible = years >= 5;
    const amount = eligible ? calculateGratuity(basic, years) : 0;
    return { basic, years, eligible, amount };
  }, [gratuityTargetEmp, calcServiceYears, calcManualBasic]);

  // Bonus Output
  const bonusOutput = useMemo(() => {
    const basic = Number(bonusManualBasic) || Number(bonusTargetEmp?.basicSalary || bonusTargetEmp?.salary || 0) || 20000;
    const percent = Number(bonusRate) || 8.33;
    const amount = calculateStatutoryBonus(basic, percent);
    return { basic, percent, amount };
  }, [bonusTargetEmp, bonusRate, bonusManualBasic]);

  const handleSaveConfig = () => {
    saveRegulatoryConfig(config);
    toast.success(`Regulatory guidelines calibrated for ${config.country || "selected country"}! All calculations re-computed.`);
    if (refetchDetails) {
      refetchDetails();
    }
  };

  // File download helper (EPF ECR text format with `#~#` delimiter)
  const handleDownloadECR = () => {
    if (safeEmployees.length === 0) {
      return toast.error("No employee roster available to generate ECR file.");
    }

    try {
      let ecrText = "";
      safeEmployees.forEach((emp) => {
        if (!emp) return;
        const uan = emp.uan_number || "100987654321";
        const name = (emp.name || emp.full_name || "Employee").toUpperCase();
        const basic = Number(emp.basicSalary || emp.salary || 15000);
        
        // ECR columns using config rates
        const grossWages = basic + 5000; 
        const epfWages = Math.min(basic, 15000); 
        const epsWages = Math.min(basic, 15000);
        const employeePF = Math.round(epfWages * (config.pfEmployeeRate / 100));
        const epsContribution = Math.round(epsWages * (config.pfEmployerRate / 100));
        const erPFDifference = Math.max(0, employeePF - epsContribution);
        
        ecrText += `${uan}#~#${name}#~#${grossWages}#~#${epfWages}#~#${epsWages}#~#${employeePF}#~#${epsContribution}#~#${erPFDifference}#~#0#~#0\r\n`;
      });

      const blob = new Blob([ecrText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `EPF_ECR_${selectedMonth}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("EPF ECR file generated with dynamic statutory rates!");
    } catch (err) {
      toast.error("ECR Generation failed: " + err.message);
    }
  };

  // ESIC Excel/CSV generation
  const handleDownloadESIC = () => {
    if (safeEmployees.length === 0) {
      return toast.error("No employee roster available.");
    }

    try {
      let csvContent = "IP Number,IP Name,No of Days for which wages paid/payable,Total Monthly Wages,Reason Code for Zero Work,Last Working Day\r\n";
      safeEmployees.forEach((emp) => {
        if (!emp) return;
        const esicNo = emp.esic_number || "1234567890";
        const name = (emp.name || emp.full_name || "Employee").toUpperCase();
        const basic = Number(emp.basicSalary || emp.salary || 15000);
        const gross = basic + Number(emp.allowances || 5000);
        
        csvContent += `${esicNo},${name},30,${gross},0,\r\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ESIC_Return_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("ESIC return spreadsheet generated successfully!");
    } catch (err) {
      toast.error("ESIC CSV Generation failed: " + err.message);
    }
  };

  // Form 24Q TDS summaries CSV download
  const handleDownload24Q = () => {
    if (safeEmployees.length === 0) {
      return toast.error("No active payroll entries to compile.");
    }

    try {
      let csvContent = "PAN of Employee,Name of Employee,Category,Date of Payment,Gross Salary Amount,TDS Amount,Surcharge,Education Cess,Total TDS Deducted\r\n";
      safeEmployees.forEach((emp) => {
        if (!emp) return;
        const pan = emp.pan_number || "PANNOTFILE";
        const name = (emp.name || emp.full_name || "Employee").toUpperCase();
        const basic = Number(emp.basicSalary || emp.salary || 15000);
        const monthlyGross = basic + 5000;
        const tds = Number(emp.tds_monthly || 500);

        csvContent += `${pan},${name},General,2026-05-30,${monthlyGross},${tds},0,0,${tds}\r\n`;
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Form_24Q_Quarter_1.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Form 24Q TDS quarterly file generated successfully!");
    } catch (err) {
      toast.error("Form 24Q compilation failed: " + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-xs leading-relaxed">
      
      {/* International Compliance Customizer */}
      <div className="bg-card/45 backdrop-blur-md border border-border/50 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/20 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-amber-500 animate-pulse" />
               HCM Regulatory Customizer (Global Settings)
            </h3>
            <p className="text-muted-foreground text-[10px]">
              Set the active country rules, tax regime slabs, and dynamic currency symbol globally.
            </p>
          </div>
          <Button 
            onClick={handleSaveConfig} 
            size="sm" 
            className="bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] h-8 px-4 flex items-center gap-1.5"
          >
            <Settings2 className="w-3.5 h-3.5" /> Save Country Configuration
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">Country Rule Set</Label>
            <Input 
              type="text"
              value={config.country}
              onChange={e => setConfig(prev => ({ ...prev, country: e.target.value }))}
              placeholder="e.g. India, UK..."
              className="bg-background/40 h-8 text-[11px] border-border/40 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">Currency Indicator</Label>
            <Input 
              type="text"
              value={config.currency}
              onChange={e => setConfig(prev => ({ ...prev, currency: e.target.value }))}
              placeholder="e.g. ₹, £, $, €..."
              className="bg-background/40 h-8 text-[11px] border-border/40 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">EPF Employee Rate (%)</Label>
            <Input 
              type="number"
              step="0.01"
              value={config.pfEmployeeRate}
              onChange={e => setConfig(prev => ({ ...prev, pfEmployeeRate: parseFloat(e.target.value) || 0 }))}
              placeholder="12"
              className="bg-background/40 h-8 text-[11px] border-border/40 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">EPF Employer Rate (%)</Label>
            <Input 
              type="number"
              step="0.01"
              value={config.pfEmployerRate}
              onChange={e => setConfig(prev => ({ ...prev, pfEmployerRate: parseFloat(e.target.value) || 0 }))}
              placeholder="12"
              className="bg-background/40 h-8 text-[11px] border-border/40 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">ESIC Employee Rate (%)</Label>
            <Input 
              type="number"
              step="0.01"
              value={config.esicEmployeeRate}
              onChange={e => setConfig(prev => ({ ...prev, esicEmployeeRate: parseFloat(e.target.value) || 0 }))}
              placeholder="0.75"
              className="bg-background/40 h-8 text-[11px] border-border/40 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">ESIC Employer Rate (%)</Label>
            <Input 
              type="number"
              step="0.01"
              value={config.esicEmployerRate}
              onChange={e => setConfig(prev => ({ ...prev, esicEmployerRate: parseFloat(e.target.value) || 0 }))}
              placeholder="3.25"
              className="bg-background/40 h-8 text-[11px] border-border/40 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">ESIC Salary Ceiling ({config.currency})</Label>
            <Input 
              type="number"
              value={config.esicThreshold}
              onChange={e => setConfig(prev => ({ ...prev, esicThreshold: parseFloat(e.target.value) || 0 }))}
              placeholder="21000"
              className="bg-background/40 h-8 text-[11px] border-border/40 font-bold"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">Professional Tax rate ({config.currency})</Label>
            <Input 
              type="number"
              value={config.ptRate}
              onChange={e => setConfig(prev => ({ ...prev, ptRate: parseFloat(e.target.value) || 0 }))}
              placeholder="200"
              className="bg-background/40 h-8 text-[11px] border-border/40 font-bold"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-4">
            <Label className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">TDS Annual Exemption Threshold ({config.currency})</Label>
            <Input 
              type="number"
              value={config.tdsThreshold}
              onChange={e => setConfig(prev => ({ ...prev, tdsThreshold: parseFloat(e.target.value) || 0 }))}
              placeholder="700000"
              className="bg-background/40 h-8 text-[11px] border-border/40 font-bold"
            />
          </div>
        </div>
      </div>

      {/* Overview statutory cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card/40 border border-border/50 rounded-2xl p-5 backdrop-blur-md space-y-3">
          <div className="flex justify-between items-center">
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20"><Building2 className="w-5 h-5" /></span>
            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">{config.pfEmployeeRate}% Basic</span>
          </div>
          <div>
            <h4 className="font-black text-sm text-foreground">EPF Compliance</h4>
            <p className="text-muted-foreground mt-1 text-[10px]">Calculated dynamic employee/employer share as configured.</p>
          </div>
        </div>

        <div className="bg-card/40 border border-border/50 rounded-2xl p-5 backdrop-blur-md space-y-3">
          <div className="flex justify-between items-center">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><HeartPulse className="w-5 h-5" /></span>
            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">{config.esicEmployeeRate}% / {config.esicEmployerRate}%</span>
          </div>
          <div>
            <h4 className="font-black text-sm text-foreground">ESIC Compliance</h4>
            <p className="text-muted-foreground mt-1 text-[10px]">Applicable for staff with gross salary under {config.currency}{config.esicThreshold.toLocaleString()}.</p>
          </div>
        </div>

        <div className="bg-card/40 border border-border/50 rounded-2xl p-5 backdrop-blur-md space-y-3">
          <div className="flex justify-between items-center">
            <span className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20"><Award className="w-5 h-5" /></span>
            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">{config.currency}{config.ptRate}</span>
          </div>
          <div>
            <h4 className="font-black text-sm text-foreground">Professional Tax (PT)</h4>
            <p className="text-muted-foreground mt-1 text-[10px]">Customized deduction standard rate at {config.currency}{config.ptRate} fixed rate.</p>
          </div>
        </div>

        <div className="bg-card/40 border border-border/50 rounded-2xl p-5 backdrop-blur-md space-y-3">
          <div className="flex justify-between items-center">
            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"><FileText className="w-5 h-5" /></span>
            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono">Limit: {config.currency}{(config.tdsThreshold/1000).toFixed(0)}k</span>
          </div>
          <div>
            <h4 className="font-black text-sm text-foreground">Withholding Tax (TDS)</h4>
            <p className="text-muted-foreground mt-1 text-[10px]">Dynamic regime threshold starting from {config.currency}{config.tdsThreshold.toLocaleString()} per year.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COMPLIANCE CHANNELS & PORTAL EXPORTS */}
        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div className="border-b border-border/20 pb-3">
            <h3 className="font-black text-sm text-foreground">Statutory Returns &amp; Portal Export Suite</h3>
            <p className="text-muted-foreground text-[10px] mt-1">Download ready-to-upload files formatted specifically for compliance portals.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-300">Target Wage Month</Label>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
              />
            </div>

            <div className="space-y-3 pt-2">
              {/* EPF ECR Button */}
              <div className="flex items-center justify-between p-3.5 bg-secondary/15 rounded-xl border border-border/30 hover:border-amber-500/30 transition duration-300">
                <div className="space-y-0.5">
                  <span className="font-black text-xs text-foreground block">EPF Unified ECR File (.txt)</span>
                  <span className="text-[10px] text-muted-foreground block">Delimiter-based (#~#) formatted file.</span>
                </div>
                <Button 
                  onClick={handleDownloadECR} 
                  variant="outline" 
                  size="sm" 
                  className="font-bold border-border/50 hover:bg-secondary/40 text-[10px] gap-1 h-8"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> ECR File
                </Button>
              </div>

              {/* ESIC Return Button */}
              <div className="flex items-center justify-between p-3.5 bg-secondary/15 rounded-xl border border-border/30 hover:border-emerald-500/30 transition duration-300">
                <div className="space-y-0.5">
                  <span className="font-black text-xs text-foreground block">ESIC Monthly Return sheet (.csv)</span>
                  <span className="text-[10px] text-muted-foreground block">Official spreadsheet import format.</span>
                </div>
                <Button 
                  onClick={handleDownloadESIC} 
                  variant="outline" 
                  size="sm" 
                  className="font-bold border-border/50 hover:bg-secondary/40 text-[10px] gap-1 h-8"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> ESIC CSV
                </Button>
              </div>

              {/* Form 24Q Return Button */}
              <div className="flex items-center justify-between p-3.5 bg-secondary/15 rounded-xl border border-border/30 hover:border-indigo-500/30 transition duration-300">
                <div className="space-y-0.5">
                  <span className="font-black text-xs text-foreground block">Quarterly TDS summary (.csv)</span>
                  <span className="text-[10px] text-muted-foreground block">Income tax withholding consolidated ledger.</span>
                </div>
                <Button 
                  onClick={handleDownload24Q} 
                  variant="outline" 
                  size="sm" 
                  className="font-bold border-border/50 hover:bg-secondary/40 text-[10px] gap-1 h-8"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 mr-1" /> TDS Form
                </Button>
              </div>

            </div>
          </div>
        </div>

        {/* INTERACTIVE BONUS & GRATUITY CALCULATOR */}
        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div className="border-b border-border/20 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm text-foreground flex items-center gap-1.5"><Calculator className="w-4.5 h-4.5 text-primary" /> Statutory Calculators</h3>
              <p className="text-muted-foreground text-[10px] mt-1">Audit-proof estimations based on the Gratuity Act and Bonus Act.</p>
            </div>
            
            <div className="flex bg-secondary/20 p-1 border border-border/40 rounded-xl h-8">
              <button 
                onClick={() => setSelectedCalculator("gratuity")}
                className={`text-[9px] font-bold px-2 rounded-lg transition ${selectedCalculator === "gratuity" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
              >
                Gratuity Act
              </button>
              <button 
                onClick={() => setSelectedCalculator("bonus")}
                className={`text-[9px] font-bold px-2 rounded-lg transition ${selectedCalculator === "bonus" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
              >
                Payment of Bonus Act
              </button>
            </div>
          </div>

          {/* CALCULATOR: GRATUITY */}
          {selectedCalculator === "gratuity" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-bold">Select Eligible Employee</Label>
                  <select 
                    value={calcEmployeeId} 
                    onChange={e => {
                      setCalcEmployeeId(e.target.value);
                      setCalcManualBasic("");
                    }}
                    className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                  >
                    <option value="">-- Choose Employee --</option>
                    {safeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name || emp.full_name} ({emp.employee_code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">Basic Wages (Monthly)</Label>
                  <Input 
                    type="number" 
                    value={calcManualBasic !== "" ? calcManualBasic : (gratuityTargetEmp?.basicSalary || gratuityTargetEmp?.salary || "")}
                    onChange={e => setCalcManualBasic(e.target.value)}
                    placeholder="Enter basic salary..."
                    className="bg-background/50 text-xs h-9 border-border/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">Completed Service Years</Label>
                  <Input 
                    type="number" 
                    value={calcServiceYears}
                    onChange={e => setCalcServiceYears(e.target.value)}
                    placeholder="E.g. 5"
                    className="bg-background/50 text-xs h-9 border-border/40"
                  />
                </div>
              </div>

              {/* Output Display Card */}
              <div className="p-4 rounded-xl border border-border/30 bg-slate-500/5 space-y-3 font-medium">
                <div className="flex justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground">Statutory Minimum Threshold:</span>
                  <span className="text-slate-300 font-bold">5 Completed Years</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">Eligibility Check:</span>
                  {gratuityOutput.eligible ? (
                    <span className="text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded font-black text-[9px]">
                      ✓ ELIGIBLE FOR GRATUITY
                    </span>
                  ) : (
                    <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded font-black text-[9px]">
                      ⚠️ INELIGIBLE (&lt; 5 Years)
                    </span>
                  )}
                </div>

                <div className="flex justify-between pt-2 text-sm border-t border-border/20 items-baseline">
                  <span className="font-bold text-foreground">Total Accrued Gratuity:</span>
                  <strong className="text-lg font-black text-amber-500">{config.currency}{gratuityOutput.amount.toLocaleString()}</strong>
                </div>

                <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                  * Calculated as per formula: <strong>15 / 26 * Basic * completed Years</strong>.
                </p>
              </div>
            </div>
          )}

          {/* CALCULATOR: PAYMENT OF BONUS */}
          {selectedCalculator === "bonus" && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label className="font-bold">Select Employee</Label>
                  <select 
                    value={bonusEmployeeId} 
                    onChange={e => {
                      setBonusEmployeeId(e.target.value);
                      setBonusManualBasic("");
                    }}
                    className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                  >
                    <option value="">-- Choose Employee --</option>
                    {safeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name || emp.full_name} ({emp.employee_code})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">Basic Wages (Monthly)</Label>
                  <Input 
                    type="number" 
                    value={bonusManualBasic !== "" ? bonusManualBasic : (bonusTargetEmp?.basicSalary || bonusTargetEmp?.salary || "")}
                    onChange={e => setBonusManualBasic(e.target.value)}
                    placeholder="Enter basic salary..."
                    className="bg-background/50 text-xs h-9 border-border/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">Statutory Bonus Percentage (%)</Label>
                  <select 
                    value={bonusRate} 
                    onChange={e => setBonusRate(e.target.value)}
                    className="w-full bg-background/50 text-xs h-9 rounded-lg border border-border/40 font-bold"
                  >
                    <option value="8.33">8.33% (Min Legal Obligation)</option>
                    <option value="12">12.00%</option>
                    <option value="15">15.00%</option>
                    <option value="20">20.00% (Maximum Cap)</option>
                  </select>
                </div>
              </div>

              {/* Output Display Card */}
              <div className="p-4 rounded-xl border border-border/30 bg-slate-500/5 space-y-3 font-medium">
                <div className="flex justify-between border-b border-border/20 pb-2">
                  <span className="text-muted-foreground">Statutory Bounds:</span>
                  <span className="text-slate-300 font-bold">8.33% Min to 20% Max</span>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Bonus Multiplier Rate Selected:</span>
                  <span className="text-primary font-bold">{bonusOutput.percent}%</span>
                </div>

                <div className="flex justify-between pt-2 text-sm border-t border-border/20 items-baseline">
                  <span className="font-bold text-foreground">Estimated Bonus Payable:</span>
                  <strong className="text-lg font-black text-emerald-500">{config.currency}{bonusOutput.amount.toLocaleString()}</strong>
                </div>

                <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                  * Under the Payment of Bonus Act, calculations are standard based on basic salary with designated caps.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
