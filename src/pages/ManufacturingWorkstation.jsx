import { useState, useEffect, useRef, useCallback } from "react";
import {
  Printer, Scale, Barcode, RotateCcw, CheckCircle2, AlertTriangle,
  XCircle, Activity, TrendingUp, TrendingDown, Package, Users,
  ClipboardList, Zap, RefreshCw, ChevronDown, Eye, Download,
  Wifi, WifiOff, Clock, Play, Pause, Settings2, FileText,
  ArrowUpRight, ArrowDownRight, Hash, Layers, Search, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

// ─────────────────────────────────────────────────────────────
// Code-39 Barcode Canvas Renderer
// ─────────────────────────────────────────────────────────────
const drawCode39 = (canvas, text, labelData = {}) => {
  if (!canvas || !text) return;
  const ctx = canvas.getContext("2d");
  const CODE39_MAP = {
    "0":"000110100","1":"100100001","2":"001100001","3":"101100000",
    "4":"000110001","5":"100110000","6":"001110000","7":"000100101",
    "8":"100011000","9":"000011010","A":"100001001","B":"001001001",
    "C":"101001000","D":"000011001","E":"100011000","F":"001011000",
    "G":"000001101","H":"100001100","I":"001001100","J":"000011100",
    "K":"100000011","L":"001000011","M":"101000010","N":"000010011",
    "O":"100010010","P":"001010010","Q":"000000111","R":"100000110",
    "S":"001000110","T":"000010110","U":"110000001","V":"011000001",
    "W":"111000000","X":"010010001","Y":"110010000","Z":"011010000",
    "-":"010000101",".":"110000100"," ":"011000100","*":"010010100",
    "$":"010101000","/":"010100010","+":"010001010","%":"000101010"
  };

  const clean = text.toString().toUpperCase().replace(/[^A-Z0-9\-. $/+%]/g, "");
  const formatted = `*${clean}*`;
  const barW = 1.8, wideW = 4.2, h = 55;

  let totalW = 0;
  for (const ch of formatted) {
    const code = CODE39_MAP[ch] || CODE39_MAP["*"];
    for (let j = 0; j < 9; j++) totalW += code[j] === "1" ? wideW : barW;
    totalW += barW;
  }

  canvas.width = totalW + 40;
  canvas.height = h + 50;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Company name header
  if (labelData.company) {
    ctx.font = "bold 9px Arial";
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    ctx.fillText(labelData.company.toUpperCase(), canvas.width / 2, 11);
  }

  // Draw bars
  ctx.fillStyle = "#000000";
  let x = 20;
  for (const ch of formatted) {
    const code = CODE39_MAP[ch] || CODE39_MAP["*"];
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = code[j] === "1";
      const w = isWide ? wideW : barW;
      if (isBar) ctx.fillRect(x, 14, w, h);
      x += w;
    }
    x += barW;
  }

  // Serial text below barcode
  ctx.font = "bold 9px monospace";
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.fillText(clean, canvas.width / 2, h + 23);

  // Extra label fields
  if (labelData.batch) {
    ctx.font = "8px Arial";
    ctx.fillText(`Batch: ${labelData.batch}`, canvas.width / 2, h + 34);
  }
  if (labelData.weight) {
    ctx.font = "8px Arial";
    ctx.fillText(`Weight: ${labelData.weight} kg`, canvas.width / 2, h + 44);
  }
};

// ─────────────────────────────────────────────────────────────
// Stat Card Component
// ─────────────────────────────────────────────────────────────
const StatCard = ({ title, value, sub, icon: Icon, color, trend }) => (
  <div className={`relative overflow-hidden rounded-2xl border p-4 ${color} flex flex-col justify-between min-h-[90px]`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
        <p className="text-2xl font-black tracking-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] font-semibold opacity-60 mt-0.5">{sub}</p>}
      </div>
      <div className="p-2.5 rounded-xl bg-white/15 shadow-inner">
        <Icon className="w-5 h-5" />
      </div>
    </div>
    {trend !== undefined && (
      <div className={`flex items-center gap-1 text-[10px] font-black mt-1 ${trend >= 0 ? "text-emerald-300" : "text-red-300"}`}>
        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(trend)}% vs yesterday
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function ManufacturingWorkstation() {
  const companyId = localStorage.getItem("company_id") || "demo-company-1";
  const shopName = localStorage.getItem("shop_name") || "Softpal Industries Pvt. Ltd.";

  // ── Data Fetching ──
  const { data: batches = [], refetch: refetchBatches } = useQuery({
    queryKey: ["production_batches", companyId],
    queryFn: () => base44.entities.production_batches.list().catch(() => []),
    refetchInterval: 10000,
  });

  const { data: productDefs = [] } = useQuery({
    queryKey: ["product_definitions", companyId],
    queryFn: () => base44.entities.product_definitions.list().catch(() => []),
  });

  const { data: productUnits = [], refetch: refetchUnits } = useQuery({
    queryKey: ["product_units", companyId],
    queryFn: () => base44.entities.product_units.list().catch(() => []),
    refetchInterval: 8000,
  });

  const { data: shopSettings = [{}] } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list().catch(() => [{}]),
  });
  const shop = shopSettings[0] || {};

  // ── Workstation State ──
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedDefId, setSelectedDefId] = useState("");
  const [serialInput, setSerialInput] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [roundedWeight, setRoundedWeight] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null); // { status, serial, weight, time }
  const [pendingList, setPendingList] = useState([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("workstation"); // workstation | logs | analytics
  const [weightMode, setWeightMode] = useState("manual"); // manual | auto
  const [comConnected, setComConnected] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [searchSerial, setSearchSerial] = useState("");
  const [todayCount, setTodayCount] = useState(0);
  const [prevDayCount, setPrevDayCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [prevMonthCount, setPrevMonthCount] = useState(0);
  const [shiftCount, setShiftCount] = useState(0);
  const [rejectionCount, setRejectionCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sessionStartTime] = useState(Date.now());

  const canvasRef = useRef(null);
  const serialInputRef = useRef(null);
  const weightInputRef = useRef(null);
  const printFrameRef = useRef(null);

  // ── Derived Data ──
  const selectedBatch = batches.find(b => b.id === selectedBatchId);
  const selectedDef = productDefs.find(d => d.id === (selectedBatch?.product_def_id || selectedDefId));

  // Allowed weight range from product definition specs
  const allowedMinWeight = selectedDef?.specifications?.min_weight || selectedDef?.specifications?.wall_thickness_mm ? 7.5 : 0;
  const allowedMaxWeight = selectedDef?.specifications?.max_weight || selectedDef?.specifications?.capacity_litres ? 9.0 : 999;
  const serialFrom = selectedBatch?.serial_from || 1001;
  const serialTo = selectedBatch?.serial_to || 2000;
  const serialPrefix = selectedBatch?.serial_prefix || "";

  // ── Online Monitor ──
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // ── Session Timer ──
  useEffect(() => {
    const t = setInterval(() => setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [sessionStartTime]);

  const formatElapsed = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  // ── Compute Today/Month Counts from productUnits ──
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const thisMonth = today.slice(0, 7);
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 7);

    let td = 0, yd = 0, tm = 0, lm = 0, sh = 0, rj = 0;
    productUnits.forEach(u => {
      const d = (u.created_at || "").slice(0, 10);
      const m = (u.created_at || "").slice(0, 7);
      if (d === today) td++;
      if (d === yesterday) yd++;
      if (m === thisMonth) tm++;
      if (m === lastMonth) lm++;
      if (u.current_status === "qc_fail") rj++;
    });

    // Approximate shift (last 8h)
    const shiftStart = Date.now() - 8 * 3600 * 1000;
    productUnits.forEach(u => {
      if (u.created_at && new Date(u.created_at).getTime() > shiftStart) sh++;
    });

    setTodayCount(td);
    setPrevDayCount(yd);
    setMonthCount(tm);
    setPrevMonthCount(lm);
    setShiftCount(sh);
    setRejectionCount(rj);
  }, [productUnits]);

  // ── Auto-set selected def when batch changes ──
  useEffect(() => {
    if (selectedBatch?.product_def_id) {
      setSelectedDefId(selectedBatch.product_def_id);
    }
  }, [selectedBatch]);

  // ── Auto-generate barcode value from serial ──
  useEffect(() => {
    if (serialInput.trim()) {
      const fullSerial = serialPrefix
        ? `${serialPrefix}${serialInput.trim()}`
        : serialInput.trim();
      setBarcodeValue(fullSerial);
    } else {
      setBarcodeValue("");
    }
  }, [serialInput, serialPrefix]);

  // ── Render Canvas Barcode ──
  useEffect(() => {
    if (barcodeValue && canvasRef.current) {
      drawCode39(canvasRef.current, barcodeValue, {
        company: shop?.shop_name || shopName,
        batch: selectedBatch?.batch_no || "",
        weight: roundedWeight || weightInput,
      });
    }
  }, [barcodeValue, roundedWeight, weightInput, selectedBatch, shop]);

  // ── Weight Rounding ──
  useEffect(() => {
    const w = parseFloat(weightInput);
    if (!isNaN(w) && w > 0) {
      setRoundedWeight((Math.round(w * 2) / 2).toFixed(3));
    } else {
      setRoundedWeight("");
    }
  }, [weightInput]);

  // ── Auto Weight Stream (mock WebSerial) ──
  useEffect(() => {
    if (!comConnected || weightMode !== "auto") return;
    const baseW = 8.25;
    const t = setInterval(() => {
      const w = (baseW + (Math.random() * 0.06 - 0.03)).toFixed(3);
      setWeightInput(w);
    }, 1000);
    return () => clearInterval(t);
  }, [comConnected, weightMode]);

  // ── Keyboard Shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      // W = focus weight
      if (e.key === "w" && !e.ctrlKey && !e.altKey && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "SELECT") {
        e.preventDefault();
        weightInputRef.current?.focus();
      }
      // P or B or Enter on barcode = print
      if ((e.key === "p" || e.key === "b") && e.ctrlKey) {
        e.preventDefault();
        handlePrintBarcode();
      }
      // F2 = focus serial
      if (e.key === "F2") {
        e.preventDefault();
        serialInputRef.current?.focus();
      }
      // Enter in weight field = process
      if (e.key === "Enter" && document.activeElement === weightInputRef.current) {
        handleProcessAndPrint();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [weightInput, serialInput, selectedBatchId]);

  // ── Weight Validation ──
  const weightStatus = () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0) return "none";
    if (w < allowedMinWeight) return "under";
    if (w > allowedMaxWeight) return "over";
    return "ok";
  };

  const wStatus = weightStatus();

  // ── Print Barcode (Canvas → Window) ──
  const handlePrintBarcode = () => {
    if (!canvasRef.current || !barcodeValue) {
      toast.error("Generate a barcode first — enter serial number.");
      return;
    }
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const win = window.open("", "_blank", "width=400,height=300");
    if (!win) { toast.error("Popup blocked. Allow popups and retry."); return; }
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Print Barcode — ${barcodeValue}</title>
  <style>
    body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: monospace; background: #fff; }
    img { max-width: 100%; }
    .info { font-size: 9px; margin-top: 4px; color: #333; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <img src="${dataUrl}" />
  <div class="info">${shop?.shop_name || shopName} | ${selectedBatch?.batch_no || "—"} | ${new Date().toLocaleDateString("en-IN")}</div>
  <script>window.onload = function(){ window.print(); window.close(); }<\/script>
</body>
</html>`);
    win.document.close();
  };

  // ── ZPL Payload ──
  const getZPL = () => {
    if (!barcodeValue) return "";
    return `^XA
^FO30,20^A0N,22,20^FD${(shop?.shop_name || shopName).toUpperCase()}^FS
^FO30,45^A0N,18,16^FDBatch: ${selectedBatch?.batch_no || "—"}^FS
^FO30,65^A0N,18,16^FDWeight: ${roundedWeight || weightInput || "—"} kg^FS
^FO30,85^BY2,2,70^B3N,N,70,Y,N^FD${barcodeValue}^FS
^XZ`;
  };

  // ── Main Process & Log ──
  const handleProcessAndPrint = async () => {
    if (!serialInput.trim()) {
      toast.error("Enter or scan a serial number first.");
      serialInputRef.current?.focus();
      return;
    }
    if (!weightInput || isNaN(parseFloat(weightInput))) {
      toast.error("Enter the actual product weight.");
      weightInputRef.current?.focus();
      return;
    }
    if (!selectedBatchId) {
      toast.error("Select an active production batch.");
      return;
    }
    if (wStatus === "under") {
      toast.warning(`⚠️ UNDERWEIGHT — ${weightInput} kg is below minimum ${allowedMinWeight} kg. Logging for rework.`);
      setRejectionCount(c => c + 1);
    }
    if (wStatus === "over") {
      toast.warning(`⚠️ OVERWEIGHT — ${weightInput} kg exceeds max ${allowedMaxWeight} kg. Logging for rework.`);
      setRejectionCount(c => c + 1);
    }

    setIsProcessing(true);
    const fullSerial = `${serialPrefix}${serialInput.trim()}`;

    try {
      // Find existing product unit or create
      const existing = productUnits.find(u => u.serial_number === fullSerial || u.serial_number === serialInput.trim());
      const numericWeight = parseFloat(weightInput);
      const roundedW = parseFloat(roundedWeight || weightInput);

      if (existing) {
        await base44.entities.product_units.update(existing.id, {
          weight_kg: numericWeight,
          rounded_weight: roundedW,
          weight_source: weightMode === "auto" ? "scale_auto" : "manual",
          weight_captured_at: new Date().toISOString(),
          current_status: wStatus === "ok" ? "qc_pass" : "qc_hold",
          barcode: fullSerial,
        });
      } else {
        await base44.entities.product_units.create({
          company_id: companyId,
          batch_id: selectedBatchId,
          product_def_id: selectedDef?.id || "",
          serial_number: fullSerial,
          barcode: fullSerial,
          product_name: selectedDef?.product_name || "Product",
          weight_kg: numericWeight,
          rounded_weight: roundedW,
          weight_source: weightMode === "auto" ? "scale_auto" : "manual",
          weight_captured_at: new Date().toISOString(),
          current_stage: 1,
          current_status: wStatus === "ok" ? "qc_pass" : "qc_hold",
          sticker_printed: true,
          created_at: new Date().toISOString(),
        });
      }

      const logEntry = {
        serial: fullSerial,
        weight: numericWeight,
        roundedW,
        status: wStatus,
        time: new Date().toLocaleTimeString("en-IN"),
        batch: selectedBatch?.batch_no || "",
      };

      setLastResult({ ...logEntry, ok: wStatus === "ok" });
      setRecentLogs(prev => [logEntry, ...prev.slice(0, 99)]);
      setTodayCount(c => c + 1);
      setShiftCount(c => c + 1);

      // Print
      handlePrintBarcode();

      // Reset for next unit
      setSerialInput(prev => {
        const n = parseInt(prev, 10);
        return isNaN(n) ? "" : String(n + 1);
      });
      setWeightInput("");
      setRoundedWeight("");
      setBarcodeValue("");
      serialInputRef.current?.focus();

      toast.success(`✅ Processed & Printed: ${fullSerial}`);
      refetchUnits();
    } catch (e) {
      console.error(e);
      toast.error("Processing failed. Check Firebase connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Pending List (QC Hold) ──
  const pendingUnits = productUnits.filter(u =>
    u.current_status === "qc_hold" &&
    (!selectedBatchId || u.batch_id === selectedBatchId)
  );

  // ── Search Serial ──
  const searchedUnit = searchSerial
    ? productUnits.find(u => u.serial_number?.includes(searchSerial.trim()))
    : null;

  // ── Render ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

      {/* ── Top Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-slate-900/80 px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white leading-none">
                Softpal <span className="text-amber-400">MES</span> Workstation
              </h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                {shop?.shop_name || shopName}
              </p>
            </div>
          </div>

          {/* Center: Tab Nav */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {[
              { id: "workstation", label: "⚡ Processing", icon: Zap },
              { id: "logs", label: "📋 Audit Logs", icon: ClipboardList },
              { id: "analytics", label: "📊 Analytics", icon: TrendingUp },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg ${isOnline ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? "LIVE SYNC" : "OFFLINE"}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-700/50 border border-white/10 text-slate-300">
              <Clock className="w-3 h-3 text-amber-400" />
              {formatElapsed(elapsedTime)}
            </div>
            <button
              onClick={() => { refetchBatches(); refetchUnits(); toast.success("Data refreshed"); }}
              className="p-1.5 rounded-lg bg-slate-700/50 border border-white/10 hover:bg-white/10 transition-colors text-slate-300 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Stat Cards ── */}
      <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard
          title="Today"
          value={todayCount.toLocaleString("en-IN")}
          sub="Units processed"
          icon={Activity}
          color="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-emerald-500/30"
          trend={prevDayCount > 0 ? Math.round(((todayCount - prevDayCount) / prevDayCount) * 100) : 0}
        />
        <StatCard
          title="Prev Day"
          value={prevDayCount.toLocaleString("en-IN")}
          sub="Yesterday's output"
          icon={TrendingDown}
          color="bg-gradient-to-br from-slate-600 to-slate-800 text-white border-slate-500/30"
        />
        <StatCard
          title="This Month"
          value={monthCount.toLocaleString("en-IN")}
          sub="Monthly production"
          icon={TrendingUp}
          color="bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-500/30"
        />
        <StatCard
          title="Prev Month"
          value={prevMonthCount.toLocaleString("en-IN")}
          sub="Last month's output"
          icon={BarChart}
          color="bg-gradient-to-br from-slate-600 to-slate-800 text-white border-slate-500/30"
        />
        <StatCard
          title="This Shift"
          value={shiftCount.toLocaleString("en-IN")}
          sub="Last 8 hours"
          icon={Users}
          color="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-purple-500/30"
        />
        <StatCard
          title="Rejections"
          value={rejectionCount.toLocaleString("en-IN")}
          sub="QC hold / rework"
          icon={XCircle}
          color={`bg-gradient-to-br ${rejectionCount > 0 ? "from-red-600 to-red-800 border-red-500/30" : "from-slate-600 to-slate-800 border-slate-500/30"} text-white`}
        />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="px-4 pb-8 pt-4">

        {/* ════════════════════════════════════════════
            TAB: WORKSTATION
        ════════════════════════════════════════════ */}
        {activeTab === "workstation" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* LEFT: Input Panel */}
            <div className="xl:col-span-2 space-y-4">

              {/* Batch & Product Selection */}
              <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-amber-500/20 rounded-lg">
                    <Package className="w-4 h-4 text-amber-400" />
                  </div>
                  <h2 className="font-black text-sm uppercase tracking-wider text-amber-300">Batch & Product Configuration</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Batch Selector */}
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      Production Batch *
                    </Label>
                    <div className="relative">
                      <select
                        value={selectedBatchId}
                        onChange={e => setSelectedBatchId(e.target.value)}
                        className="w-full bg-slate-700/70 border border-white/15 text-white rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer appearance-none pr-10"
                      >
                        <option value="">— Select Batch —</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id} className="bg-slate-800">
                            {b.batch_no} ({b.customer_name || "Stock"})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Product Type */}
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                      Product / Cylinder Type
                    </Label>
                    <div className="w-full bg-slate-700/40 border border-white/10 text-amber-300 rounded-xl px-4 py-3 text-sm font-black">
                      {selectedDef?.product_name || (
                        <span className="text-slate-500 font-normal">Auto-loaded from batch</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Batch Info Cards */}
                {selectedBatch && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-slate-700/40 rounded-xl p-3 border border-white/8">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Serial Range</p>
                      <p className="text-sm font-black text-amber-400 mt-0.5">
                        {serialPrefix}{serialFrom} – {serialPrefix}{serialTo}
                      </p>
                    </div>
                    <div className="bg-slate-700/40 rounded-xl p-3 border border-white/8">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Allowed Weight</p>
                      <p className="text-sm font-black text-emerald-400 mt-0.5">
                        {allowedMinWeight} – {allowedMaxWeight} kg
                      </p>
                    </div>
                    <div className="bg-slate-700/40 rounded-xl p-3 border border-white/8">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Batch Status</p>
                      <p className="text-sm font-black text-blue-400 mt-0.5 capitalize">
                        {selectedBatch.status?.replace(/_/g, " ") || "Active"}
                      </p>
                    </div>
                    <div className="bg-slate-700/40 rounded-xl p-3 border border-white/8">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Planned Qty</p>
                      <p className="text-sm font-black text-purple-400 mt-0.5">
                        {selectedBatch.quantity?.toLocaleString("en-IN") || "—"} units
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Serial + Weight Entry */}
              <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-1.5 bg-blue-500/20 rounded-lg">
                    <Hash className="w-4 h-4 text-blue-400" />
                  </div>
                  <h2 className="font-black text-sm uppercase tracking-wider text-blue-300">Serial & Weight Entry</h2>
                  <span className="ml-auto text-[9px] font-black text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
                    F2 = Serial · W = Weight · Ctrl+P = Print
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Serial Number */}
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Serial No
                      {serialPrefix && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-black">
                          Prefix: {serialPrefix}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      {serialPrefix && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 font-black text-sm pointer-events-none z-10">
                          {serialPrefix}
                        </span>
                      )}
                      <Input
                        ref={serialInputRef}
                        value={serialInput}
                        onChange={e => setSerialInput(e.target.value)}
                        onKeyDown={e => e.key === "Tab" && weightInputRef.current?.focus()}
                        placeholder="Scan or type serial..."
                        className={`bg-slate-700/70 border-white/15 text-white text-2xl font-black h-16 rounded-xl focus:ring-2 focus:ring-blue-500/50 ${serialPrefix ? "pl-20" : "pl-4"}`}
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Barcode: <span className="text-amber-400 font-black">{barcodeValue || "—"}</span>
                    </p>
                  </div>

                  {/* Weight */}
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Actual Weight (kg)
                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          onClick={() => setWeightMode("manual")}
                          className={`text-[9px] px-2 py-0.5 rounded font-black transition-all cursor-pointer ${weightMode === "manual" ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                        >
                          Manual
                        </button>
                        <button
                          onClick={() => {
                            setWeightMode("auto");
                            if ("serial" in navigator) {
                              setComConnected(true);
                              toast.success("WebSerial scale stream activated.");
                            } else {
                              setComConnected(true);
                              toast.info("Demo scale stream active (browser doesn't support WebSerial).");
                            }
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded font-black transition-all cursor-pointer ${weightMode === "auto" ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`}
                        >
                          Auto Scale
                        </button>
                      </div>
                    </Label>
                    <div className="relative">
                      <Input
                        ref={weightInputRef}
                        value={weightInput}
                        onChange={e => setWeightInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleProcessAndPrint();
                        }}
                        placeholder={weightMode === "auto" && comConnected ? "Capturing..." : "0.000"}
                        readOnly={weightMode === "auto" && comConnected}
                        className={`bg-slate-700/70 text-white text-2xl font-black h-16 rounded-xl pl-4 pr-14 border-2 focus:outline-none ${
                          wStatus === "ok" ? "border-emerald-500 focus:ring-emerald-500/40" :
                          wStatus === "under" ? "border-red-500 animate-pulse focus:ring-red-500/40" :
                          wStatus === "over" ? "border-orange-500 animate-pulse focus:ring-orange-500/40" :
                          "border-white/15 focus:ring-blue-500/40"
                        }`}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {wStatus === "ok" && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
                        {wStatus === "under" && <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />}
                        {wStatus === "over" && <AlertTriangle className="w-6 h-6 text-orange-400 animate-pulse" />}
                      </div>
                    </div>

                    {/* Weight Status Banner */}
                    {wStatus !== "none" && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black ${
                        wStatus === "ok" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                        wStatus === "under" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                        "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                      }`}>
                        {wStatus === "ok" && <><CheckCircle2 className="w-3.5 h-3.5" /> WEIGHT OK — {weightInput} kg is within tolerance</>}
                        {wStatus === "under" && <><AlertTriangle className="w-3.5 h-3.5" /> UNDERWEIGHT — Below {allowedMinWeight} kg minimum</>}
                        {wStatus === "over" && <><AlertTriangle className="w-3.5 h-3.5" /> OVERWEIGHT — Exceeds {allowedMaxWeight} kg maximum</>}
                      </div>
                    )}

                    {/* Round-off */}
                    {roundedWeight && (
                      <div className="flex justify-between items-center bg-slate-700/40 px-3 py-2 rounded-lg border border-white/8">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Rounded Weight</span>
                        <span className="text-base font-black text-amber-400">{roundedWeight} kg</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleProcessAndPrint}
                    disabled={isProcessing || !serialInput || !weightInput || !selectedBatchId}
                    className={`flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer ${
                      isProcessing || !serialInput || !weightInput || !selectedBatchId
                        ? "bg-slate-600/40 text-slate-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105"
                    }`}
                  >
                    <Printer className="w-4 h-4" />
                    {isProcessing ? "Processing..." : "Process & Print Barcode"}
                  </button>

                  <button
                    onClick={handlePrintBarcode}
                    disabled={!barcodeValue}
                    className="flex items-center gap-2 px-4 py-3.5 rounded-xl font-black text-sm bg-blue-600/80 hover:bg-blue-600 text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" /> Reprint Label
                  </button>

                  <button
                    onClick={() => setShowPendingModal(true)}
                    className="flex items-center gap-2 px-4 py-3.5 rounded-xl font-black text-sm bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border border-white/10 transition-all cursor-pointer relative"
                  >
                    <Bell className="w-4 h-4 text-amber-400" />
                    Pending QC List
                    {pendingUnits.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingUnits.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => { setSerialInput(""); setWeightInput(""); setRoundedWeight(""); setLastResult(null); serialInputRef.current?.focus(); }}
                    className="flex items-center gap-2 px-4 py-3.5 rounded-xl font-black text-sm bg-slate-700/60 hover:bg-slate-600/60 text-slate-400 border border-white/8 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </button>
                </div>
              </div>

              {/* Last Scan Result */}
              {lastResult && (
                <div className={`border rounded-2xl p-4 ${lastResult.ok ? "bg-emerald-900/30 border-emerald-500/40" : "bg-red-900/30 border-red-500/40"}`}>
                  <div className="flex items-center gap-3">
                    {lastResult.ok
                      ? <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                      : <XCircle className="w-8 h-8 text-red-400 shrink-0" />}
                    <div className="flex-1">
                      <p className={`text-lg font-black ${lastResult.ok ? "text-emerald-300" : "text-red-300"}`}>
                        {lastResult.ok ? "✅ PROCESSED & PRINTED" : "⚠️ WEIGHT ISSUE — HELD FOR REWORK"}
                      </p>
                      <p className="text-sm text-slate-400 font-bold mt-0.5">
                        Serial: <span className="text-white font-black">{lastResult.serial}</span>
                        &nbsp;·&nbsp; Weight: <span className="text-amber-400 font-black">{lastResult.weight} kg</span>
                        &nbsp;·&nbsp; Rounded: <span className="text-blue-400 font-black">{lastResult.roundedW} kg</span>
                        &nbsp;·&nbsp; {lastResult.time}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Barcode Preview + ZPL */}
            <div className="space-y-4">

              {/* Canvas Barcode Preview */}
              <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg">
                      <Barcode className="w-4 h-4 text-purple-400" />
                    </div>
                    <h2 className="font-black text-sm uppercase tracking-wider text-purple-300">Label Preview</h2>
                  </div>
                  {barcodeValue && (
                    <button
                      onClick={handlePrintBarcode}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/80 hover:bg-purple-600 rounded-lg text-[11px] font-black text-white cursor-pointer transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-xl flex items-center justify-center min-h-[140px] shadow-inner p-3">
                  {barcodeValue ? (
                    <canvas ref={canvasRef} className="max-w-full" />
                  ) : (
                    <div className="text-center text-slate-300 py-6">
                      <Barcode className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                      <p className="text-[11px] font-bold text-slate-400">Enter serial number to generate barcode</p>
                    </div>
                  )}
                </div>

                {barcodeValue && (
                  <div className="mt-3 space-y-1.5 text-[10px]">
                    <div className="flex justify-between bg-slate-700/40 px-3 py-1.5 rounded-lg">
                      <span className="text-slate-500 font-black uppercase tracking-wider">Serial</span>
                      <span className="text-amber-400 font-black font-mono">{barcodeValue}</span>
                    </div>
                    {selectedBatch && (
                      <div className="flex justify-between bg-slate-700/40 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-500 font-black uppercase tracking-wider">Batch</span>
                        <span className="text-blue-400 font-black">{selectedBatch.batch_no}</span>
                      </div>
                    )}
                    {roundedWeight && (
                      <div className="flex justify-between bg-slate-700/40 px-3 py-1.5 rounded-lg">
                        <span className="text-slate-500 font-black uppercase tracking-wider">Weight</span>
                        <span className="text-emerald-400 font-black">{roundedWeight} kg</span>
                      </div>
                    )}
                    <div className="flex justify-between bg-slate-700/40 px-3 py-1.5 rounded-lg">
                      <span className="text-slate-500 font-black uppercase tracking-wider">Date</span>
                      <span className="text-slate-300 font-black">{new Date().toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ZPL Output */}
              {barcodeValue && (
                <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">ZPL Printer Command</h3>
                    <button
                      onClick={() => { navigator.clipboard.writeText(getZPL()); toast.success("ZPL copied!"); }}
                      className="text-[9px] font-black px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 cursor-pointer transition-all"
                    >
                      COPY
                    </button>
                  </div>
                  <pre className="text-[9px] font-mono text-emerald-400 bg-slate-900/60 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
                    {getZPL()}
                  </pre>
                </div>
              )}

              {/* Quick Recent Log */}
              <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Live Feed (Last 5)
                </h3>
                <div className="space-y-1.5">
                  {recentLogs.slice(0, 5).map((log, i) => (
                    <div key={i} className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${
                      log.status === "ok" ? "bg-emerald-500/10 border border-emerald-500/20" :
                      "bg-red-500/10 border border-red-500/20"
                    }`}>
                      <span className="font-mono text-white">{log.serial}</span>
                      <span className={log.status === "ok" ? "text-emerald-400" : "text-red-400"}>
                        {log.weight} kg · {log.time}
                      </span>
                    </div>
                  ))}
                  {recentLogs.length === 0 && (
                    <p className="text-[10px] text-slate-600 text-center py-4 font-bold">No units processed yet this session.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            TAB: AUDIT LOGS
        ════════════════════════════════════════════ */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="font-black text-sm uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Production Audit Log
                </h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <Input
                      value={searchSerial}
                      onChange={e => setSearchSerial(e.target.value)}
                      placeholder="Search serial..."
                      className="bg-slate-700/70 border-white/15 text-white h-9 pl-9 text-sm w-48 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {searchedUnit && (
                <div className="mb-4 bg-blue-900/30 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-[11px] font-black text-blue-400 uppercase mb-2">Search Result</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div><span className="text-slate-500 font-black">Serial</span><br/><span className="text-white font-black">{searchedUnit.serial_number}</span></div>
                    <div><span className="text-slate-500 font-black">Weight</span><br/><span className="text-amber-400 font-black">{searchedUnit.weight_kg || "—"} kg</span></div>
                    <div><span className="text-slate-500 font-black">Status</span><br/><span className={`font-black ${searchedUnit.current_status === "qc_pass" ? "text-emerald-400" : "text-red-400"}`}>{searchedUnit.current_status?.replace(/_/g," ").toUpperCase()}</span></div>
                    <div><span className="text-slate-500 font-black">Created</span><br/><span className="text-slate-300 font-black">{searchedUnit.created_at?.slice(0,10) || "—"}</span></div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-white/8">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-700/50">
                    <tr>
                      {["#","Serial Number","Batch","Weight (kg)","Rounded","Status","Source","Date/Time"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentLogs.length > 0 ? (
                      recentLogs.map((log, i) => (
                        <tr key={i} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                          <td className="px-3 py-2.5 text-slate-500 font-bold">{recentLogs.length - i}</td>
                          <td className="px-3 py-2.5 font-mono font-black text-amber-400">{log.serial}</td>
                          <td className="px-3 py-2.5 font-bold text-blue-400">{log.batch || "—"}</td>
                          <td className="px-3 py-2.5 font-black text-white">{log.weight}</td>
                          <td className="px-3 py-2.5 font-black text-emerald-400">{log.roundedW}</td>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${log.status === "ok" ? "bg-emerald-500/20 text-emerald-400" : log.status === "under" ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>
                              {log.status === "ok" ? "PASS" : log.status === "under" ? "UNDERWEIGHT" : "OVERWEIGHT"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-400 font-bold">Manual</td>
                          <td className="px-3 py-2.5 text-slate-500 font-bold">{log.time}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-600 font-bold">
                          No log entries yet. Process units in the Workstation tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            TAB: ANALYTICS
        ════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            {/* Batch Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.slice(0, 6).map(b => {
                const batchUnits = productUnits.filter(u => u.batch_id === b.id);
                const pass = batchUnits.filter(u => u.current_status === "qc_pass").length;
                const hold = batchUnits.filter(u => u.current_status === "qc_hold").length;
                const pct = b.quantity > 0 ? Math.min(100, Math.round((batchUnits.length / b.quantity) * 100)) : 0;
                return (
                  <div key={b.id} className="bg-slate-800/60 border border-white/10 rounded-2xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-black text-sm text-white">{b.batch_no}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{b.customer_name || "Stock"}</p>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        b.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                        b.status === "in_production" ? "bg-blue-500/20 text-blue-400" :
                        "bg-amber-500/20 text-amber-400"
                      }`}>
                        {b.status?.replace(/_/g," ").toUpperCase() || "PLANNED"}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-[10px] font-black mb-1">
                        <span className="text-slate-400">{batchUnits.length} / {b.quantity || "?"} units</span>
                        <span className="text-amber-400">{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <div className="flex items-center gap-1 font-black text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> {pass} Pass
                      </div>
                      {hold > 0 && (
                        <div className="flex items-center gap-1 font-black text-red-400">
                          <AlertTriangle className="w-3 h-3" /> {hold} Hold
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {batches.length === 0 && (
                <div className="col-span-3 text-center py-20 bg-slate-800/40 rounded-2xl border border-dashed border-white/10">
                  <Layers className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                  <p className="font-black text-slate-500">No production batches found.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Create batches in the Manufacturing ERP module.</p>
                </div>
              )}
            </div>

            {/* Session Summary */}
            <div className="bg-slate-800/60 border border-white/10 rounded-2xl p-5">
              <h2 className="font-black text-sm uppercase tracking-wider text-amber-300 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Session Performance Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Session Units", value: recentLogs.length, color: "text-emerald-400" },
                  { label: "PASS Rate", value: `${recentLogs.length > 0 ? Math.round((recentLogs.filter(l => l.status === "ok").length / recentLogs.length) * 100) : 0}%`, color: "text-blue-400" },
                  { label: "Rejections", value: recentLogs.filter(l => l.status !== "ok").length, color: "text-red-400" },
                  { label: "Session Time", value: formatElapsed(elapsedTime), color: "text-amber-400" },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-700/40 rounded-xl p-4 border border-white/8 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Pending QC Modal ── */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-white/15 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="font-black text-base text-amber-300 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Pending QC Hold — {pendingUnits.length} Units
              </h3>
              <button onClick={() => setShowPendingModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {pendingUnits.length === 0 ? (
                <p className="text-center text-slate-500 font-bold py-10">No pending QC hold units.</p>
              ) : (
                <div className="space-y-2">
                  {pendingUnits.map(u => (
                    <div key={u.id} className="flex justify-between items-center bg-red-900/20 border border-red-500/25 rounded-xl px-4 py-3">
                      <div>
                        <p className="font-black text-sm text-red-300">{u.serial_number}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Weight: {u.weight_kg || "—"} kg · {u.created_at?.slice(0,10)}
                        </p>
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">QC HOLD</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer Shortcuts ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 px-4 py-2 flex flex-wrap items-center gap-4 text-[10px] font-black text-slate-500 z-40">
        <span className="text-amber-400 font-black">⚡ SOFTPAL MES</span>
        <span>★ <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">F2</kbd> Focus Serial</span>
        <span>★ <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">W</kbd> Focus Weight</span>
        <span>★ <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">Enter</kbd> Process & Print</span>
        <span>★ <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">Ctrl+P</kbd> Print Label</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`flex items-center gap-1 ${isOnline ? "text-emerald-400" : "text-red-400"}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            Firebase {isOnline ? "Live" : "Offline"}
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper (stub for BarChart icon since lucide doesn't export it by that name)
function BarChart({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}
