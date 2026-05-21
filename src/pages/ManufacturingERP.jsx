import { useState, useEffect, useRef } from "react";
import {
  Building2, Layers, Cpu, AlertTriangle, FileText, CheckCircle2, TrendingUp,
  Users, Truck, RotateCcw, Package, Barcode, Calendar, Play, Power,
  Zap, Hammer, Activity, Plus, ShieldCheck, ClipboardList, MapPin, Search, ChevronRight, Check, Sliders, Info, ShieldAlert, ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts";

// Mock Plants Configuration
const PLANTS = [
  { id: "plant-1", name: "Plant 1 - Heavy Metallurgy & Forging (HQ)", OEE: 94.2, activeLines: 4, shiftName: "Shift Alpha", baseTemp: 195, baseSpeed: 210, baseVib: 15, scrapRate: "1.2%" },
  { id: "plant-2", name: "Plant 2 - High-Precision Robotics Assembly (Pune)", OEE: 88.5, activeLines: 6, shiftName: "Shift Delta", baseTemp: 45, baseSpeed: 140, baseVib: 5, scrapRate: "0.8%" },
  { id: "plant-3", name: "Plant 3 - Bio-Chemical Compounding (Gujarat)", OEE: 91.8, activeLines: 3, shiftName: "Shift Gamma", baseTemp: 280, baseSpeed: 320, baseVib: 28, scrapRate: "1.9%" }
];

export default function ManufacturingERP() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Dynamic Plant Switching State
  const [selectedPlantId, setSelectedPlantId] = useState("plant-1");
  const activePlant = PLANTS.find(p => p.id === selectedPlantId) || PLANTS[0];

  // Live Machine Telemetry & Sliders State (User Controlled)
  const [machineSpeed, setMachineSpeed] = useState(activePlant.baseSpeed);
  const [machineTemp, setMachineTemp] = useState(activePlant.baseTemp);
  const [machineVibration, setMachineVibration] = useState(activePlant.baseVib);
  const [machineActive, setMachineActive] = useState(true);

  // Scrolling Terminal Logs State
  const [terminalLogs, setTerminalLogs] = useState([
    "[SYSTEM] SCM IIoT core engine online.",
    `[PLANT] Mapped telemetry listeners to ${activePlant.name}.`,
    "[SENSOR] Active thermal scans operating in safe parameters."
  ]);
  const logContainerRef = useRef(null);

  // Live Sync Pulse States
  const [dbPulseState, setDbPulseState] = useState("SYNCHRONIZED");
  const [pingMs, setPingMs] = useState(32);

  // Telemetry waveform state for Recharts
  const [telemetry, setTelemetry] = useState([]);
  const [telemetryTicks, setTelemetryTicks] = useState(0);

  // Auto Scroll Terminal Logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  // Sync sliders when Plant changes
  useEffect(() => {
    setMachineSpeed(activePlant.baseSpeed);
    setMachineTemp(activePlant.baseTemp);
    setMachineVibration(activePlant.baseVib);
    setTerminalLogs(prev => [
      ...prev,
      `[SYSTEM] Context switched to ${activePlant.name}. Re-synchronizing hardware controllers.`,
      `[SENSOR] Motor Speed base aligned at ${activePlant.baseSpeed} RPM.`,
      `[SENSOR] Thermostat aligned at ${activePlant.baseTemp}°C.`
    ]);
  }, [selectedPlantId]);

  // ----------------------------------------------------
  // Persistent Data Collections (Local & Offline Fallbacks)
  // ----------------------------------------------------
  const [rawMaterials, setRawMaterials] = useState(() => {
    const saved = localStorage.getItem("sap_raw_materials");
    return saved ? JSON.parse(saved) : [
      { id: "raw-1", name: "High-Grade Stainless Sheet", sku: "RM-STL-001", stock: 1200, unit: "kg", cost: 180, reorderLevel: 300, supplier: "SteelCorp India", location: "Aisle 12, Bin B4" },
      { id: "raw-2", name: "Heavy Structural Polymer", sku: "RM-PLY-084", stock: 850, unit: "kg", cost: 75, reorderLevel: 200, supplier: "Apex Polymers", location: "Aisle 05, Bin A1" },
      { id: "raw-3", name: "Reinforced Brass Bolt (12mm)", sku: "RM-BLT-112", stock: 15000, unit: "pcs", cost: 12, reorderLevel: 2500, supplier: "Fastener Hub", location: "Aisle 09, Bin D2" },
      { id: "raw-4", name: "Structural Carbon Fiber Wrap", sku: "RM-CAR-521", stock: 140, unit: "rolls", cost: 950, reorderLevel: 50, supplier: "Composite Systems", location: "Aisle 22, Bin E3" },
      { id: "raw-5", name: "Curing Catalyst Compound CX-9", sku: "RM-CAT-909", stock: 80, unit: "liters", cost: 420, reorderLevel: 25, supplier: "Gujarat Organics", location: "Cold Storage Room C" }
    ];
  });

  const [products, setProducts] = useState([]); // Finished goods list from global inventory

  const [boms, setBoms] = useState(() => {
    const saved = localStorage.getItem("sap_boms");
    return saved ? JSON.parse(saved) : [
      {
        id: "bom-1",
        name: "Industrial Turbine Casing (X200)",
        type: "discrete", // discrete or process
        targetProductId: "prod-1",
        targetProductName: "Turbine Casing X200",
        materials: [
          { rawMaterialId: "raw-1", name: "High-Grade Stainless Sheet", qty: 25, unit: "kg" },
          { rawMaterialId: "raw-2", name: "Heavy Structural Polymer", qty: 10, unit: "kg" },
          { rawMaterialId: "raw-3", name: "Reinforced Brass Bolt (12mm)", qty: 80, unit: "pcs" }
        ],
        laborCost: 1200,
        overheadCost: 650,
        workCenters: ["Work Center 10 - Hydraulic Cutting", "Work Center 15 - Assembly Line C"],
        stages: ["Blending & Cutting", "Extrusion Pressing", "Finish Polishing"],
        coproducts: [{ name: "Stainless Scrap Sheet Shards", qty: 3, unit: "kg", reusable: true }]
      },
      {
        id: "bom-2",
        name: "Eco Carbon Chassis (Pro-V)",
        type: "process",
        targetProductId: "prod-2",
        targetProductName: "Carbon Chassis V-Max",
        materials: [
          { rawMaterialId: "raw-4", name: "Structural Carbon Fiber Wrap", qty: 8, unit: "rolls" },
          { rawMaterialId: "raw-2", name: "Heavy Structural Polymer", qty: 15, unit: "kg" },
          { rawMaterialId: "raw-5", name: "Curing Catalyst Compound CX-9", qty: 2, unit: "liters" }
        ],
        laborCost: 4500,
        overheadCost: 1800,
        workCenters: ["Work Center 08 - Composite Layup", "Work Center 12 - Autoclave Kiln H5"],
        stages: ["Carbon Layering", "Vacuum Heat Infusion", "Ultrasonic Trim"],
        coproducts: [{ name: "Excess Trim Fiber Scrap", qty: 1, unit: "rolls", reusable: false }]
      }
    ];
  });

  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem("sap_jobs");
    return saved ? JSON.parse(saved) : [
      { id: "job-101", bomId: "bom-1", name: "Turbine Casing X200", qty: 40, scheduledDate: "2026-05-22", stage: "Extrusion Pressing", status: "processing", activeMachine: "Extruder press - A3", workerRoster: "Shift Alpha", rawDeducted: true, finishedPosted: false, plantId: "plant-1" },
      { id: "job-102", bomId: "bom-2", name: "Carbon Chassis V-Max", qty: 12, scheduledDate: "2026-05-21", stage: "Vacuum Heat Infusion", status: "qc", activeMachine: "Autoclave Oven - H5", workerRoster: "Shift Delta", rawDeducted: true, finishedPosted: false, plantId: "plant-2" },
      { id: "job-103", bomId: "bom-1", name: "Turbine Casing X200", qty: 60, scheduledDate: "2026-05-24", stage: "Blending & Cutting", status: "scheduled", activeMachine: "Unassigned", workerRoster: "Shift Gamma", rawDeducted: false, finishedPosted: false, plantId: "plant-1" }
    ];
  });

  const [qcQueue, setQcQueue] = useState(() => {
    const saved = localStorage.getItem("sap_qc_queue");
    return saved ? JSON.parse(saved) : [
      { id: "qc-1", jobId: "job-102", name: "Carbon Chassis V-Max", totalQty: 12, passedQty: 10, rejectedQty: 2, failureCode: "DF-01: Structural Fracture", inspector: "Harish Sharma, Lead Engineer", status: "completed", date: "2026-05-21" },
      { id: "qc-2", jobId: "job-101", name: "Turbine Casing X200", totalQty: 40, passedQty: 0, rejectedQty: 0, failureCode: "", inspector: "Sanjeev Roy, QA Specialist", status: "pending", date: "2026-05-21" }
    ];
  });

  const [reworkQueue, setReworkQueue] = useState(() => {
    const saved = localStorage.getItem("sap_rework_queue");
    return saved ? JSON.parse(saved) : [
      { id: "rew-1", sourceQcId: "qc-1", name: "Carbon Chassis V-Max", qty: 2, failureCode: "DF-01: Structural Fracture", status: "reworking", date: "2026-05-21", plantId: "plant-2", disposition: "Rework" }
    ];
  });

  const [dispatchOrders, setDispatchOrders] = useState(() => {
    const saved = localStorage.getItem("sap_dispatch_orders");
    return saved ? JSON.parse(saved) : [
      { id: "dsp-1001", client: "Mumbai Port Dealers", product: "Turbine Casing X200", qty: 35, vehicleNo: "MH-12-PQ-8854", driver: "Vikram Rathore", status: "In Transit", ewayBill: "EWAY-2268595", freightMode: "Road Transport", sealId: "SEAL-A880295", routeProgress: 45, date: "2026-05-21" },
      { id: "dsp-1002", client: "Delhi Aerospace Alliance", product: "Carbon Chassis V-Max", qty: 10, vehicleNo: "DL-01-AB-1200", driver: "Gurmeet Singh", status: "Dispatched", ewayBill: "EWAY-9936521", freightMode: "Rail Cargo", sealId: "SEAL-Z110492", routeProgress: 15, date: "2026-05-21" }
    ];
  });

  // Dynamic MRP (Material Requirements Planning) Requisitions
  const [mrpRequisitions, setMrpRequisitions] = useState(() => {
    const saved = localStorage.getItem("sap_mrp_requisitions");
    return saved ? JSON.parse(saved) : [];
  });

  // Sync collections to Local Storage
  useEffect(() => {
    localStorage.setItem("sap_raw_materials", JSON.stringify(rawMaterials));
  }, [rawMaterials]);

  useEffect(() => {
    localStorage.setItem("sap_boms", JSON.stringify(boms));
  }, [boms]);

  useEffect(() => {
    localStorage.setItem("sap_jobs", JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem("sap_qc_queue", JSON.stringify(qcQueue));
  }, [qcQueue]);

  useEffect(() => {
    localStorage.setItem("sap_rework_queue", JSON.stringify(reworkQueue));
  }, [reworkQueue]);

  useEffect(() => {
    localStorage.setItem("sap_dispatch_orders", JSON.stringify(dispatchOrders));
  }, [dispatchOrders]);

  useEffect(() => {
    localStorage.setItem("sap_mrp_requisitions", JSON.stringify(mrpRequisitions));
  }, [mrpRequisitions]);

  // Load Finished Goods list from global database
  useEffect(() => {
    base44.entities.Product.list()
      .then(res => {
        if (res && res.length > 0) {
          setProducts(res);
        } else {
          setProducts([
            { id: "prod-1", name: "Turbine Casing X200", sku: "TURB-X200-FIN", price: 14500, stock: 45 },
            { id: "prod-2", name: "Carbon Chassis V-Max", sku: "CHSS-VMAX-FIN", price: 29000, stock: 15 }
          ]);
        }
      })
      .catch(() => {
        setProducts([
          { id: "prod-1", name: "Turbine Casing X200", sku: "TURB-X200-FIN", price: 14500, stock: 45 },
          { id: "prod-2", name: "Carbon Chassis V-Max", sku: "CHSS-VMAX-FIN", price: 29000, stock: 15 }
        ]);
      });
  }, []);

  // Telemetry Simulator Core Logic
  useEffect(() => {
    // Seed initial values
    const initData = Array.from({ length: 15 }, (_, i) => ({
      time: `${i * 2}s`,
      extruderTemp: Number(machineTemp) + Math.floor(Math.random() * 8),
      conveyorLoad: Math.floor(Number(machineSpeed) / 3) + Math.floor(Math.random() * 10),
      vibrationRate: Number(machineVibration) + Math.floor(Math.random() * 4),
    }));
    setTelemetry(initData);

    const interval = setInterval(() => {
      if (!machineActive) return;
      setTelemetryTicks(t => t + 1);
      
      setTelemetry(prev => {
        const nextTime = `${(prev.length + telemetryTicks) * 2}s`;
        const updated = [...prev.slice(1), {
          time: nextTime,
          extruderTemp: Number(machineTemp) + Math.floor(Math.random() * 10) - 5,
          conveyorLoad: Math.floor(Number(machineSpeed) / 3) + Math.floor(Math.random() * 12) - 6,
          vibrationRate: Number(machineVibration) + Math.floor(Math.random() * 4) - 2,
        }];
        return updated;
      });

      // database speed simulation
      setPingMs(18 + Math.floor(Math.random() * 32));

      // Append dynamic pings to Scrolling Terminal logs
      if (Math.random() > 0.4) {
        const sensorLogs = [
          `[SENSOR-102] OEE operating index calculated at ${(Number(machineSpeed) > 300 || Number(machineTemp) > 250) ? "OEE Reduced (Calibration Alert)" : "OEE Stable (94.2%)"}.`,
          `[KILN] Temperature sensor feedback stable at ${machineTemp}°C.`,
          `[CONVEYOR] Operating velocity calibrated at ${machineSpeed} RPM.`,
          `[IIOT] Vibration frequencies captured at ${machineVibration} Hz.`
        ];
        const selected = sensorLogs[Math.floor(Math.random() * sensorLogs.length)];
        setTerminalLogs(prev => [...prev.slice(-30), selected]); // Limit total logs
      }

    }, 2000);

    return () => clearInterval(interval);
  }, [machineActive, telemetryTicks, machineSpeed, machineTemp, machineVibration]);

  // Alert triggers based on sliders
  const isSpeedCritical = machineSpeed > 290;
  const isTempCritical = machineTemp > 240;
  const isVibCritical = machineVibration > 22;

  // ----------------------------------------------------
  // Forms & Modal Dialog Configurations
  // ----------------------------------------------------
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [rawForm, setRawForm] = useState({ name: "", sku: "", stock: 0, unit: "kg", cost: 0, reorderLevel: 0, supplier: "", location: "" });

  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [bomForm, setBomForm] = useState({ name: "", type: "discrete", targetProductId: "", laborCost: 0, overheadCost: 0, materials: [], stages: "Blending, Processing, Packaging", workCenters: "Work Center 10", coproductsName: "", coproductsQty: 0, coproductsUnit: "kg" });
  const [selectedRawInput, setSelectedRawInput] = useState("");
  const [selectedRawQtyInput, setSelectedRawQtyInput] = useState("");

  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobForm, setJobForm] = useState({ bomId: "", qty: 10, scheduledDate: new Date().toISOString().split("T")[0], activeMachine: "", workerRoster: "" });

  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [activeQcItem, setActiveQcItem] = useState(null);
  const [qcForm, setQcForm] = useState({ passedQty: 0, rejectedQty: 0, failureCode: "DF-01: Structural Fracture", inspector: "", disposition: "Rework" });

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ client: "", product: "", qty: 10, vehicleNo: "", driver: "", freightMode: "Road Transport", sealId: "" });

  // ----------------------------------------------------
  // MRP RUN AUTOMATION
  // ----------------------------------------------------
  const handleRunMRP = () => {
    // 1. Gather all active jobs with "scheduled" or "processing" status
    const pendingJobs = jobs.filter(j => j.status === "scheduled" || j.status === "processing");
    if (pendingJobs.length === 0) {
      toast.info("No active or scheduled jobs. Demand MRP run is blank.");
      return;
    }

    const calculatedDeficits = {};

    // 2. Iterate each job, look up target BOM and calculate required materials
    pendingJobs.forEach(job => {
      const matchBom = boms.find(b => b.id === job.bomId);
      if (!matchBom) return;

      matchBom.materials.forEach(mat => {
        const totalNeeded = mat.qty * job.qty;
        if (!calculatedDeficits[mat.rawMaterialId]) {
          calculatedDeficits[mat.rawMaterialId] = {
            name: mat.name,
            needed: 0,
            unit: mat.unit
          };
        }
        calculatedDeficits[mat.rawMaterialId].needed += totalNeeded;
      });
    });

    // 3. Compare required vs current stock
    const newRequisitions = [];
    Object.keys(calculatedDeficits).forEach(rawId => {
      const currentRaw = rawMaterials.find(r => r.id === rawId);
      const requirement = calculatedDeficits[rawId];
      const stock = currentRaw ? currentRaw.stock : 0;
      
      if (stock < requirement.needed) {
        const deficit = requirement.needed - stock;
        const totalEstimatedCost = deficit * (currentRaw ? currentRaw.cost : 10);
        newRequisitions.push({
          id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
          materialId: rawId,
          name: requirement.name,
          unit: requirement.unit,
          deficit,
          estimatedCost: totalEstimatedCost,
          supplier: currentRaw ? currentRaw.supplier : "Global Sourcing Hub",
          status: "Draft Compiled"
        });
      }
    });

    if (newRequisitions.length === 0) {
      toast.success("MRP Complete: All ingredients are fully stocked. No deficits flagged!");
    } else {
      setMrpRequisitions(newRequisitions);
      toast.success(`MRP Execution Complete: Compiled ${newRequisitions.length} raw material Purchase Requisitions!`);
    }
  };

  // Create real Supplier PO from Requisitions (DOCK INTEGRATION)
  const handleRaiseMrpPo = (reqId) => {
    const target = mrpRequisitions.find(r => r.id === reqId);
    if (!target) return;

    // Simulate adding to purchase entries
    toast.success(`Purchase Order Draft raised for ${target.supplier} to supply ${target.deficit} ${target.unit} of ${target.name}!`);
    setMrpRequisitions(prev => prev.map(r => r.id === reqId ? { ...r, status: "PO Raised & Sent" } : r));
    
    // Add raw stock to inventory instantly (Simulating Supplier GRN delivery)
    setRawMaterials(prev => prev.map(raw => {
      if (raw.id === target.materialId) {
        return { ...raw, stock: raw.stock + target.deficit };
      }
      return raw;
    }));
  };

  // ----------------------------------------------------
  // EVENT ACTIONS & HANDLERS
  // ----------------------------------------------------

  // 1. Raw Inward Entry
  const handleCreateRawMaterial = () => {
    if (!rawForm.name || !rawForm.sku) {
      toast.error("Material Name and SKU Code are required");
      return;
    }
    const newRM = {
      id: "raw-" + (rawMaterials.length + 1),
      ...rawForm,
      stock: Number(rawForm.stock),
      cost: Number(rawForm.cost),
      reorderLevel: Number(rawForm.reorderLevel)
    };
    setRawMaterials([...rawMaterials, newRM]);
    setIsRawModalOpen(false);
    setRawForm({ name: "", sku: "", stock: 0, unit: "kg", cost: 0, reorderLevel: 0, supplier: "", location: "" });
    toast.success("Raw material asset logged inside warehouse");
  };

  // 2. BOM Compiler
  const handleAddMaterialToBom = () => {
    if (!selectedRawInput || !selectedRawQtyInput) {
      toast.error("Please select a raw material and specify recipe quantity");
      return;
    }
    const match = rawMaterials.find(r => r.id === selectedRawInput);
    if (!match) return;

    setBomForm(prev => ({
      ...prev,
      materials: [...prev.materials, { rawMaterialId: match.id, name: match.name, qty: Number(selectedRawQtyInput), unit: match.unit }]
    }));
    setSelectedRawInput("");
    setSelectedRawQtyInput("");
  };

  const handleSaveBom = () => {
    if (!bomForm.name || !bomForm.targetProductId) {
      toast.error("BOM Recipe Name and finished target SKU are required");
      return;
    }
    if (bomForm.materials.length === 0) {
      toast.error("Please compile at least one raw ingredient component");
      return;
    }
    const targetProd = products.find(p => p.id === bomForm.targetProductId) || { name: bomForm.targetProductId };
    
    // Build co-products array if entered
    const coprod = bomForm.coproductsName ? [{ name: bomForm.coproductsName, qty: Number(bomForm.coproductsQty) || 0, unit: bomForm.coproductsUnit, reusable: true }] : [];

    const newBOM = {
      id: "bom-" + (boms.length + 1),
      name: bomForm.name,
      type: bomForm.type,
      targetProductId: bomForm.targetProductId,
      targetProductName: targetProd.name,
      materials: bomForm.materials,
      laborCost: Number(bomForm.laborCost) || 0,
      overheadCost: Number(bomForm.overheadCost) || 0,
      workCenters: bomForm.workCenters.split(",").map(w => w.trim()),
      stages: bomForm.stages.split(",").map(s => s.trim()),
      coproducts: coprod
    };

    setBoms([...boms, newBOM]);
    setIsBomModalOpen(false);
    setBomForm({ name: "", type: "discrete", targetProductId: "", laborCost: 0, overheadCost: 0, materials: [], stages: "Blending, Processing, Packaging", workCenters: "Work Center 10", coproductsName: "", coproductsQty: 0, coproductsUnit: "kg" });
    toast.success("BOM Formula/Recipe compiled successfully");
  };

  // 3. Initiate Jobs
  const handleLaunchProductionJob = () => {
    if (!jobForm.bomId) {
      toast.error("BOM recipe selection required");
      return;
    }
    const matchBom = boms.find(b => b.id === jobForm.bomId);
    if (!matchBom) return;

    // Validate materials
    let hasEnough = true;
    matchBom.materials.forEach(m => {
      const current = rawMaterials.find(r => r.id === m.rawMaterialId);
      const needed = m.qty * jobForm.qty;
      if (!current || current.stock < needed) {
        hasEnough = false;
      }
    });

    if (!hasEnough) {
      toast.error("Insufficient Raw Stock! Run the MRP Engine tab to compile PO deficits.");
      return;
    }

    // Deduct stock
    setRawMaterials(prev => prev.map(item => {
      const matchMat = matchBom.materials.find(m => m.rawMaterialId === item.id);
      if (matchMat) {
        return { ...item, stock: item.stock - (matchMat.qty * jobForm.qty) };
      }
      return item;
    }));

    const newJob = {
      id: "job-" + (jobs.length + 101),
      bomId: jobForm.bomId,
      name: matchBom.name,
      qty: Number(jobForm.qty),
      scheduledDate: jobForm.scheduledDate,
      stage: matchBom.stages[0],
      status: "processing",
      activeMachine: jobForm.activeMachine || "Extruder press - A3",
      workerRoster: jobForm.workerRoster || "Shift Alpha",
      rawDeducted: true,
      finishedPosted: false,
      plantId: selectedPlantId
    };

    setJobs([...jobs, newJob]);
    setIsJobModalOpen(false);
    toast.success(`Production Lot ${newJob.id} initialized. Raw goods deducted.`);
  };

  const handleProgressStage = (jobId) => {
    setJobs(prev => prev.map(job => {
      if (job.id !== jobId) return job;
      const matchBom = boms.find(b => b.id === job.bomId);
      if (!matchBom) return job;
      
      const currentIndex = matchBom.stages.indexOf(job.stage);
      if (currentIndex < matchBom.stages.length - 1) {
        return { ...job, stage: matchBom.stages[currentIndex + 1] };
      } else {
        // Enters QC Bay lot queue
        toast.info(`Lot ${job.id} routing complete. Forwarded to Quality Inspection.`);
        
        const newQc = {
          id: "qc-" + (qcQueue.length + 1),
          jobId: job.id,
          name: job.name,
          totalQty: job.qty,
          passedQty: 0,
          rejectedQty: 0,
          failureCode: "",
          inspector: "QA Inspector Staging",
          status: "pending",
          date: new Date().toISOString().split("T")[0]
        };
        setQcQueue(prevQc => [...prevQc, newQc]);

        return { ...job, stage: "Quality Control QA", status: "qc" };
      }
    }));
  };

  // 4. Quality Lot Inspections
  const handleOpenQcForm = (qc) => {
    setActiveQcItem(qc);
    setQcForm({ passedQty: qc.totalQty, rejectedQty: 0, failureCode: "DF-01: Structural Fracture", inspector: "", disposition: "Rework" });
    setIsQcModalOpen(true);
  };

  const handleSubmitQc = () => {
    if (!qcForm.inspector) {
      toast.error("Inspector signature is required");
      return;
    }
    const passed = Number(qcForm.passedQty);
    const rejected = Number(qcForm.rejectedQty);
    if (passed + rejected !== activeQcItem.totalQty) {
      toast.error(`Quantities must sum to total lot volume (${activeQcItem.totalQty})`);
      return;
    }

    setQcQueue(prev => prev.map(q => {
      if (q.id === activeQcItem.id) {
        return { ...q, passedQty: passed, rejectedQty: rejected, failureCode: rejected > 0 ? qcForm.failureCode : "", inspector: qcForm.inspector, status: "completed" };
      }
      return q;
    }));

    // Material Review Board (MRB) Processing for failures
    if (rejected > 0) {
      const newRework = {
        id: "rew-" + (reworkQueue.length + 1),
        sourceQcId: activeQcItem.id,
        name: activeQcItem.name,
        qty: rejected,
        failureCode: qcForm.failureCode,
        status: qcForm.disposition === "Rework" ? "reworking" : qcForm.disposition === "Scrap" ? "scrapped" : qcForm.disposition === "Downgrade" ? "downgraded (B-Grade)" : "returned to supplier",
        disposition: qcForm.disposition,
        date: new Date().toISOString().split("T")[0],
        plantId: selectedPlantId
      };
      setReworkQueue(prev => [...prev, newRework]);

      // If Downgrade to B-grade inventory
      if (qcForm.disposition === "Downgrade") {
        setProducts(prev => prev.map(p => {
          if (p.name === activeQcItem.name) {
            return { ...p, stock: (p.stock || 0) + rejected }; // Simulated downgrade stock increase
          }
          return p;
        }));
        toast.warning(`${rejected} units failed inspection but posted as B-Grade discounted stock.`);
      } else {
        toast.warning(`${rejected} failed units processed via MRB pathway: ${qcForm.disposition}`);
      }
    }

    // Finished Goods stock posting
    if (passed > 0) {
      setProducts(prev => prev.map(p => {
        if (p.name === activeQcItem.name) {
          return { ...p, stock: (p.stock || 0) + passed };
        }
        return p;
      }));
      toast.success(`${passed} passed units certified and posted to finished stock warehousing.`);
    }

    setJobs(prev => prev.map(job => {
      if (job.id === activeQcItem.jobId) {
        return { ...job, status: "completed", stage: "Production Lot Complete" };
      }
      return job;
    }));

    setIsQcModalOpen(false);
  };

  // Rework queue actions
  const handleActionRework = (reworkId, action) => {
    if (action === "rework") {
      setReworkQueue(prev => prev.map(r => r.id === reworkId ? { ...r, status: "resolved (reprocessed)" } : r));
      const targetRework = reworkQueue.find(r => r.id === reworkId);
      if (targetRework) {
        setProducts(prev => prev.map(p => {
          if (p.name === targetRework.name) {
            return { ...p, stock: (p.stock || 0) + targetRework.qty };
          }
          return p;
        }));
      }
      toast.success("Rework reprocessing successful. Good stock incremented.");
    } else {
      setReworkQueue(prev => prev.map(r => r.id === reworkId ? { ...r, status: "scrapped" } : r));
      toast.error("Rework scrapped. Defective lot written off in scrap register.");
    }
  };

  // 5. Freight Dispatches
  const handleLaunchDispatch = () => {
    if (!dispatchForm.client || !dispatchForm.product || !dispatchForm.vehicleNo) {
      toast.error("All dispatch waybill details are required");
      return;
    }
    const matchProd = products.find(p => p.name === dispatchForm.product);
    if (matchProd && matchProd.stock < dispatchForm.qty) {
      toast.error("Insufficient finished goods in storage warehouses");
      return;
    }

    if (matchProd) {
      setProducts(prev => prev.map(p => p.id === matchProd.id ? { ...p, stock: p.stock - dispatchForm.qty } : p));
    }

    const newDispatch = {
      id: "dsp-" + (dispatchOrders.length + 1001),
      client: dispatchForm.client,
      product: dispatchForm.product,
      qty: Number(dispatchForm.qty),
      vehicleNo: dispatchForm.vehicleNo,
      driver: dispatchForm.driver || "Authorized Carrier",
      status: "In Transit",
      ewayBill: "EWAY-" + Math.floor(1000000 + Math.random() * 9000000),
      freightMode: dispatchForm.freightMode,
      sealId: dispatchForm.sealId || "SEAL-" + Math.floor(100000 + Math.random() * 900000),
      routeProgress: 5,
      date: new Date().toISOString().split("T")[0]
    };

    setDispatchOrders([...dispatchOrders, newDispatch]);
    setIsDispatchModalOpen(false);
    toast.success(`Excise Delivery Challan generated! Waybill synced.`);
  };

  return (
    <div className="space-y-6 pb-20 px-2 sm:px-6">
      
      {/* Central Command Cockpit Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card/65 backdrop-blur-2xl border border-border/40 p-5 rounded-2xl">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Building2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                SCM Manufacturing Cockpit
              </h1>
              <p className="text-[11px] text-muted-foreground font-bold">
                MNC Multi-Plant Operations Manager · SAP S/4HANA & Oracle Supply Chain Architecture
              </p>
            </div>
          </div>
        </div>

        {/* Plant Switching & IIoT Pulses */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-secondary/35 border border-border/40 px-3 py-1.5 rounded-lg text-xs font-bold">
            <span className="text-muted-foreground text-[10px] uppercase font-black">Active Plant Switcher:</span>
            <select
              value={selectedPlantId}
              onChange={e => setSelectedPlantId(e.target.value)}
              className="bg-transparent border-none text-[11px] font-black focus:outline-none focus:ring-0 text-primary cursor-pointer"
            >
              {PLANTS.map(p => (
                <option key={p.id} value={p.id} className="bg-background text-foreground font-bold">{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/40 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-muted-foreground">Sync:</span>
            <span className="text-primary">{dbPulseState} ({pingMs}ms)</span>
          </div>
        </div>
      </div>

      {/* SAP Style Tabs Grid */}
      <div className="flex overflow-x-auto gap-1.5 p-1 bg-secondary/30 rounded-xl border border-border/40 select-none scrollbar-none shrink-0">
        {[
          { id: "dashboard", icon: Cpu, label: "IIoT Diagnostics" },
          { id: "raw", icon: Layers, label: "Raw Materials Catalog" },
          { id: "bom", icon: ClipboardList, label: "Discrete & Process BOM" },
          { id: "mrp", icon: ShoppingBag, label: "MRP Resource Plan" },
          { id: "production", icon: Play, label: "Shop Floor Routing" },
          { id: "qc", icon: ShieldCheck, label: "MRB Quality Board" },
          { id: "dispatch", icon: Truck, label: "Fleet Waybills" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------
          TAB 1: IIoT DIAGNOSTICS & TELEMETRY CONTROL DECK
          ---------------------------------------------------- */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          
          {/* Circular KPI Metrics Block */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "Plant OEE Index", val: `${(activePlant.OEE - (isSpeedCritical ? 4.5 : 0) - (isTempCritical ? 3.2 : 0)).toFixed(1)}%`, desc: "Overall Equipment Index", icon: TrendingUp, color: "text-primary bg-primary/10" },
              { title: "Defect Yield Rate", val: activePlant.scrapRate, desc: "Quality Standard Index", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
              { title: "Active Lines", val: `${activePlant.activeLines} Lines Operating`, desc: `${activePlant.shiftName} Shift`, icon: Activity, color: "text-purple bg-purple/10" },
              { title: "Operating Limits", val: isSpeedCritical || isTempCritical ? "CRITICAL RUN" : "STABLE NOMINAL", desc: "Thermal & Vibration parameters", icon: AlertTriangle, color: isSpeedCritical || isTempCritical ? "text-destructive bg-destructive/15 animate-pulse" : "text-amber-500 bg-amber-500/10" }
            ].map((m, idx) => (
              <Card key={idx} className="border border-border/40 bg-card/45">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">{m.title}</p>
                    <p className="text-xl sm:text-2xl font-black">{m.val}</p>
                    <p className="text-[9px] font-semibold text-muted-foreground">{m.desc}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${m.color}`}>
                    <m.icon className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Live Waveform Telemetry Chart */}
            <Card className="lg:col-span-2 border border-border/40 bg-card/45">
              <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500 animate-bounce" /> Dynamic Sensor Load Waveform
                  </CardTitle>
                  <CardDescription className="text-[10px]">Real-time waveform capturing temperature and conveyor variables</CardDescription>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                  ● TELEMETRY STREAM ONLINE
                </span>
              </CardHeader>
              <CardContent className="p-4 pt-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={telemetry} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "10px" }} />
                      <Area type="monotone" dataKey="extruderTemp" name="Furnace / Kiln Temp (°C)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2.5} />
                      <Area type="monotone" dataKey="conveyorLoad" name="Velocity Load Ratio" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLoad)" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* IIoT Manual Calibration Sliders Control Deck */}
            <Card className="border border-border/40 bg-card/45 flex flex-col justify-between">
              <CardHeader className="p-4 border-b border-border/30">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-primary" /> IIoT Calibration Control Deck
                </CardTitle>
                <CardDescription className="text-[10px]">Adjust speed, thermal heat inputs, and vibration frequencies manually</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4 flex-1">
                
                {/* Calibration Slider 1: Speed */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span>Motor Speed / Feed Velocity</span>
                    <span className={isSpeedCritical ? "text-destructive font-black" : "text-primary"}>
                      {machineSpeed} RPM
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="450"
                    value={machineSpeed}
                    onChange={e => {
                      setMachineSpeed(Number(e.target.value));
                      setTerminalLogs(prev => [...prev.slice(-30), `[MANUAL CALIBRATION] Motor speed adjusted to ${e.target.value} RPM.`]);
                    }}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  {isSpeedCritical && (
                    <p className="text-[9px] text-destructive font-black flex items-center gap-0.5 animate-pulse">
                      <ShieldAlert className="w-3 h-3" /> Over-speed warning: Mechanical friction threshold exceeded!
                    </p>
                  )}
                </div>

                {/* Calibration Slider 2: Heat */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span>Extruder Furnace Heat Temperature</span>
                    <span className={isTempCritical ? "text-destructive font-black" : "text-primary"}>
                      {machineTemp} °C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="350"
                    value={machineTemp}
                    onChange={e => {
                      setMachineTemp(Number(e.target.value));
                      setTerminalLogs(prev => [...prev.slice(-30), `[MANUAL CALIBRATION] Thermostat adjusted to ${e.target.value}°C.`]);
                    }}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  {isTempCritical && (
                    <p className="text-[9px] text-destructive font-black flex items-center gap-0.5 animate-pulse">
                      <ShieldAlert className="w-3 h-3" /> Thermal limits warning: Overheating hazard registered!
                    </p>
                  )}
                </div>

                {/* Calibration Slider 3: Vibration */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span>Mechanical Axis Vibration Rate</span>
                    <span className={isVibCritical ? "text-destructive font-black" : "text-primary"}>
                      {machineVibration} Hz
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="45"
                    value={machineVibration}
                    onChange={e => {
                      setMachineVibration(Number(e.target.value));
                      setTerminalLogs(prev => [...prev.slice(-30), `[MANUAL CALIBRATION] Vibration frequencies tuned to ${e.target.value} Hz.`]);
                    }}
                    className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

              </CardContent>

              {/* High-Tech Scrolling Terminal Console */}
              <div className="p-3 bg-slate-900 border-t border-border/40 rounded-b-xl flex flex-col justify-end">
                <div className="flex items-center justify-between text-[9px] font-black text-slate-400 mb-1">
                  <span className="flex items-center gap-1 text-primary"><Activity className="w-3 h-3 animate-pulse" /> LIVE IIoT SENSOR pings</span>
                  <span>ONLINE</span>
                </div>
                <div 
                  ref={logContainerRef} 
                  className="h-28 overflow-y-auto text-[9px] font-mono text-emerald-400 space-y-1 select-text scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-900"
                >
                  {terminalLogs.map((log, idx) => (
                    <p key={idx} className="leading-tight">{log}</p>
                  ))}
                </div>
              </div>
            </Card>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: RAW MATERIALS CATALOG & INWARD INVENTORY
          ---------------------------------------------------- */}
      {activeTab === "raw" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">Raw Material Master Logs</h2>
              <p className="text-xs text-muted-foreground font-semibold">Track and manage chemical components, packaging rolls, and structural forge metals</p>
            </div>
            <Button onClick={() => setIsRawModalOpen(true)} className="flex items-center gap-1 cursor-pointer">
              <Plus className="w-4 h-4" /> Log Raw Stock Inward
            </Button>
          </div>

          <Card className="border border-border/40 bg-card/45">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-black text-slate-800 dark:text-slate-100">Material Commodity</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-100">SKU / Code</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-100">Current Qty</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-100">Unit Cost</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-100">Reorder Threshold</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-100">Supplier Mapping</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-100">Shelving Location</TableHead>
                    <TableHead className="font-black text-slate-800 dark:text-slate-100 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawMaterials.map(rm => {
                    const isLow = rm.stock <= rm.reorderLevel;
                    return (
                      <TableRow key={rm.id} className="hover:bg-secondary/20">
                        <TableCell className="font-bold">{rm.name}</TableCell>
                        <TableCell className="font-mono text-xs">{rm.sku}</TableCell>
                        <TableCell className="font-bold">{rm.stock} {rm.unit}</TableCell>
                        <TableCell className="font-bold">₹{rm.cost}</TableCell>
                        <TableCell className="font-semibold text-muted-foreground">{rm.reorderLevel} {rm.unit}</TableCell>
                        <TableCell className="font-semibold">{rm.supplier}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{rm.location || "Central Rack"}</TableCell>
                        <TableCell className="text-right">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                            isLow 
                              ? "bg-destructive/15 text-destructive animate-pulse animate-duration-1000" 
                              : "bg-emerald-500/15 text-emerald-500"
                          }`}>
                            {isLow ? "REORDER TRIGGERED" : "STOCK OK"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 3: DISCRETE & PROCESS BOM BUILDERS
          ---------------------------------------------------- */}
      {activeTab === "bom" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">Discrete & Process BOM</h2>
              <p className="text-xs text-muted-foreground font-semibold">Define exact components for mechanical assembly, or chemical/compounding formula recipes</p>
            </div>
            <Button onClick={() => setIsBomModalOpen(true)} className="flex items-center gap-1 cursor-pointer">
              <Plus className="w-4 h-4" /> Create Recipe BOM
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {boms.map(bom => {
              const materialSum = bom.materials.reduce((sum, item) => {
                const current = rawMaterials.find(r => r.id === item.rawMaterialId);
                const itemCost = current ? current.cost : 0;
                return sum + (item.qty * itemCost);
              }, 0);
              const totalCost = materialSum + bom.laborCost + bom.overheadCost;

              return (
                <Card key={bom.id} className="border border-border/40 bg-card/45 flex flex-col justify-between">
                  <CardHeader className="p-4 border-b border-border/30">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        bom.type === "discrete" ? "bg-blue-500/15 text-blue-500" : "bg-purple/15 text-purple"
                      }`}>
                        {bom.type === "discrete" ? "DISCRETE ASSEMBLY" : "PROCESS FORMULA"}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-bold">Target Product: {bom.targetProductName}</span>
                    </div>
                    <CardTitle className="text-sm font-black mt-2 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" /> {bom.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    
                    {/* Ingredients list */}
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Material Formulation:</h4>
                      <div className="space-y-1 text-xs font-semibold">
                        {bom.materials.map((m, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-secondary/15 p-2 rounded border border-border/20">
                            <span>{m.name}</span>
                            <span className="font-bold text-primary">{m.qty} {m.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Work Centers & Routing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Allocated Work Centers:</h4>
                        <div className="space-y-0.5 text-[9px] font-extrabold text-muted-foreground">
                          {bom.workCenters ? bom.workCenters.map((wc, i) => (
                            <p key={i}>🔧 {wc}</p>
                          )) : <p>General Work Center</p>}
                        </div>
                      </div>

                      {/* Co-Products & Reclamation */}
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Co-Products & Scraps:</h4>
                        <div className="text-[9px] font-extrabold text-muted-foreground">
                          {bom.coproducts && bom.coproducts.length > 0 ? bom.coproducts.map((cp, i) => (
                            <p key={i} className="text-emerald-500">♻️ {cp.name} ({cp.qty} {cp.unit})</p>
                          )) : <p>None mapped</p>}
                        </div>
                      </div>
                    </div>

                    {/* Routing phases */}
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Process Routing Chain:</h4>
                      <div className="flex items-center flex-wrap gap-1 text-[9px] font-bold">
                        {bom.stages.map((stage, idx) => (
                          <div key={idx} className="flex items-center gap-1 bg-secondary/35 px-2 py-0.5 rounded border border-border/20 text-muted-foreground">
                            <span>{stage}</span>
                            {idx < bom.stages.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Costing calculation */}
                    <div className="pt-2 border-t border-border/30 flex justify-between items-center text-xs">
                      <div>
                        <p className="text-[9px] text-muted-foreground font-bold">PRODUCTION COST PER UNIT</p>
                        <p className="text-lg font-black text-emerald-500">₹{totalCost}</p>
                      </div>
                      <div className="text-right text-[9px] font-bold text-muted-foreground space-y-0.5">
                        <p>Raw Goods: ₹{materialSum}</p>
                        <p>Labor: ₹{bom.laborCost}</p>
                        <p>Overhead: ₹{bom.overheadCost}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 4: AUTOMATED MRP RESOURCE PLANNING
          ---------------------------------------------------- */}
      {activeTab === "mrp" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">MRP (Material Requirements Planning)</h2>
              <p className="text-xs text-muted-foreground font-semibold">Perform advanced material checks against active orders, calculate deficits, and draft vendor POs instantly</p>
            </div>
            <Button onClick={handleRunMRP} className="flex items-center gap-1 cursor-pointer">
              <Zap className="w-4 h-4 text-amber-500" /> Run MRP Demand Solve
            </Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Deficit Requisitions Table */}
            <Card className="xl:col-span-2 border border-border/40 bg-card/45">
              <CardHeader className="p-4 border-b border-border/30">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Compiled Ingredient Requisitions
                </CardTitle>
                <CardDescription className="text-[10px]">Autogenerated PO recommendations mapping deficits to suppliers</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Req Code</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Ingredient Commodity</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Deficit Qty</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Estimated Cost</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Supplier</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100 text-right">MRP Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mrpRequisitions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center p-6 text-muted-foreground font-bold">
                          No requisitions. Run "MRP Demand Solve" to scan manufacturing schedules.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mrpRequisitions.map(req => (
                        <TableRow key={req.id} className="hover:bg-secondary/20">
                          <TableCell className="font-mono text-xs font-bold text-primary">{req.id}</TableCell>
                          <TableCell className="font-bold">{req.name}</TableCell>
                          <TableCell className="font-bold text-destructive">{req.deficit} {req.unit}</TableCell>
                          <TableCell className="font-bold">₹{req.estimatedCost}</TableCell>
                          <TableCell className="font-semibold text-xs">{req.supplier}</TableCell>
                          <TableCell className="text-right">
                            {req.status === "Draft Compiled" ? (
                              <Button 
                                onClick={() => handleRaiseMrpPo(req.id)}
                                size="sm" 
                                className="text-[9px] font-black h-7 px-2.5 cursor-pointer"
                              >
                                Raise Supplier PO
                              </Button>
                            ) : (
                              <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                PO DISPATCHED
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* MRP Resource Analytics Info Card */}
            <Card className="border border-border/40 bg-card/45 flex flex-col justify-between">
              <CardHeader className="p-4 border-b border-border/30">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-primary" /> Resource Planning Logic
                </CardTitle>
                <CardDescription className="text-[10px]">How MRP calculation operates at an enterprise scale</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs font-bold text-muted-foreground flex-1">
                <div className="bg-secondary/20 p-3 rounded-lg border border-border/30 space-y-2">
                  <p className="text-foreground">📋 Step 1: Demand Intake</p>
                  <p className="text-[10px] leading-relaxed">Scans scheduled production volumes from the shop floor queue.</p>
                </div>
                <div className="bg-secondary/20 p-3 rounded-lg border border-border/30 space-y-2">
                  <p className="text-foreground">📐 Step 2: Recipe Expansion</p>
                  <p className="text-[10px] leading-relaxed">Multiplies lot volumes by active discrete or process BOM ingredient quantities.</p>
                </div>
                <div className="bg-secondary/20 p-3 rounded-lg border border-border/30 space-y-2">
                  <p className="text-foreground">⚡ Step 3: Stock Differential</p>
                  <p className="text-[10px] leading-relaxed">Runs inventory comparisons, drafts requisitions, and generates purchase drafts instantly.</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 5: SHOP FLOOR EXECUTION & PROGRESS ROUTING
          ---------------------------------------------------- */}
      {activeTab === "production" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">Shop Floor Progress Routing</h2>
              <p className="text-xs text-muted-foreground font-semibold">Monitor active factory operations, machinery lines, and progress batches</p>
            </div>
            <Button onClick={() => setIsJobModalOpen(true)} className="flex items-center gap-1 cursor-pointer">
              <Play className="w-4 h-4" /> Launch Production Job
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(job => {
              const matchBom = boms.find(b => b.id === job.bomId);
              const stages = matchBom ? matchBom.stages : ["Mixing", "QC"];
              const currentIndex = stages.indexOf(job.stage);
              const isCompleted = job.status === "completed";

              return (
                <Card key={job.id} className="border border-border/40 bg-card/45 flex flex-col justify-between">
                  <CardHeader className="p-4 border-b border-border/30 flex flex-row items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                        JOB ID: {job.id}
                      </span>
                      <CardTitle className="text-sm font-black mt-2">{job.name}</CardTitle>
                      <CardDescription className="text-[10px]">Scheduled Qty: {job.qty} units</CardDescription>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      job.status === "processing" ? "bg-amber-500/10 text-amber-500 animate-pulse animate-duration-1000" :
                      job.status === "qc" ? "bg-purple/10 text-purple" :
                      "bg-emerald-500/10 text-emerald-500"
                    }`}>
                      {job.status.toUpperCase()}
                    </span>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    
                    {/* Machine parameters */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-muted-foreground bg-secondary/15 p-2.5 rounded-lg border border-border/20">
                      <div>
                        <span>Work Station:</span>
                        <p className="text-foreground truncate">{job.activeMachine}</p>
                      </div>
                      <div>
                        <span>Operator Team:</span>
                        <p className="text-foreground truncate">{job.workerRoster}</p>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-extrabold uppercase">
                        <span className="text-primary truncate">Active Phase: {job.stage}</span>
                        <span className="text-muted-foreground">
                          {isCompleted ? "100%" : `${Math.floor(((currentIndex + 1) / stages.length) * 100)}%`}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300" 
                          style={{ width: isCompleted ? "100%" : `${((currentIndex + 1) / stages.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    {!isCompleted && (
                      <Button 
                        onClick={() => handleProgressStage(job.id)}
                        variant="secondary"
                        className="w-full text-xs font-black bg-secondary hover:bg-secondary/80 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {job.status === "processing" ? (
                          <>
                            <Hammer className="w-3.5 h-3.5" /> Progress stage Routing
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5" /> Inspect in QA Module
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 6: MATERIAL REVIEW BOARD (MRB) QUALITY COMPLIANCE
          ---------------------------------------------------- */}
      {activeTab === "qc" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black uppercase tracking-wider">Quality Assurance & MRB Workflow</h2>
            <p className="text-xs text-muted-foreground font-semibold">Perform chemical lot certifications, audit defective parts, and execute MRB dispositions</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* QC Queue Lot Auditing */}
            <Card className="border border-border/40 bg-card/45">
              <CardHeader className="p-4 border-b border-border/30">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple" /> Active Lot Quality Inspections
                </CardTitle>
                <CardDescription className="text-[10px]">Schedules waiting for laboratory assays and dimensional tolerance certifications</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Lot Item</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Volume</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Pass/Fail</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100 text-right">QC Decision</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qcQueue.map(qc => (
                      <TableRow key={qc.id} className="hover:bg-secondary/20">
                        <TableCell className="font-bold">
                          {qc.name}
                          <p className="text-[9px] text-muted-foreground font-mono">{qc.id} · Job: {qc.jobId}</p>
                        </TableCell>
                        <TableCell className="font-semibold">{qc.totalQty} Units</TableCell>
                        <TableCell>
                          {qc.status === "completed" ? (
                            <span className="text-[10px] font-bold text-emerald-500">
                              ✓ {qc.passedQty} Pass · ✗ {qc.rejectedQty} Fail
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                              WAITING LABORATORY
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {qc.status === "completed" ? (
                            <span className="text-xs font-semibold text-muted-foreground">Certified Logs</span>
                          ) : (
                            <Button 
                              onClick={() => handleOpenQcForm(qc)}
                              size="sm" 
                              className="text-[10px] font-black h-7 px-2.5 cursor-pointer"
                            >
                              Certify Lot
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Rework & MRB Disposition Queue */}
            <Card className="border border-border/40 bg-card/45">
              <CardHeader className="p-4 border-b border-border/30">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-amber-500" /> Material Review Board (MRB) Lane
                </CardTitle>
                <CardDescription className="text-[10px]">Failed lot segments routed through rework, downgrade B-grade, or vendor returns</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Failed Lot</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Defect Volume</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Defect Code</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Disposition</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reworkQueue.map(rew => {
                      const isPending = rew.status === "reworking";
                      return (
                        <TableRow key={rew.id} className="hover:bg-secondary/20">
                          <TableCell className="font-bold">
                            {rew.name}
                            <p className="text-[9px] text-muted-foreground font-mono">{rew.id}</p>
                          </TableCell>
                          <TableCell className="font-bold text-destructive">{rew.qty} Units</TableCell>
                          <TableCell className="font-semibold text-muted-foreground text-xs">{rew.failureCode}</TableCell>
                          <TableCell className="font-bold text-xs text-primary">{rew.disposition}</TableCell>
                          <TableCell className="text-right">
                            {isPending ? (
                              <div className="flex justify-end gap-1.5">
                                <Button 
                                  onClick={() => handleActionRework(rew.id, "rework")}
                                  size="sm" 
                                  variant="secondary" 
                                  className="text-[9px] font-black h-7 px-2 bg-secondary hover:bg-emerald-500/10 hover:text-emerald-500 cursor-pointer"
                                >
                                  Calibrate
                                </Button>
                                <Button 
                                  onClick={() => handleActionRework(rew.id, "scrap")}
                                  size="sm" 
                                  variant="destructive" 
                                  className="text-[9px] font-black h-7 px-2 cursor-pointer"
                                >
                                  Scrap
                                </Button>
                              </div>
                            ) : (
                              <span className={`text-[10px] font-extrabold uppercase ${rew.status.includes("scrap") ? "text-destructive" : "text-emerald-500"}`}>
                                {rew.status}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 7: FLEET DISPATCH & FREIGHT LOGISTICS
          ---------------------------------------------------- */}
      {activeTab === "dispatch" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider">Freight Waybills & Dispatch</h2>
              <p className="text-xs text-muted-foreground font-semibold">Track multimodal shipping carrier dispatches and print custom excise Delivery Challans</p>
            </div>
            <Button onClick={() => setIsDispatchModalOpen(true)} className="flex items-center gap-1 cursor-pointer">
              <Plus className="w-4 h-4" /> Authorize Dispatch Waybill
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Waybills grid */}
            <Card className="lg:col-span-2 border border-border/40 bg-card/45">
              <CardHeader className="p-4 border-b border-border/30">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> Delivery Challans & Transporter Waybills
                </CardTitle>
                <CardDescription className="text-[10px]">Active freighter and ocean/rail shipments leaving shipping docks</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Dealer Client</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Finished Cargo</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">freight Mode</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Transporter Fleet</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100">Excise EWay Bill</TableHead>
                      <TableHead className="font-black text-slate-800 dark:text-slate-100 text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatchOrders.map(dsp => (
                      <TableRow key={dsp.id} className="hover:bg-secondary/20">
                        <TableCell className="font-bold">
                          {dsp.client}
                          <p className="text-[9px] text-muted-foreground">{dsp.date}</p>
                        </TableCell>
                        <TableCell className="font-semibold text-xs">
                          {dsp.qty} units of
                          <p className="font-bold text-foreground text-[11px]">{dsp.product}</p>
                        </TableCell>
                        <TableCell className="font-bold text-xs text-primary">{dsp.freightMode}</TableCell>
                        <TableCell className="text-xs font-semibold">
                          <p className="font-mono">{dsp.vehicleNo}</p>
                          <p className="text-muted-foreground text-[9px] truncate">Driver: {dsp.driver} · Seal: {dsp.sealId}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold text-primary">{dsp.ewayBill}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                            {dsp.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Interactive SVG cargo path map */}
            <Card className="border border-border/40 bg-card/45">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" /> Multimodal Freight Transit Map
                </CardTitle>
                <CardDescription className="text-[10px]">Real-time tracking of active shipments traversing logistical nodes</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                
                {/* SVG logistical route map */}
                <div className="relative h-44 bg-secondary/35 border border-border/30 rounded-xl overflow-hidden flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 300 150">
                    <path d="M 30,75 Q 120,20 180,75 T 270,75" fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeDasharray="5,5" />
                    <path d="M 30,75 Q 120,20 180,75 T 270,75" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray="100,200" strokeDashoffset={telemetryTicks * 5} />
                    
                    <circle cx="30" cy="75" r="7" fill="hsl(var(--primary))" />
                    <text x="20" y="95" fontSize="8" fontWeight="bold" fill="currentColor">FACTORY</text>

                    <circle cx="180" cy="75" r="5" fill="hsl(var(--muted-foreground))" />
                    <text x="160" y="95" fontSize="7" fontWeight="bold" fill="currentColor">HUB PORT</text>

                    <circle cx="270" cy="75" r="7" fill="#10b981" className="animate-pulse" />
                    <text x="250" y="95" fontSize="8" fontWeight="bold" fill="currentColor">DEALER</text>

                    {/* Active dynamic moving node */}
                    <circle cx={40 + (telemetryTicks % 40) * 5} cy={75 + Math.sin(telemetryTicks / 2) * 15} r="5" fill="#f59e0b" />
                  </svg>
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] font-bold text-slate-400 bg-card/85 backdrop-blur px-2.5 py-1 rounded border border-border/20">
                    <span>freighters: {dispatchOrders.length}</span>
                    <span className="text-emerald-500 animate-pulse font-black">● LOGISTICS FEED ONLINE</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {dispatchOrders.map((d, idx) => (
                    <div key={idx} className="bg-secondary/15 p-2 rounded border border-border/20 text-[10px] font-bold">
                      <div className="flex justify-between items-center mb-1">
                        <span>{d.vehicleNo} ({d.freightMode})</span>
                        <span className="text-primary">{d.ewayBill}</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, d.routeProgress + (telemetryTicks * 3) % 90)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          FORM DIALOG MODALS
          ---------------------------------------------------- */}

      {/* 1. Raw Stock Inward */}
      <Dialog open={isRawModalOpen} onOpenChange={setIsRawModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase">Log Inward Raw Stock</DialogTitle>
            <DialogDescription className="text-xs">Record incoming supply batches and map warehouse shelving bins.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Material Name *</Label>
              <Input placeholder="Structural Cold Rolled Steel Sheet" value={rawForm.name} onChange={e => setRawForm({ ...rawForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">SKU Code *</Label>
                <Input placeholder="RM-STL-102" value={rawForm.sku} onChange={e => setRawForm({ ...rawForm, sku: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Unit of Measure (UOM)</Label>
                <Select value={rawForm.unit} onValueChange={v => setRawForm({ ...rawForm, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="rolls">Rolls (rolls)</SelectItem>
                    <SelectItem value="liters">Liters (L)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Opening Qty</Label>
                <Input type="number" value={rawForm.stock} onChange={e => setRawForm({ ...rawForm, stock: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Cost/Unit (₹)</Label>
                <Input type="number" value={rawForm.cost} onChange={e => setRawForm({ ...rawForm, cost: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Alert Limit</Label>
                <Input type="number" value={rawForm.reorderLevel} onChange={e => setRawForm({ ...rawForm, reorderLevel: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Supplier Vendor Mapping</Label>
                <Input placeholder="Apex Steel Sourcing" value={rawForm.supplier} onChange={e => setRawForm({ ...rawForm, supplier: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Shelving Location bin</Label>
                <Input placeholder="Aisle 15, Shelf 2, Bin C1" value={rawForm.location} onChange={e => setRawForm({ ...rawForm, location: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsRawModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRawMaterial}>Log Stock Inward</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. BOM Compiler */}
      <Dialog open={isBomModalOpen} onOpenChange={setIsBomModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase">Compile BOM & Recipe Formula</DialogTitle>
            <DialogDescription className="text-xs">Map structured production ingredients and manufacturing work centers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Recipe/BOM Name *</Label>
                <Input placeholder="Heavy Turbine Rotor Formula" value={bomForm.name} onChange={e => setBomForm({ ...bomForm, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Recipe Method Type</Label>
                <Select value={bomForm.type} onValueChange={v => setBomForm({ ...bomForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discrete">Discrete Assembly Parts</SelectItem>
                    <SelectItem value="process">Process Chemical Recipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Target Finished Goods Stock SKU *</Label>
              <Select value={bomForm.targetProductId} onValueChange={v => setBomForm({ ...bomForm, targetProductId: v })}>
                <SelectTrigger><SelectValue placeholder="Select target finished catalog product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ingredients Inclusion */}
            <div className="border border-border/40 p-3 rounded-lg bg-secondary/15 space-y-3">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Include Ingredient Component</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Select value={selectedRawInput} onValueChange={setSelectedRawInput}>
                    <SelectTrigger><SelectValue placeholder="Select raw asset" /></SelectTrigger>
                    <SelectContent>
                      {rawMaterials.map(rm => (
                        <SelectItem key={rm.id} value={rm.id}>{rm.name} ({rm.stock} {rm.unit})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input type="number" placeholder="Qty Ratio" value={selectedRawQtyInput} onChange={e => setSelectedRawQtyInput(e.target.value)} />
              </div>
              <Button onClick={handleAddMaterialToBom} variant="secondary" className="w-full text-xs font-black h-8 bg-secondary">
                <Plus className="w-3.5 h-3.5" /> Add Component
              </Button>

              {bomForm.materials.length > 0 && (
                <div className="space-y-1 bg-card p-2 rounded border border-border/20 text-xs">
                  {bomForm.materials.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center font-bold text-[10px]">
                      <span>{m.name}</span>
                      <span className="text-primary">{m.qty} {m.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Coproduct / Reusable Scrap Name</Label>
                <Input placeholder="Metal Sheet Shards Scrap" value={bomForm.coproductsName} onChange={e => setBomForm({ ...bomForm, coproductsName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Scrap Qty</Label>
                  <Input type="number" placeholder="2" value={bomForm.coproductsQty} onChange={e => setBomForm({ ...bomForm, coproductsQty: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Scrap Unit</Label>
                  <Input placeholder="kg" value={bomForm.coproductsUnit} onChange={e => setBomForm({ ...bomForm, coproductsUnit: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Standard Labor Cost (₹)</Label>
                <Input type="number" placeholder="1500" value={bomForm.laborCost} onChange={e => setBomForm({ ...bomForm, laborCost: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Overhead Machine Allocation (₹)</Label>
                <Input type="number" placeholder="600" value={bomForm.overheadCost} onChange={e => setBomForm({ ...bomForm, overheadCost: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Allocated Work Centers (e.g. Forge 12)</Label>
                <Input placeholder="Work Center 10, Work Center 15" value={bomForm.workCenters} onChange={e => setBomForm({ ...bomForm, workCenters: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Routing Operations Stages</Label>
                <Input placeholder="Blending, Shaping, Packaging" value={bomForm.stages} onChange={e => setBomForm({ ...bomForm, stages: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsBomModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBom}>Compile SCM Recipe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Launch Jobs */}
      <Dialog open={isJobModalOpen} onOpenChange={setIsJobModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase">Initiate Production Job Lot</DialogTitle>
            <DialogDescription className="text-xs">Launch real-time conveyor runs and allocate operators for a compiled BOM recipe.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Select Active Recipe BOM *</Label>
              <Select value={jobForm.bomId} onValueChange={v => setJobForm({ ...jobForm, bomId: v })}>
                <SelectTrigger><SelectValue placeholder="Select compiled formula recipe" /></SelectTrigger>
                <SelectContent>
                  {boms.map(bom => (
                    <SelectItem key={bom.id} value={bom.id}>{bom.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Target Lot Volume *</Label>
                <Input type="number" value={jobForm.qty} onChange={e => setJobForm({ ...jobForm, qty: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Scheduled Job Date</Label>
                <Input type="date" value={jobForm.scheduledDate} onChange={e => setJobForm({ ...jobForm, scheduledDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Active Machinery Station</Label>
                <Input placeholder="Forge Line Extruder A3" value={jobForm.activeMachine} onChange={e => setJobForm({ ...jobForm, activeMachine: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Operator Shift Team</Label>
                <Input placeholder="Shift Alpha Crew" value={jobForm.workerRoster} onChange={e => setJobForm({ ...jobForm, workerRoster: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsJobModalOpen(false)}>Cancel</Button>
            <Button onClick={handleLaunchProductionJob}>Deduct Raw & Launch Lot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Quality Lots Certify */}
      <Dialog open={isQcModalOpen} onOpenChange={setIsQcModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase">Quality Assurance Certification & MRB Board</DialogTitle>
            <DialogDescription className="text-xs">Certify passed lots and choose disposition pathways for failed materials.</DialogDescription>
          </DialogHeader>
          {activeQcItem && (
            <div className="space-y-4 py-2">
              <div className="bg-secondary/25 p-3 rounded-lg border border-border/30 text-xs font-bold space-y-1">
                <p>Inspection Target: {activeQcItem.name}</p>
                <p>Lot Volume: {activeQcItem.totalQty} Units</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Passed Good Units *</Label>
                  <Input type="number" value={qcForm.passedQty} onChange={e => setQcForm({ ...qcForm, passedQty: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Failed Defective Units *</Label>
                  <Input type="number" value={qcForm.rejectedQty} onChange={e => setQcForm({ ...qcForm, rejectedQty: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Standard Defect Code (If failures &gt; 0)</Label>
                  <Select value={qcForm.failureCode} onValueChange={v => setQcForm({ ...qcForm, failureCode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DF-01: Structural Fracture">DF-01: Structural Fracture</SelectItem>
                      <SelectItem value="DF-02: Chemical Density Impurity">DF-02: Chemical Density Impurity</SelectItem>
                      <SelectItem value="DF-03: Dimension Specs Out">DF-03: Dimension Specs Out</SelectItem>
                      <SelectItem value="DF-04: Packaging Leak">DF-04: Packaging Leak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">MRB Board Disposition (Failures)</Label>
                  <Select value={qcForm.disposition} onValueChange={v => setQcForm({ ...qcForm, disposition: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rework">Rework & Reprocess Lot</SelectItem>
                      <SelectItem value="Scrap">Scrap & Write-Off Materials</SelectItem>
                      <SelectItem value="Downgrade">Downgrade to B-Grade Discount Stock</SelectItem>
                      <SelectItem value="Return to Vendor">Return raw lot parts to Supplier Vendor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Lead Laboratory Inspector Signature *</Label>
                <Input placeholder="Dr. S. Roy, QA Lead Specialist" value={qcForm.inspector} onChange={e => setQcForm({ ...qcForm, inspector: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsQcModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitQc}>Certify QA & execute MRB</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Waybill Dispatch */}
      <Dialog open={isDispatchModalOpen} onOpenChange={setIsDispatchModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase">Authorize Freight Dispatch Waybill</DialogTitle>
            <DialogDescription className="text-xs">Map transporter carriers, container seal IDs, and deduct finished warehouse stocks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Wholesale Client / Dealer Company *</Label>
              <Input placeholder="Delhi Aerospace & Spares Ltd" value={dispatchForm.client} onChange={e => setDispatchForm({ ...dispatchForm, client: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Select Finished Goods Product *</Label>
                <Select value={dispatchForm.product} onValueChange={v => setDispatchForm({ ...dispatchForm, product: v })}>
                  <SelectTrigger><SelectValue placeholder="Select finished goods product" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.name}>{p.name} ({p.stock} units in storage)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Cargo Quantity *</Label>
                <Input type="number" value={dispatchForm.qty} onChange={e => setDispatchForm({ ...dispatchForm, qty: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] font-bold">Transport Fleet License Plate *</Label>
                <Input placeholder="DL-01-AB-1200" value={dispatchForm.vehicleNo} onChange={e => setDispatchForm({ ...dispatchForm, vehicleNo: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Freight Mode</Label>
                <Select value={dispatchForm.freightMode} onValueChange={v => setDispatchForm({ ...dispatchForm, freightMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Road Transport">Road Transport</SelectItem>
                    <SelectItem value="Rail Cargo">Rail Cargo</SelectItem>
                    <SelectItem value="Air Freight">Air Freight</SelectItem>
                    <SelectItem value="Ocean Container">Ocean Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Freighter Driver Name</Label>
                <Input placeholder="Gurmeet Singh" value={dispatchForm.driver} onChange={e => setDispatchForm({ ...dispatchForm, driver: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold">Transporter Container Seal ID</Label>
                <Input placeholder="SEAL-Z110492" value={dispatchForm.sealId} onChange={e => setDispatchForm({ ...dispatchForm, sealId: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDispatchModalOpen(false)}>Cancel</Button>
            <Button onClick={handleLaunchDispatch}>Authorize Dispatch Waybill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
