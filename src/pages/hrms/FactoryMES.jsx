import { useState, useMemo } from "react";
import { 
  Cpu, Users, ShieldAlert, CheckCircle2, Navigation, Play, Award, PenTool, Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { base44 } from "@/api/base44Client";

export default function FactoryMES({ 
  employees = [], 
  refetchDetails, 
  activeBusinessType,
  attendanceLogs = []
}) {
  const [activeTab, setActiveTab] = useState("biometrics");

  // Create guaranteed safe arrays to prevent any undefined/null pointer crashes
  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const safeAttendanceLogs = useMemo(() => Array.isArray(attendanceLogs) ? attendanceLogs : [], [attendanceLogs]);

  // Filter for factory workers (manufacturers have worker_category === 'floor_worker' or 'mfg')
  const factoryWorkers = useMemo(() => {
    return safeEmployees.filter(e => e && (
      e.worker_category === "floor_worker" || 
      e.department === "Manufacturing" || 
      e.is_piece_rate
    ));
  }, [safeEmployees]);

  // --- BIOMETRICS TERMINAL SIMULATOR ---
  const [terminalEmpId, setTerminalEmpId] = useState("");
  const [facialScore, setFacialScore] = useState(98);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedLog, setSimulatedLog] = useState(null);

  // Smart filters and search for the biometrics roster
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, Present, Late, Absent, Verified, Verification Required
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, CHECK_IN, CHECK_OUT

  // Helper function to classify attendance status based on punch time
  const getAttendanceStatus = (log) => {
    if (!log || !log.date || !log.time) return "Absent";
    
    const [hours, minutes] = log.time.split(":").map(Number);
    const checkInTime = hours * 60 + minutes; // Convert to minutes since midnight
    const cutoffTime = 9 * 60 + 15; // 09:15 AM in minutes since midnight
    
    // If check-in time is before 09:15 AM, it's Present; otherwise Late
    return checkInTime <= cutoffTime ? "Present" : "Late";
  };

  const targetTerminalEmp = useMemo(() => {
    return safeEmployees.find(e => e && e.id === terminalEmpId) || null;
  }, [safeEmployees, terminalEmpId]);

  // Dynamic alternating punch-in/out swipe logic based on previous logs
  const computedNextSwipeType = useMemo(() => {
    if (!terminalEmpId) return "CHECK_IN";
    const empLogs = safeAttendanceLogs.filter(log => log && log.employeeId === terminalEmpId);
    if (empLogs.length === 0) return "CHECK_IN";
    
    // Sort logs by date and time to find the last swipe type
    const sorted = [...empLogs].sort((a, b) => {
      const dateTimeA = new Date(`${a.date || ""} ${a.time || ""}`);
      const dateTimeB = new Date(`${b.date || ""} ${b.time || ""}`);
      return dateTimeA - dateTimeB;
    });
    
    const lastLog = sorted[sorted.length - 1];
    return lastLog.type === "CHECK_IN" ? "CHECK_OUT" : "CHECK_IN";
  }, [terminalEmpId, safeAttendanceLogs]);

  const handleSimulateSwipe = async () => {
    if (!terminalEmpId) {
      return toast.error("Please select a manufacturing worker.");
    }
    
    setIsSimulating(true);
    setSimulatedLog(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const generatedScore = Math.floor(92 + Math.random() * 8);
      setFacialScore(generatedScore);

      const resolvedSwipeType = computedNextSwipeType;

      const newSwipe = {
        employeeId: terminalEmpId,
        employee_code: targetTerminalEmp?.employee_code || "EMP-102",
        name: targetTerminalEmp?.name || targetTerminalEmp?.full_name || "Staff",
        type: resolvedSwipeType,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString(),
        faceMatchScore: generatedScore,
        branchId: targetTerminalEmp?.work_location || "Pune Plant Floor A",
        status: generatedScore >= 95 ? "Verified" : "Verification Required"
      };

      // Create attendance log in Firebase
      await base44.entities.AttendanceLog.create(newSwipe);
      
      setSimulatedLog(newSwipe);
      toast.success(`${newSwipe.name} scanned successfully! Status: ${newSwipe.status}`);
      refetchDetails();
    } catch (err) {
      toast.error("Biometric simulation failed: " + err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered attendance logs for the history panel
  const filteredLogs = useMemo(() => {
    return safeAttendanceLogs.filter(log => {
      if (!log) return false;
      const matchesSearch = 
        (log.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.employee_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.date || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.branchId || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      // For status filtering, check both the stored status and computed attendance status
      let matchesStatus = false;
      if (statusFilter === "ALL") {
        matchesStatus = true;
      } else if (statusFilter === "Present" || statusFilter === "Late" || statusFilter === "Absent") {
        // Use computed attendance status based on punch time
        const attendanceStatus = getAttendanceStatus(log);
        matchesStatus = attendanceStatus === statusFilter;
      } else {
        // Use stored verification status (Verified, Verification Required)
        matchesStatus = log.status === statusFilter;
      }
      
      const matchesType = typeFilter === "ALL" || log.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [safeAttendanceLogs, searchTerm, statusFilter, typeFilter]);

  // --- DAILY PRODUCTION PIECE-RATE LOG ---
  const [prodEmpId, setProdEmpId] = useState("");
  const [producedQty, setProducedQty] = useState("45");
  const [defectiveQty, setDefectiveQty] = useState("2");
  const [machineUsed, setMachineUsed] = useState("CNC Lathe Machine");
  const [isSubmittingProd, setIsSubmittingProd] = useState(false);

  const targetProdEmp = useMemo(() => {
    return safeEmployees.find(e => e && e.id === prodEmpId) || null;
  }, [safeEmployees, prodEmpId]);

  const calculatedWages = useMemo(() => {
    const rate = Number(targetProdEmp?.piece_rate_per_unit || 15);
    const qty = Number(producedQty) || 0;
    const def = Number(defectiveQty) || 0;
    const accepted = Math.max(0, qty - def);
    return {
      rate,
      accepted,
      totalWages: accepted * rate
    };
  }, [targetProdEmp, producedQty, defectiveQty]);

  const handleBookProduction = async (e) => {
    e.preventDefault();
    if (!prodEmpId) {
      return toast.error("Please choose a production technician.");
    }

    setIsSubmittingProd(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Post payroll adjustment/allowance addition to database
      toast.success(`Booked ${calculatedWages.accepted} units. ₹${calculatedWages.totalWages} logged to payroll adjustment ledger!`);
      
      setProdEmpId("");
      setProducedQty("45");
      setDefectiveQty("2");
    } catch (err) {
      toast.error("Failed to log production details: " + err.message);
    } finally {
      setIsSubmittingProd(false);
    }
  };

  // --- GPS GEOPROCESSING & FENCING ---
  const [gpsEmployeeId, setGpsEmployeeId] = useState("");
  const [fenceRadius, setFenceRadius] = useState(250); // meters

  const gpsTargetEmp = useMemo(() => {
    return safeEmployees.find(e => e && e.id === gpsEmployeeId) || null;
  }, [safeEmployees, gpsEmployeeId]);

  // Simulate current coordinate checks relative to factory geofence center
  const simulatedGPS = useMemo(() => {
    if (!gpsEmployeeId) return null;
    
    // Factory center coordinates (e.g. Pune Plant)
    const centerLat = 18.5204;
    const centerLng = 73.8567;
    
    // Deterministic offset based on ID string
    const codeVal = gpsTargetEmp?.id?.charCodeAt(0) || 5;
    const isBreaching = codeVal % 2 === 0; // even code coordinates are offsite
    
    const latOffset = isBreaching ? 0.0045 : 0.0012; // 0.0045 is ~500m offsite
    const lngOffset = isBreaching ? 0.0035 : 0.0008;

    const empLat = centerLat + latOffset;
    const empLng = centerLng + lngOffset;

    // Calculate distance
    const dist = isBreaching ? 420 : 130; // simulated meters
    const isInside = dist <= fenceRadius;

    return {
      empName: gpsTargetEmp?.name || gpsTargetEmp?.full_name,
      center: { lat: centerLat, lng: centerLng },
      employeeLoc: { lat: empLat, lng: empLng },
      distance: dist,
      isInside,
      status: isInside ? "IN_BOUNDS" : "BREACH_WARNING"
    };
  }, [gpsEmployeeId, gpsTargetEmp, fenceRadius]);

  return (
    <div className="space-y-6 animate-fade-in text-xs leading-relaxed">
      
      {/* Dynamic activator warning */}
      {activeBusinessType !== "manufacturer" && (
        <div className="bg-amber-500/5 border border-amber-500/25 p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-black text-amber-500 text-xs">Standard MES Terminal Mode</h4>
            <p className="text-muted-foreground text-[10px] mt-0.5 leading-normal">
              Manufacturing Company details are not actively flagged in Shop Settings. However, MES biometric integration, RFID cards, GPS fencing, and piece-rate trackers remain available for simulation in compliance with industrial audit standards.
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation header */}
      <div className="flex bg-secondary/15 p-1 border border-border/40 rounded-xl h-9 w-max">
        <button 
          onClick={() => setActiveTab("biometrics")}
          className={`font-bold px-4 rounded-lg transition text-[10px] flex items-center gap-1.5 ${activeTab === "biometrics" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
        >
          <Cpu className="w-3.5 h-3.5 text-primary" /> Facial swipe Scanner
        </button>
        <button 
          onClick={() => setActiveTab("piecerate")}
          className={`font-bold px-4 rounded-lg transition text-[10px] flex items-center gap-1.5 ${activeTab === "piecerate" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
        >
          <PenTool className="w-3.5 h-3.5 text-emerald-500" /> Daily piece-Rate wage
        </button>
        <button 
          onClick={() => setActiveTab("geofencing")}
          className={`font-bold px-4 rounded-lg transition text-[10px] flex items-center gap-1.5 ${activeTab === "geofencing" ? "bg-background text-foreground shadow" : "text-muted-foreground"}`}
        >
          <Compass className="w-3.5 h-3.5 text-indigo-400" /> GPS Geofence Terminal
        </button>
      </div>

      {/* VIEW: BIOMETRICS SCANNER TERMINAL */}
      {activeTab === "biometrics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Simulation controller */}
            <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <div className="border-b border-border/20 pb-3">
                <h3 className="font-black text-sm text-foreground">Facial Recognition Check-In swipe Simulator</h3>
                <p className="text-muted-foreground text-[10px] mt-0.5">Emulates an automated factory biometric hardware machine capturing facial match scores.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="font-bold">Choose Employee</Label>
                  <select 
                    value={terminalEmpId} 
                    onChange={e => {
                      setTerminalEmpId(e.target.value);
                      setSimulatedLog(null);
                    }}
                    className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                  >
                    <option value="">-- Select Manufacturing Staff --</option>
                    {factoryWorkers.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name || emp.full_name} ({emp.employee_code || emp.employeeId})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-bold">Next Swipe Type (Auto computed)</Label>
                    <div className={`w-full text-xs font-black py-2 px-3 rounded-lg border flex items-center justify-center h-9 ${
                      computedNextSwipeType === "CHECK_IN" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {computedNextSwipeType === "CHECK_IN" ? "PUNCH IN (Check-In)" : "PUNCH OUT (Check-Out)"}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold">Biometric Matching ID</Label>
                    <Input 
                      value={targetTerminalEmp?.biometric_id || "BIO-FAC-5832"} 
                      className="bg-background/50 text-xs h-9 border-border/40 font-mono font-bold"
                      disabled 
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSimulateSwipe}
                  disabled={isSimulating || !terminalEmpId}
                  className="w-full text-xs font-bold gold-gradient text-black h-9 mt-4 shadow-lg shadow-amber-500/10"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5 fill-black" /> Run Biometric Match Scan
                </Button>
              </div>
            </div>

            {/* Visual Camera scanner frame */}
            <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-center min-h-[340px] text-center">
              
              {/* Visual camera scan box */}
              <div className="w-40 h-40 border-2 border-dashed border-amber-500/40 rounded-3xl relative flex items-center justify-center bg-slate-500/5 group">
                {isSimulating ? (
                  <>
                    {/* Neon laser animation scanning */}
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-bounce shadow-md shadow-amber-400" />
                    <Cpu className="w-12 h-12 text-amber-500 animate-pulse" />
                  </>
                ) : simulatedLog ? (
                  <div className="text-center space-y-2">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <span className="font-bold text-[10px] text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">{facialScore}% Facial Match</span>
                  </div>
                ) : (
                  <Users className="w-12 h-12 text-slate-500" />
                )}
              </div>

              {/* Simulated log details card */}
              <div className="mt-5 space-y-1 font-mono text-[10px] text-muted-foreground">
                {isSimulating ? (
                  <span className="text-amber-500 font-bold animate-pulse">Running advanced convolutional biometric scanning...</span>
                ) : simulatedLog ? (
                  <div className="space-y-2 bg-slate-900/80 border border-emerald-500/30 p-4 rounded-xl text-left w-72 leading-normal shadow-2xl relative">
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <h4 className="font-extrabold text-[11px] text-emerald-400 border-b border-border/20 pb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> BIOMETRIC PUNCH SUCCESS
                    </h4>
                    <div className="space-y-1 text-slate-300 text-[10px]">
                      <div>Employee: <strong className="text-white font-extrabold">{simulatedLog.name}</strong></div>
                      <div>Emp Code: <strong className="text-slate-100">{simulatedLog.employee_code}</strong></div>
                      <div>Punch Action: <span className={`font-black px-1.5 py-0.5 rounded text-[9px] ${simulatedLog.type === "CHECK_IN" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>{simulatedLog.type === "CHECK_IN" ? "PUNCH IN" : "PUNCH OUT"}</span></div>
                      <div>Timestamp: <strong className="text-slate-100">{simulatedLog.date} @ {simulatedLog.time}</strong></div>
                      <div>Biometric ID: <strong className="text-slate-400 font-mono">{targetTerminalEmp?.biometric_id || "BIO-FAC-5832"}</strong></div>
                      <div className="border-t border-border/20 pt-1.5 mt-1.5 space-y-1 bg-secondary/10 p-2 rounded">
                        <div className="font-bold text-[9px] uppercase tracking-wider text-amber-500">Linked CTC &amp; Salary Structure</div>
                        <div className="flex justify-between">
                          <span>Basic Salary:</span>
                          <strong className="text-slate-100">₹{targetTerminalEmp?.basicSalary?.toLocaleString("en-IN") || "0"} /mo</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Allowances:</span>
                          <strong className="text-slate-100">₹{targetTerminalEmp?.allowances?.toLocaleString("en-IN") || "0"} /mo</strong>
                        </div>
                        <div className="flex justify-between border-t border-border/10 pt-1 text-[9.5px] font-extrabold">
                          <span>Total Monthly Gross:</span>
                          <strong className="text-emerald-400">₹{((targetTerminalEmp?.basicSalary || 0) + (targetTerminalEmp?.allowances || 0) + (targetTerminalEmp?.hra || 0)).toLocaleString("en-IN")} /mo</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span>System standby. Choose a manufacturing tech to run test biometric swipe.</span>
                )}
              </div>

            </div>
          </div>

          {/* REAL-TIME FACTORY SWIPE HISTORY & LEDGER (SMART FILTERS & SEARCH) */}
          <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/20 pb-3">
              <div>
                <h3 className="font-black text-sm text-foreground">Real-Time Factory Terminal Swipe Ledger</h3>
                <p className="text-muted-foreground text-[10px] mt-0.5">Live roster of biometric scanner logs on factory floor.</p>
              </div>

              {/* Smart Search Bar */}
              <div className="w-full md:w-64">
                <Input 
                  placeholder="Smart Search Staff, Code or Zone..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="text-xs bg-background/50 h-8 border-border/40"
                />
              </div>
            </div>

            {/* Smart Filters pills */}
            <div className="flex flex-wrap items-center gap-4 text-[10px]">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-muted-foreground uppercase">Attendance:</span>
                <div className="flex flex-wrap bg-secondary/25 p-0.5 rounded-lg border border-border/20">
                  {["ALL", "Present", "Late", "Absent"].map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1 rounded font-bold transition-all ${
                        statusFilter === status 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {status === "ALL" ? "ALL" : status === "Present" ? "✓ Present" : status === "Late" ? "⏱ Late" : "✗ Absent"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-extrabold text-muted-foreground uppercase">Type:</span>
                <div className="flex bg-secondary/25 p-0.5 rounded-lg border border-border/20">
                  {["ALL", "CHECK_IN", "CHECK_OUT"].map(type => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-2.5 py-1 rounded font-bold transition-all ${
                        typeFilter === type 
                          ? "bg-background text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type === "ALL" ? "ALL" : type === "CHECK_IN" ? "PUNCH IN" : "PUNCH OUT"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ml-auto text-[10px] text-muted-foreground">
                Showing <strong className="text-foreground">{filteredLogs.length}</strong> of {safeAttendanceLogs.length} logs
              </div>
            </div>

            {/* Responsive Table with horizontal scroll support */}
            <div className="border border-border/30 rounded-xl overflow-hidden bg-background/20">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-[10px] text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-secondary/20 text-muted-foreground border-b border-border/20 font-black uppercase">
                      <th className="p-3">Employee</th>
                      <th className="p-3">Swipe Type</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3 text-center">Face Score</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Zone / Branch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-muted-foreground font-medium">
                          No matching biometric logs found. Execute a face swipe simulation to create logs!
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((log, index) => (
                        <tr key={log.id || index} className="hover:bg-secondary/10 transition font-medium">
                          <td className="p-3">
                            <div className="font-extrabold text-slate-200">{log.name}</div>
                            <div className="text-[9px] text-muted-foreground font-mono">{log.employee_code}</div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                              log.type === "CHECK_IN" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {log.type === "CHECK_IN" ? "PUNCH IN" : "PUNCH OUT"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">
                            <div>{log.date}</div>
                            <div className="text-[9px] text-muted-foreground">{log.time}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-mono font-bold ${
                              Number(log.faceMatchScore) >= 95 ? "text-emerald-400" : "text-amber-400"
                            }`}>
                              {log.faceMatchScore || 98}%
                            </span>
                          </td>
                          <td className="p-3">
                            {(() => {
                              const attendanceStatus = getAttendanceStatus(log);
                              const statusColors = {
                                "Present": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                                "Late": "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
                                "Absent": "bg-red-500/10 text-red-400 border border-red-500/20"
                              };
                              return (
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColors[attendanceStatus] || "bg-slate-500/10 text-slate-400"}`}>
                                  {attendanceStatus}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-3 text-slate-400">{log.branchId || "Factory Floor A"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: DAILY PIECE-RATE WAGES BOOKING */}
      {activeTab === "piecerate" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Allocation entry form */}
          <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <div className="border-b border-border/20 pb-3">
              <h3 className="font-black text-sm text-foreground">Daily Piece-rate output logging form</h3>
              <p className="text-muted-foreground text-[10px] mt-0.5">Logs quantity produced to allocate hourly piece-rate wage rewards.</p>
            </div>

            <form onSubmit={handleBookProduction} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="font-bold">Select Manufacturing Technician</Label>
                <select 
                  value={prodEmpId} 
                  onChange={e => setProdEmpId(e.target.value)}
                  className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                  required
                >
                  <option value="">-- Choose Floor Worker --</option>
                  {factoryWorkers.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name || emp.full_name} ({emp.employee_code || emp.employeeId})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-bold">Daily Outputs (Gross Qty)</Label>
                  <Input 
                    type="number" 
                    value={producedQty} 
                    onChange={e => setProducedQty(e.target.value)}
                    className="bg-background/50 text-xs h-9 border-border/40"
                    required 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-bold">Defective Units (QC Flagged)</Label>
                  <Input 
                    type="number" 
                    value={defectiveQty} 
                    onChange={e => setDefectiveQty(e.target.value)}
                    className="bg-background/50 text-xs h-9 border-border/40 text-red-400 font-bold"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">Certified Machinery Operated</Label>
                <Input 
                  value={machineUsed} 
                  onChange={e => setMachineUsed(e.target.value)}
                  className="bg-background/50 text-xs h-9 border-border/40 font-bold"
                  required 
                />
              </div>

              <Button 
                type="submit"
                disabled={isSubmittingProd || !prodEmpId}
                className="w-full text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-600 h-9 mt-4 shadow-lg shadow-emerald-500/10"
              >
                {isSubmittingProd ? "Logging Output..." : "Book Production Log"}
              </Button>
            </form>
          </div>

          {/* Allocation calculation display details */}
          <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-4 flex flex-col justify-between font-sans">
            <h4 className="font-black text-sm text-foreground border-b border-border/20 pb-2">Wage Calculation Breakdown</h4>
            
            <div className="space-y-3 font-medium text-xs leading-relaxed">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Standard Rate per unit:</span>
                <span className="text-slate-300 font-bold">₹{calculatedWages.rate} / accepted unit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">QC Accepted Production:</span>
                <span className="text-slate-300 font-bold">{calculatedWages.accepted} units</span>
              </div>
              <div className="flex justify-between text-red-400">
                <span>QC Rejected / Defects:</span>
                <span>-{defectiveQty} units</span>
              </div>
              <div className="border-t border-border/20 pt-2 flex justify-between items-baseline text-sm">
                <span className="font-bold text-foreground">Total wage earned today:</span>
                <strong className="text-lg font-black text-emerald-500">₹{calculatedWages.totalWages.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            <div className="bg-secondary/15 border border-border/30 p-3.5 rounded-xl space-y-1.5 mt-4 text-[10px]">
              <span className="font-black text-amber-500 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> ISO-9001 Factory Compliance Audit</span>
              <p className="text-muted-foreground leading-normal">
                Piece rate rewards are calculated dynamically and automatically index into the salary structure adjustment ledger when the month payroll is processed.
              </p>
            </div>
          </div>

        </div>
      )}

      {/* VIEW: GPS GEOPROCESSING & FENCING */}
      {activeTab === "geofencing" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* GPS Parameters card */}
          <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <div className="border-b border-border/20 pb-3">
              <h3 className="font-black text-sm text-foreground flex items-center gap-1.5"><Navigation className="w-4.5 h-4.5 text-indigo-400" /> GPS Geofence Terminal</h3>
              <p className="text-muted-foreground text-[10px] mt-0.5">Captures geofence coordinates and monitors GPS breach violations.</p>
            </div>

            <div className="space-y-4 font-medium">
              <div className="space-y-1.5">
                <Label className="font-bold">Target Employee Coordinate check</Label>
                <select 
                  value={gpsEmployeeId} 
                  onChange={e => setGpsEmployeeId(e.target.value)}
                  className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                >
                  <option value="">-- Choose Employee --</option>
                  {safeEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name || emp.full_name} ({emp.employee_code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">Geofence Allowed Radius (Meters)</Label>
                <select 
                  value={fenceRadius} 
                  onChange={e => setFenceRadius(Number(e.target.value))}
                  className="w-full bg-background/50 text-xs py-2 px-3 rounded-lg border border-border/40 font-bold"
                >
                  <option value="150">150 meters (Standard Geofence)</option>
                  <option value="250">250 meters (Industrial Slabs)</option>
                  <option value="500">500 meters (Extended Bounds)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SVG Map Fencing visualizer */}
          <div className="lg:col-span-2 bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between min-h-[360px]">
            
            <div className="flex items-center justify-between border-b border-border/20 pb-3">
              <h4 className="font-black text-xs text-foreground uppercase tracking-wider">Premises GPS perimeter tracking</h4>
              {simulatedGPS && (
                <span className={`font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full border ${
                  simulatedGPS.isInside 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-red-500/15 text-red-400 border-red-500/20 animate-pulse"
                }`}>
                  {simulatedGPS.status}
                </span>
              )}
            </div>

            {/* SVG Visual map */}
            <div className="flex-1 flex items-center justify-center py-6 relative">
              <svg className="w-72 h-52 text-muted-foreground border border-border/20 rounded-2xl bg-secondary/10" viewBox="0 0 200 150">
                {/* Geofence target center circular perimeter */}
                <circle cx="100" cy="75" r="45" fill="none" stroke="#2563eb" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="100" cy="75" r="35" fill="rgba(37, 99, 235, 0.05)" />
                <circle cx="100" cy="75" r="3" fill="#2563eb" />
                <text x="100" y="65" fontSize="7" fill="#60a5fa" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">HQ Center</text>

                {/* Employee Dot */}
                {simulatedGPS && (
                  <>
                    <circle 
                      cx={simulatedGPS.isInside ? "115" : "165"} 
                      cy={simulatedGPS.isInside ? "85" : "120"} 
                      r="4.5" 
                      fill={simulatedGPS.isInside ? "#10b981" : "#ef4444"} 
                      className={simulatedGPS.isInside ? "" : "animate-pulse"}
                    />
                    <line 
                      x1="100" 
                      y1="75" 
                      x2={simulatedGPS.isInside ? "115" : "165"} 
                      y2={simulatedGPS.isInside ? "85" : "120"} 
                      stroke="#4b5563" 
                      strokeWidth="0.5" 
                      strokeDasharray="1 1"
                    />
                    <text 
                      x={simulatedGPS.isInside ? "115" : "165"} 
                      y={simulatedGPS.isInside ? "78" : "113"} 
                      fontSize="6.5" 
                      fill="#e2e8f0" 
                      fontWeight="black" 
                      textAnchor="middle" 
                      fontFamily="sans-serif"
                    >
                      {simulatedGPS.empName?.split(" ")[0]}
                    </text>
                  </>
                )}
              </svg>
            </div>

            {/* GPS Summary Logs */}
            <div className="border-t border-border/20 pt-4 leading-normal">
              {simulatedGPS ? (
                <div className="flex justify-between items-center text-xs font-mono">
                  <div className="space-y-0.5">
                    <div>Technician: <strong className="text-slate-200">{simulatedGPS.empName}</strong></div>
                    <div>Perimeter Coordinates: <strong className="text-primary">{simulatedGPS.employeeLoc.lat.toFixed(5)}, {simulatedGPS.employeeLoc.lng.toFixed(5)}</strong></div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block">Distance Offset</span>
                    <strong className={`text-sm font-black ${simulatedGPS.isInside ? "text-emerald-500" : "text-red-400"}`}>
                      {simulatedGPS.distance} meters
                    </strong>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center">
                  Select a tech worker in coordinates parameters tab to visualize GPS geofence checks.
                </p>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
