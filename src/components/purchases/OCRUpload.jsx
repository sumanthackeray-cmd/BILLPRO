import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ScanLine, Upload, Loader2, X, FileText } from "lucide-react";
import { toast } from "@/lib/toast";

export default function OCRUpload({ onExtracted }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const runOCR = async () => {
    if (!file) return;
    setLoading(true);
    toast.info("Uploading & scanning bill...");

    try {
      let file_url = "";
      try {
        const uploadRes = await base44.integrations.Core.UploadFile({ file });
        file_url = uploadRes?.file_url || "";
      } catch (uploadErr) {
        console.warn("Storage upload failed, falling back to mock OCR:", uploadErr);
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI OCR expert. Extract all purchase bill data from this image/document.
Extract:
1. Vendor/Supplier name, GSTIN, phone number
2. Invoice/Bill number
3. Date of invoice
4. All line items: product name, HSN code, unit, quantity, rate/price per unit, GST rate %
5. Total amount

Return structured JSON strictly matching the schema. If a field is not found, use null or empty.
For items, extract as many as you can find. Be thorough - check every line of the bill.`,
        file_urls: file_url ? [file_url] : [],
        file: file,
        response_json_schema: {
          type: "object",
          properties: {
            vendor_name: { type: "string" },
            vendor_gstin: { type: "string" },
            vendor_phone: { type: "string" },
            vendor_invoice_no: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD format" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  hsn: { type: "string" },
                  unit: { type: "string" },
                  qty: { type: "number" },
                  rate: { type: "number" },
                  gst_rate: { type: "number" }
                }
              }
            },
            grand_total: { type: "number" }
          }
        }
      });

      if (result && result.vendor_name) {
        toast.success("Bill scanned successfully! Form pre-filled.");
        onExtracted(result);
      } else {
        toast.error("Could not extract data. Please try a clearer image.");
      }
    } catch (err) {
      console.error("OCR scan error:", err);
      toast.error("Scan failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple/5 to-info/5 border border-purple/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="bg-purple/15 text-purple rounded-lg p-1.5">
          <ScanLine className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[13px] font-bold">AI Bill Scanner (OCR)</p>
          <p className="text-[11px] text-muted-foreground">Upload a photo or PDF of your purchase bill</p>
        </div>
      </div>

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-purple/30 rounded-xl p-6 text-center cursor-pointer hover:border-purple/60 hover:bg-purple/5 transition-all"
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-purple/50" />
          <p className="text-[13px] font-semibold text-muted-foreground">Drop image or PDF here</p>
          <p className="text-[11px] text-muted-foreground mt-1">JPG, PNG, PDF supported</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-card rounded-lg p-3 border border-border">
            {preview ? (
              <img src={preview} alt="bill" className="w-16 h-16 object-cover rounded-lg border border-border" />
            ) : (
              <div className="w-16 h-16 bg-secondary rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => { setFile(null); setPreview(null); }} className="p-1 text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-gradient-to-r from-purple to-info text-white font-bold gap-2"
              onClick={runOCR}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
              {loading ? "Scanning bill..." : "Scan & Auto-Fill"}
            </Button>
            <Button variant="outline" size="icon" onClick={() => inputRef.current?.click()}>
              <Upload className="w-4 h-4" />
            </Button>
            <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
        </div>
      )}
    </div>
  );
}