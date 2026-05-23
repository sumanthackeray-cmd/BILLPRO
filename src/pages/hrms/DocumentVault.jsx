import { useState, useMemo, useRef } from "react";
import { Upload, AlertTriangle, Search, Download, FileSignature, Building, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { base44 } from "@/api/base44Client";
import jsPDF from "jspdf";
import { matchesQuery, matchesSelect, makeStableKey } from "@/utils/smartFilter";

export default function DocumentVault({ 
  employees = [], 
  documentsList = [], 
  refetchDetails 
}) {
  const [activeSubTab, setActiveSubTab] = useState("letters");

  // Create guaranteed safe arrays to prevent any undefined/null pointer crashes
  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const safeDocumentsList = useMemo(() => Array.isArray(documentsList) ? documentsList : [], [documentsList]);

  // --- LETTER WRITER STATES ---
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [letterType, setLetterType] = useState("offer");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [customText, setCustomText] = useState("");
  const [salaryOffered, setSalaryOffered] = useState("35000");
  const [newDesignation, setNewDesignation] = useState("Senior Engineer");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // --- VAULT STORAGE STATES ---
  const [uploadEmpId, setUploadEmpId] = useState("");
  const [docCategory, setDocCategory] = useState("aadhaar");
  const [docName, setDocName] = useState("");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // --- SMART FILTER & SEARCH STATES FOR CATALOG ---
  const [searchVault, setSearchVault] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const filteredDocs = useMemo(() => {
    return safeDocumentsList.filter(doc => {
      if (!doc) return false;

      const emp = safeEmployees.find(e => e.id === doc.employeeId) || {};
      const empName = emp.name || emp.full_name || "";

      const matchesSearch = matchesQuery({
        query: searchVault,
        fields: [
          doc.doc_name || "",
          doc.doc_type || "",
          empName
        ]
      });

      const matchesCategory = matchesSelect({
        value: doc.doc_type,
        selected: categoryFilter,
        defaultValue: "ALL"
      });

      return matchesSearch && matchesCategory;
    });
  }, [safeDocumentsList, safeEmployees, searchVault, categoryFilter]);

  // Target Employee for letter writer
  const targetEmployee = useMemo(() => {
    return safeEmployees.find(e => e.id === selectedEmpId) || null;
  }, [safeEmployees, selectedEmpId]);

  // Letter content generator
  const letterPreview = useMemo(() => {
    const name = targetEmployee ? `${targetEmployee.first_name} ${targetEmployee.last_name}` : "[Employee Name]";
    const empCode = targetEmployee?.employee_code || "[EMP-CODE]";
    const currentDesig = targetEmployee?.designation || "Staff Associate";
    const dateFmt = new Date(issueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    
    let content = "";
    let title = "";

    switch(letterType) {
      case "offer":
        title = "LETTER OF EMPLOYMENT OFFER";
        content = `Dear ${name},\n\nWe are pleased to offer you employment with our organization. Based on our discussions, you will be appointed to the position of floor staff at our Main Plant beginning ${dateFmt}.\n\nYour monthly gross wages will be ₹${Number(salaryOffered).toLocaleString("en-IN")}. You will be on probation for a period of six months from your date of joining.\n\nPlease sign and return a copy of this letter as a token of your acceptance.\n\nWarm regards,\n\nHuman Resources Department`;
        break;
      case "relieving":
        title = "RELIEVING & EXPERIENCE CERTIFICATE";
        content = `TO WHOMSOEVER IT MAY CONCERN\n\nThis is to certify that ${name} (Employee Code: ${empCode}) was employed with us as a ${currentDesig} from ${targetEmployee?.date_of_joining || "12-January-2024"} to ${dateFmt}.\n\nDuring their tenure, we found them to be diligent, hard-working, and sincere in their responsibilities. They have been relieved of their duties in good standing.\n\nWe wish them all the success in their future endeavors.\n\nFor the Management Team`;
        break;
      case "increment":
        title = "SALARY REVISION & APPOINTMENT LETTER";
        content = `Dear ${name},\n\nWe appreciate your contribution and hard work towards the growth of our organization. In recognition of your performance during the past year, we are pleased to revise your compensation.\n\nEffective next billing month, you are promoted to the position of ${newDesignation}. Your monthly salary has been revised upward, reflecting our trust in your leadership.\n\nCongratulations and keep up the outstanding work!\n\nBest regards,\n\nExecutive Director`;
        break;
      case "warning":
        title = "STRICT ADMINISTRATIVE WARNING LETTER";
        content = `Dear ${name},\n\nThis letter serves as a formal written warning for performance lapses and shift compliance violations observed over the past few weeks.\n\nSpecifically:\n${customText || "Lapse of general duty regulations and unexcused absences."}\n\nPlease note that any repeat incidents will lead to strict disciplinary actions including termination.\n\nYours sincerely,\n\nPlant Superintendent`;
        break;
      default:
        break;
    }

    return { title, content, name, dateFmt };
  }, [targetEmployee, letterType, issueDate, salaryOffered, newDesignation, customText]);

  // Generate jsPDF printable download
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      
      // Page styling
      doc.setFillColor(26, 26, 26); // modern gold/charcoal theme accent line
      doc.rect(0, 0, 210, 8, "F");

      // Letterhead
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(212, 175, 55); // Gold color
      doc.text("EASYBMT ERP - HCM MODULE", 20, 30);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Main Corporate Plant • Sector 62 • Pune, Maharashtra", 20, 36);
      doc.line(20, 42, 190, 42); // Divider

      // Issue date & Reference ID
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`Date: ${letterPreview.dateFmt}`, 20, 52);
      doc.text(`Ref: GST/HRM/2026/${letterType.toUpperCase()}/${Math.floor(1000 + Math.random() * 9000)}`, 140, 52);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.text(letterPreview.title, 105, 68, { align: "center" });

      // Body text wrapping
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      
      const splitText = doc.splitTextToSize(letterPreview.content, 170);
      doc.text(splitText, 20, 82);

      // Footer Signatures
      doc.line(20, 250, 190, 250);
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("System generated document, verified by HR Department", 105, 258, { align: "center" });

      doc.save(`${letterType}_letter_${letterPreview.name.replace(/\s+/g, "_")}.pdf`);
      toast.success("Letter downloaded as premium printable PDF document!");
    } catch (err) {
      toast.error("PDF generation failed: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // DL/Passport expiration analytics
  const alertDocuments = useMemo(() => {
    const alerts = [];
    safeEmployees.forEach(emp => {
      const today = new Date();
      if (emp.passport_expiry) {
        const pExp = new Date(emp.passport_expiry);
        const diff = (pExp - today) / (1000 * 60 * 60 * 24);
        if (diff <= 90 && diff > 0) {
          alerts.push({ empName: emp.name || emp.full_name, doc: "Passport", expiry: emp.passport_expiry, daysLeft: Math.round(diff) });
        }
      }
      if (emp.dl_expiry) {
        const dExp = new Date(emp.dl_expiry);
        const diff = (dExp - today) / (1000 * 60 * 60 * 24);
        if (diff <= 90 && diff > 0) {
          alerts.push({ empName: emp.name || emp.full_name, doc: "Driving License", expiry: emp.dl_expiry, daysLeft: Math.round(diff) });
        }
      }
    });
    return alerts;
  }, [safeEmployees]);

  // Handle file select
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileToUpload(file);
      setDocName(file.name);
    }
  };

  // Upload file via base44 integration API
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!uploadEmpId || !fileToUpload || !docName) {
      return toast.error("Please fill in all upload parameters.");
    }

    setIsUploading(true);
    try {
      // 1. Upload file to Firebase storage via base44 client helper
      const res = await base44.integrations.Core.UploadFile({ file: fileToUpload });
      
      if (res.file_url) {
        // 2. Create index details in EmployeeDocuments collection
        await base44.entities.EmployeeDocument.create({
          employeeId: uploadEmpId,
          doc_type: docCategory,
          doc_name: docName,
          file_url: res.file_url,
          uploaded_at: new Date().toISOString()
        });

        toast.success("Document uploaded successfully to secured file vault!");
        setFileToUpload(null);
        setDocName("");
        setUploadEmpId("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        refetchDetails();
      }
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      
      {/* Sub tabs navigation */}
      <div className="flex items-center justify-between border-b border-border/20 pb-3 flex-wrap gap-2">
        <div className="flex bg-secondary/15 p-1 border border-border/40 rounded-xl h-9">
          <button 
            onClick={() => setActiveSubTab("letters")}
            className={`font-bold px-4 rounded-lg transition text-[10px] flex items-center gap-1.5 ${activeSubTab === "letters" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            <FileSignature className="w-3.5 h-3.5 text-primary" /> Letter Template Engine
          </button>
          <button 
            onClick={() => setActiveSubTab("upload")}
            className={`font-bold px-4 rounded-lg transition text-[10px] flex items-center gap-1.5 ${activeSubTab === "upload" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-500" /> Digital File Vault
          </button>
        </div>

        {alertDocuments.length > 0 && (
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 py-1 px-3 rounded-full font-black text-[9px] flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> {alertDocuments.length} Upcoming Expirations Pending
          </span>
        )}
      </div>

      {/* VIEW: LETTER WRITER ENGINE */}
      {activeSubTab === "letters" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Controls Form */}
          <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h4 className="font-black text-sm text-foreground">Variable parameters configuration</h4>
            
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="font-bold">Select Employee</Label>
                <select 
                  value={selectedEmpId} 
                  onChange={e => setSelectedEmpId(e.target.value)}
                  className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                >
                  <option value="">-- Choose Target Employee --</option>
                  {safeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name || emp.full_name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-bold">Document Type</Label>
                  <select 
                    value={letterType} 
                    onChange={e => setLetterType(e.target.value)}
                    className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                  >
                    <option value="offer">Offer Letter</option>
                    <option value="relieving">Relieving Letter</option>
                    <option value="increment">Increment Letter</option>
                    <option value="warning">Warning Notice</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">Effective Date</Label>
                  <Input 
                    type="date" 
                    value={issueDate} 
                    onChange={e => setIssueDate(e.target.value)}
                    className="bg-background/50 text-xs h-9 border-border/40"
                  />
                </div>
              </div>

              {/* Conditional Options */}
              {letterType === "offer" && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label className="font-bold">Proposed Monthly Salary (Gross)</Label>
                  <Input 
                    type="number" 
                    value={salaryOffered}
                    onChange={e => setSalaryOffered(e.target.value)}
                    className="bg-background/50 text-xs h-9 border-border/40 font-bold text-emerald-500"
                  />
                </div>
              )}

              {letterType === "increment" && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label className="font-bold">New Designation / Appointment</Label>
                  <Input 
                    value={newDesignation}
                    onChange={e => setNewDesignation(e.target.value)}
                    className="bg-background/50 text-xs h-9 border-border/40 font-bold text-primary"
                  />
                </div>
              )}

              {letterType === "warning" && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label className="font-bold">Specify Performance Violation / Infractions</Label>
                  <textarea 
                    value={customText} 
                    onChange={e => setCustomText(e.target.value)}
                    placeholder="E.g. Repeated biometric check-in anomalies and late arrival at CNC milling floor zone."
                    rows={4}
                    className="w-full bg-background/50 text-xs p-2.5 rounded-lg border border-border/40 focus:border-primary/50 outline-none"
                  />
                </div>
              )}

              <Button 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf || !selectedEmpId}
                className="w-full text-xs font-bold gold-gradient text-black h-9 mt-4 shadow-lg shadow-amber-500/10"
              >
                <Download className="w-4 h-4 mr-1.5" /> Download Professional PDF Letter
              </Button>
            </div>
          </div>

          {/* Letter Real-time Page Preview Sheet */}
          <div className="bg-card/30 border border-border/50 rounded-2xl p-6 backdrop-blur-md relative font-serif shadow-xl flex flex-col justify-between min-h-[480px]">
            <div className="space-y-6">
              
              {/* Header Letterhead */}
              <div className="border-b border-border/20 pb-4 text-center md:text-left space-y-1">
                <span className="font-sans font-black tracking-wider text-xs text-amber-500 flex items-center gap-1.5 justify-center md:justify-start">
                  <Building className="w-4 h-4" /> EASYBMT SYSTEM INTEGRATION
                </span>
                <span className="font-sans text-[10px] text-muted-foreground block">Enterprise HCM Corporate Letterhead Layout</span>
              </div>

              {/* Title */}
              <h5 className="font-bold text-center text-sm tracking-wide text-foreground border-b border-border/10 pb-2 uppercase">
                {letterPreview.title}
              </h5>

              {/* Body */}
              <div className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-line font-medium px-2">
                {letterPreview.content}
              </div>

            </div>

            {/* Footer stamp */}
            <div className="border-t border-border/20 pt-4 flex items-center justify-between text-[9px] font-sans text-muted-foreground">
              <span>Date processed: {letterPreview.dateFmt}</span>
              <span className="font-mono text-emerald-500 font-bold flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> SIGNED &amp; COMPLIANT</span>
            </div>

          </div>

        </div>
      )}

      {/* VIEW: VAULT UPLOADER & ALERTS */}
      {activeSubTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Uploader Form */}
          <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h4 className="font-black text-sm text-foreground">Upload scanned documents</h4>
            
            <form onSubmit={handleUploadDocument} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="font-bold">Assign Employee Owner</Label>
                <select 
                  value={uploadEmpId} 
                  onChange={e => setUploadEmpId(e.target.value)}
                  className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {safeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name || emp.full_name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">Document Classification</Label>
                <select 
                  value={docCategory} 
                  onChange={e => setDocCategory(e.target.value)}
                  className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                >
                  <option value="aadhaar">Aadhaar Card (UIDAI)</option>
                  <option value="pan">PAN Card Tax ID</option>
                  <option value="passport">Passport ID Booklet</option>
                  <option value="driving_license">Driving License</option>
                  <option value="experience_letter">Experience Certificate</option>
                  <option value="other">Other Identity Docs</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">Document Name (Short Memo)</Label>
                <Input 
                  value={docName} 
                  onChange={e => setDocName(e.target.value)}
                  placeholder="E.g. Passport Booklet Copy"
                  className="bg-background/50 text-xs h-9 border-border/40"
                  required
                />
              </div>

              <div className="space-y-2 pt-1.5">
                <Label className="font-bold">Select File from Device</Label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[11px] file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={isUploading}
                className="w-full text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-600 h-9 mt-4 shadow-lg shadow-emerald-500/10"
              >
                {isUploading ? "Uploading Securely..." : "Submit File to Vault"}
              </Button>
            </form>
          </div>

          {/* Expiration Tracking & Vault Roster */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Expiry alerts card */}
            {alertDocuments.length > 0 && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
                <h4 className="font-black text-xs text-amber-500 flex items-center gap-1.5"><AlertTriangle className="w-4.5 h-4.5" /> High-Risk Document Expirations (90-Day Window)</h4>
                
                <div className="space-y-2">
                  {alertDocuments.map((item, index) => (
                    <div key={index} className="flex justify-between bg-background/30 p-2.5 rounded-lg border border-border/30 font-medium items-center">
                      <div>
                        <strong className="text-slate-200 block text-xs">{item.empName}</strong>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">{item.doc} • Expiry: {item.expiry}</span>
                      </div>
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 py-0.5 px-2.5 rounded text-[9px] font-black">{item.daysLeft} Days Left</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General Files Vault list */}
            <div className="bg-card/40 border border-border/50 rounded-2xl p-5 backdrop-blur-md space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/20 pb-3 gap-3">
                <h4 className="font-black text-sm text-foreground">Active Vault Files Vault Catalog</h4>
                
                {/* Search box overlay inline */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search file name or staff..."
                    value={searchVault}
                    onChange={e => setSearchVault(e.target.value)}
                    className="text-xs bg-background/50 h-8 pl-8 border-border/40"
                  />
                </div>
              </div>

              {/* Smart Filters pills */}
              <div className="flex flex-wrap items-center gap-3 text-[10px]">
                <span className="font-extrabold text-muted-foreground uppercase">Category:</span>
                <div className="flex bg-secondary/25 p-0.5 rounded-lg border border-border/20 flex-wrap">
                  {["ALL", "aadhaar", "pan", "passport", "driving_license", "experience_letter", "other"].map(cat => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded font-bold transition-all ${
                        categoryFilter === cat 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat === "ALL" ? "ALL" : cat === "aadhaar" ? "Aadhaar" : cat === "pan" ? "PAN" : cat === "passport" ? "Passport" : cat === "driving_license" ? "DL" : cat === "experience_letter" ? "Experience" : "Other"}
                    </button>
                  ))}
                </div>
                <div className="ml-auto text-[9px] text-muted-foreground">
                  Showing <strong className="text-foreground">{filteredDocs.length}</strong> of {safeDocumentsList.length} files
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/35 border-b border-border/30 text-muted-foreground font-black text-[9px] uppercase tracking-wider">
                      <th className="p-3">Category</th>
                      <th className="p-3">File Name &amp; Staff</th>
                      <th className="p-3">Date Uploaded</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 leading-relaxed font-sans">
                    {filteredDocs.map((doc, i) => {
                      const emp = safeEmployees.find(e => e.id === doc.employeeId) || {};
                      const empName = emp.name || emp.full_name || "Unassigned";
                      return (
                        <tr key={makeStableKey(doc.id, i)} className="hover:bg-secondary/15 font-medium">
                          <td className="p-3 capitalize font-bold text-primary">{doc.doc_type}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-200">{doc.doc_name}</div>
                            <div className="text-[9px] text-muted-foreground font-mono mt-0.5">{empName}</div>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono">{doc.uploaded_at ? doc.uploaded_at.split("T")[0] : "2026-05-20"}</td>
                          <td className="p-3 text-right">
                            <a 
                              href={doc.file_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="bg-primary/10 border border-primary/20 text-primary py-0.5 px-2.5 rounded font-black text-[9px] hover:bg-primary/20 transition"
                            >
                              Download
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredDocs.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-muted-foreground font-medium">
                          No matching identity documents found in vault catalog.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
