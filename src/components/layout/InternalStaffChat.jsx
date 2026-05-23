import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useBackButton } from "@/hooks/useBackButton";
import { base44 } from "@/api/base44Client";
import { db } from "@/api/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy
} from "firebase/firestore";
import { 
  MessageSquare, Send, Paperclip, X, Info,
  Check, CheckCheck, FileText, ChevronRight,
  ShoppingCart, ShieldAlert, Phone, Video,
  Smile, File, Image, Download, Mic, Inbox, Loader2, Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { fmtINR } from "@/lib/gst-utils";
import { cn } from "@/lib/utils";

const ROLE_LABELS = {
  "role-owner": "Owner",
  "role-ceo": "CEO",
  "role-ca": "CA",
  "role-accountant": "Accountant",
  "role-store_manager": "Store Manager",
  "role-warehouse_manager": "Warehouse Manager",
  "role-cashier": "Cashier"
};

const ROLE_COLORS = {
  "role-owner": "bg-red-500/10 text-red-500 border-red-500/20",
  "role-ceo": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "role-ca": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  "role-accountant": "bg-green-500/10 text-green-500 border-green-500/20",
  "role-store_manager": "bg-teal-500/10 text-teal-500 border-teal-500/20",
  "role-warehouse_manager": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  "role-cashier": "bg-blue-500/10 text-blue-500 border-blue-500/20"
};

export default function InternalStaffChat() {
  const { user: currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null); // Selected staff user to chat with
  const [messages, setMessages] = useState([]);

  // Hierarchy: 1. Close specific thread to go back to inbox. 2. Close drawer.
  useBackButton(() => setActiveUser(null), isOpen && activeUser !== null);
  useBackButton(() => setIsOpen(false), isOpen && activeUser === null);

  const [users, setUsers] = useState([]);
  const [inputText, setInputText] = useState("");
  
  // Attachments selection
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [indentsList, setIndentsList] = useState([]);
  const [poList, setPoList] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  // Hidden file inputs
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Image zoom modal (Lightbox)
  const [zoomedImage, setZoomedImage] = useState(null);

  const messagesEndRef = useRef(null);
  const companyId = localStorage.getItem("company_id");

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      // Optional: loadAttachments() if needed
    };
    window.addEventListener('open-internal-chat', handleOpen);
    return () => window.removeEventListener('open-internal-chat', handleOpen);
  }, []);

  // 1. Fetch company staff users
  useEffect(() => {
    if (!currentUser || !companyId) return;
    
    const loadUsers = async () => {
      try {
        const staff = await base44.entities.User.list();
        setUsers(staff.filter(u => u.is_active !== false));
      } catch (err) {
        console.error("Failed to load staff list:", err);
      }
    };
    
    loadUsers();
    const timer = setInterval(loadUsers, 15000);
    return () => clearInterval(timer);
  }, [currentUser, companyId]);

  // 2. Real-time Message Listener (Firestore Multi-tenant Scope)
  useEffect(() => {
    if (!currentUser || !companyId) return;

    const messagesRef = collection(db, "companies", companyId, "internalmessage");
    const q = query(messagesRef, orderBy("created_date", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setMessages(list);
    }, (err) => {
      console.error("Firestore message listener error:", err);
    });

    return () => unsubscribe();
  }, [currentUser, companyId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeUser, isOpen]);

  // 3. Mark messages as read when opening a thread
  useEffect(() => {
    if (!isOpen || !activeUser || !currentUser || !companyId) return;

    const markAsRead = async () => {
      const unread = messages.filter(
        m => m.sender_id === activeUser.id && 
             m.receiver_id === currentUser.id && 
             (!m.read_by || !m.read_by.includes(currentUser.id))
      );

      for (const msg of unread) {
        const updatedReadBy = [...(msg.read_by || []), currentUser.id];
        try {
          await base44.entities.InternalMessage.update(msg.id, { read_by: updatedReadBy });
        } catch (err) {
          console.error("Failed to mark message as read:", err);
        }
      }
    };

    markAsRead();
  }, [isOpen, activeUser, messages, currentUser, companyId]);

  // 4. Fetch lists of Indents & POs for sharing
  const loadAttachments = async () => {
    if (!companyId) return;
    setLoadingAttachments(true);
    try {
      const indents = await base44.entities.MaterialIndent.list("-created_date");
      const pos = await base44.entities.PurchaseOrder.list("-created_date");
      setIndentsList(indents);
      setPoList(pos);
    } catch (e) {
      console.error("Error loading procurement items:", e);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Toggle attachment menu
  const handleToggleAttach = () => {
    if (!showAttachMenu) {
      loadAttachments();
    }
    setShowAttachMenu(!showAttachMenu);
  };

  // 5. Send message logic
  const handleSendMessage = async (e, attachment = null) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachment) return;
    if (!activeUser || !companyId || !currentUser) return;

    const payload = {
      sender_id: currentUser.id,
      sender_name: currentUser.name || currentUser.full_name || "Staff",
      sender_role: currentUser.role_id || "role-cashier",
      receiver_id: activeUser.id,
      receiver_name: activeUser.name || activeUser.full_name || "Staff",
      content: inputText,
      created_date: new Date().toISOString(),
      read_by: [],
      attachment_type: attachment ? attachment.type : null,
      attachment_id: attachment ? attachment.id || null : null,
      attachment_number: attachment ? attachment.number || null : null,
      // Extended media sharing support
      attachment_data_url: attachment ? attachment.data_url || null : null,
      attachment_name: attachment ? attachment.name || null : null,
      attachment_size: attachment ? attachment.size || null : null
    };

    setInputText("");
    setShowAttachMenu(false);

    try {
      await base44.entities.InternalMessage.create(payload);
    } catch (err) {
      toast.error("Failed to send message: " + err.message);
    }
  };

  // 6. Share attachment in chat
  const handleShareAttachment = (type, item) => {
    const number = type === "indent" ? item.indent_number : item.po_number;
    setInputText(`Shared ${type === "indent" ? "Material Indent" : "Purchase Order"} request: ${number}`);
    handleSendMessage(null, { type, id: item.id, number });
  };

  // 7. Base64 local file uploader
  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Enforce 500KB size limit to keep Firestore document payloads light
    if (file.size > 500 * 1024) {
      toast.error("Attachment size exceeds 500 KB limit. Please select a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      const sizeStr = file.size > 1024 * 1024 
        ? (file.size / (1024 * 1024)).toFixed(1) + " MB"
        : (file.size / 1024).toFixed(0) + " KB";

      await handleSendMessage(null, {
        type: type, // "image", "pdf" or "document"
        data_url: base64Data,
        name: file.name,
        size: sizeStr
      });
      toast.success(`${file.name} sent successfully.`);
    };
    reader.readAsDataURL(file);
    // Reset file value to allow uploading same file again
    e.target.value = "";
  };

  // Trigger browser download of shared document
  const handleDownloadFile = (dataUrl, filename) => {
    try {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error("Failed to download file: " + err.message);
    }
  };

  // 8. Action execution: Convert Indent to PO (Accountant)
  const handleConvertIndentToPO = (attachmentId, attachmentNumber) => {
    setIsOpen(false);
    const event = new CustomEvent("openCreatePOFromIndent", {
      detail: { indentId: attachmentId, indentNumber: attachmentNumber }
    });
    window.dispatchEvent(event);
    toast.info(`Pre-filling PO from Indent request ${attachmentNumber}...`);
  };

  // 9. Action execution: Approve or Execute Purchase PO (CA/CEO/Owner)
  const handleActionPO = async (action, msg, poId) => {
    try {
      const po = poList.find(p => p.id === poId) || await base44.entities.PurchaseOrder.get(poId);
      if (!po) {
        toast.error("Purchase Order not found");
        return;
      }

      if (action === "approve") {
        await base44.entities.PurchaseOrder.update(poId, {
          status: "approved",
          approved_by: currentUser.id,
          approved_by_name: currentUser.name || currentUser.full_name
        });
        toast.success(`Purchase Order ${po.po_number} Approved!`);
      } else if (action === "purchase") {
        const shopSettingsList = await base44.entities.ShopSettings.list();
        const shopSettings = shopSettingsList[0] || {};
        const counter = (shopSettings.purchase_counter || 0) + 1;

        const purchasePayload = {
          date: new Date().toISOString().split("T")[0],
          vendor_name: po.vendor_name || "Procurement Direct",
          vendor_gstin: po.vendor_gstin || "",
          vendor_phone: po.vendor_phone || "",
          vendor_invoice_no: `PO-EXEC-${po.po_number}`,
          items: po.items || [],
          discount: po.discount || 0,
          notes: `Converted from PO ${po.po_number}. Approved by CA/Owner.`,
          payment_status: "paid",
          payment_mode: "cash",
          amount_paid: po.grand_total,
          due_date: "",
          grand_total: po.grand_total,
          purchase_number: `PUR-${String(counter).padStart(4, "0")}`
        };

        await base44.entities.Purchase.create(purchasePayload);

        for (const item of po.items) {
          if (item.product_id) {
            try {
              const prod = await base44.entities.Product.get(item.product_id);
              if (prod) {
                const currentStock = Number(prod.stock || 0);
                const qtyAdded = Number(item.qty || 0);
                await base44.entities.Product.update(item.product_id, {
                  stock: currentStock + qtyAdded,
                  purchase_rate: Number(item.rate || 0)
                });
              }
            } catch (err) {
              console.error("Stock update error during PO purchase conversion:", err);
            }
          }
        }

        if (shopSettings.id && !shopSettings.id.startsWith("seed")) {
          await base44.entities.ShopSettings.update(shopSettings.id, { purchase_counter: counter });
        }

        await base44.entities.PurchaseOrder.update(poId, {
          status: "purchased",
          approved_by: currentUser.id,
          approved_by_name: currentUser.name || currentUser.full_name
        });

        toast.success(`Purchase Order ${po.po_number} executed successfully! Stock levels updated.`);
      }

      loadAttachments();
    } catch (e) {
      toast.error("Failed to process PO action: " + e.message);
    }
  };

  // 10. Compute global unread messages count
  const globalUnreadCount = messages.filter(
    m => m.receiver_id === currentUser?.id && 
         (!m.read_by || !m.read_by.includes(currentUser.id))
  ).length;

  if (!currentUser) return null;

  // Filter messages for active chat session
  const chatMessages = messages.filter(
    m => (m.sender_id === currentUser.id && m.receiver_id === activeUser?.id) ||
         (m.sender_id === activeUser?.id && m.receiver_id === currentUser.id)
  );

  // Group messages by date
  const groupedMessages = [];
  let currentDate = "";
  chatMessages.forEach(msg => {
    const msgDate = new Date(msg.created_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ type: "date", date: msgDate });
    }
    groupedMessages.push({ type: "msg", message: msg });
  });

  return (
    <>
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => handleFileChange(e, "document")} 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={imageInputRef} 
        onChange={(e) => handleFileChange(e, "image")} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Zoomed Image Lightbox Overlay */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md transition-opacity animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <button className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full border border-white/15 text-white transition-all">
            <X className="w-6 h-6" />
          </button>
          <img 
            src={zoomedImage} 
            alt="Shared Visual" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-zoom-in"
          />
        </div>
      )}

      {/* FLOATING TOP RIGHT BELL / CHAT BUTTON - DESKTOP ONLY */}
      <button 
        onClick={() => { setIsOpen(!isOpen); loadAttachments(); }}
        className="hidden lg:flex fixed top-[3px] right-[5px] z-[60] rounded-full border-none text-foreground hover:scale-105 active:scale-95 duration-200 items-center justify-center cursor-pointer"
        title="Internal Staff Message Box"
      >
        <Info className="w-4 h-4 text-primary" />
        {globalUnreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 flex items-center justify-center text-[9px] font-black text-black bg-primary rounded-full px-1 border border-card shadow animate-bounce">
            {globalUnreadCount}
          </span>
        )}
      </button>

      {/* CHAT DRAWER PANEL */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-background/40 backdrop-blur-sm transition-opacity" 
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-md h-full bg-card border-l border-border shadow-2xl flex flex-col animate-fade-left">
            
            {/* ─── WhatsApp-Style Header ─── */}
            <div className={cn(
              "px-4 py-3 bg-[#008069] dark:bg-[#202c33] text-white flex items-center justify-between shrink-0 shadow-md",
              activeUser ? "gap-2" : "gap-4"
            )}>
              {activeUser ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <button 
                    onClick={() => setActiveUser(null)}
                    className="p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180 text-white" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center border border-white/25 uppercase shrink-0">
                    {activeUser.name?.substring(0, 2) || "ST"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black truncate">{activeUser.name || activeUser.full_name}</h3>
                    <p className="text-[10px] text-white/80 font-bold uppercase font-mono tracking-wide flex items-center gap-1 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                      {ROLE_LABELS[activeUser.role_id] || "Staff"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Staff Message Center</h3>
                    <p className="text-[10px] text-white/85">Real-time internal chat system</p>
                  </div>
                </div>
              )}

              {/* Header Right Action icons */}
              <div className="flex items-center gap-3">
                {activeUser && (
                  <>
                    <button className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10" onClick={() => toast.info("Calling feature simulated successfully.")}><Video className="w-4 h-4" /></button>
                    <button className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10" onClick={() => toast.info("Voice call simulated successfully.")}><Phone className="w-4 h-4" /></button>
                  </>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-all text-white/80 hover:text-white"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* ─── Drawer Core Views (WhatsApp wallpaper background) ─── */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 whatsapp-wallpaper">
              {activeUser ? (
                /* WHATSAPP CONVERSATION PANEL */
                groupedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground bg-card/65 dark:bg-[#0b141a]/65 backdrop-blur-md border border-border/50 rounded-2xl p-6 py-12 space-y-2">
                    <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center text-2xl animate-bounce">💬</div>
                    <p className="text-xs font-bold text-foreground">No message history with {activeUser.name}</p>
                    <p className="text-[10px] opacity-75">Send a message below or share an attachment to begin WhatsApp staff workflow.</p>
                  </div>
                ) : (
                  <div className="space-y-3 px-1.5 pb-2">
                    {groupedMessages.map((item, idx) => {
                      if (item.type === "date") {
                        return (
                          <div key={`date-${idx}`} className="flex justify-center my-3.5">
                            <span className="text-[9px] font-black uppercase text-muted-foreground bg-card/90 dark:bg-[#202c33]/90 border border-border/60 px-3 py-1 rounded-lg shadow-sm">
                              {item.date}
                            </span>
                          </div>
                        );
                      }

                      const m = item.message;
                      const isMe = m.sender_id === currentUser.id;
                      const isRead = m.read_by && m.read_by.length > 0;

                      return (
                        <div 
                          key={m.id} 
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"} w-full space-y-1 mb-2`}
                        >
                          {/* Chat speech bubbles */}
                          <div className={cn(
                            "relative max-w-[85%] rounded-xl px-3 py-2 text-xs border-none shadow-sm flex flex-col gap-1.5",
                            isMe 
                              ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none mr-2.5 after:content-[''] after:absolute after:top-0 after:right-[-6px] after:border-t-[8px] after:border-t-[#d9fdd3] dark:after:border-t-[#005c4b] after:border-r-[8px] after:border-r-transparent" 
                              : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none ml-2.5 before:content-[''] before:absolute before:top-0 before:left-[-6px] before:border-t-[8px] before:border-t-white dark:before:border-t-[#202c33] before:border-l-[8px] before:border-l-transparent"
                          )}>
                            {/* Staff sender identification banner on left side bubbles */}
                            {!isMe && (
                              <span className="text-[9px] text-[#008069] dark:text-green-400 font-extrabold flex items-center gap-1.5 uppercase font-mono">
                                {m.sender_name} · <span className="text-[8px] opacity-75 font-semibold">({ROLE_LABELS[m.sender_role] || "Staff"})</span>
                              </span>
                            )}

                            {/* Message text content */}
                            {m.content && (
                              <p className="whitespace-pre-wrap leading-relaxed pr-10 text-[12px]">{m.content}</p>
                            )}

                            {/* Render Document/PDF attachment boxes */}
                            {["pdf", "document"].includes(m.attachment_type) && m.attachment_data_url && (
                              <div className="mt-1 bg-card dark:bg-[#111b21] border border-border/75 rounded-lg p-2.5 flex items-center justify-between gap-3 text-card-foreground shadow-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                    <File className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0 text-left">
                                    <p className="text-[11px] font-black truncate max-w-[170px]">{m.attachment_name || "Document"}</p>
                                    <p className="text-[9px] text-muted-foreground uppercase font-semibold font-mono tracking-wider">
                                      {m.attachment_size || "N/A"} · {m.attachment_type}
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDownloadFile(m.attachment_data_url, m.attachment_name || "file")}
                                  className="w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 border border-border/80 active:scale-90 transition-all"
                                  title="Download File"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {/* Render Shared Images */}
                            {m.attachment_type === "image" && m.attachment_data_url && (
                              <div className="mt-1 relative group rounded-lg overflow-hidden border border-border/50 shadow-sm max-w-full">
                                <img 
                                  src={m.attachment_data_url} 
                                  alt="Shared content" 
                                  className="max-h-48 w-full object-cover cursor-pointer hover:opacity-90 transition-all rounded-lg"
                                  onClick={() => setZoomedImage(m.attachment_data_url)}
                                />
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => setZoomedImage(m.attachment_data_url)}
                                    className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all shadow"
                                    title="View Image"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDownloadFile(m.attachment_data_url, m.attachment_name || "image.png")}
                                    className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all shadow"
                                    title="Download Image"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Render Material Indent requests */}
                            {m.attachment_type === "indent" && (
                              <div className="mt-1 bg-card dark:bg-[#111b21] border border-border rounded-xl p-3 text-card-foreground shadow space-y-2 text-left">
                                <div className="flex items-center gap-1.5 text-primary text-[11px] font-black">
                                  <FileText className="w-4 h-4" />
                                  <span>MATERIAL INDENT REQUEST</span>
                                </div>
                                <div className="text-[10px] space-y-0.5">
                                  <p className="font-bold">ID: <span className="font-mono text-muted-foreground">{m.attachment_number}</span></p>
                                  <p className="text-muted-foreground">Pre-fill vendor PO directly inside the Accountant workbench below.</p>
                                </div>
                                {currentUser.role_id === "role-accountant" && (
                                  <Button 
                                    size="sm" 
                                    className="w-full h-8 text-[10px] font-black gold-gradient text-black"
                                    onClick={() => handleConvertIndentToPO(m.attachment_id, m.attachment_number)}
                                  >
                                    <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Convert to PO
                                  </Button>
                                )}
                              </div>
                            )}

                            {/* Render Purchase Order requests */}
                            {m.attachment_type === "po" && (
                              <div className="mt-1 bg-card dark:bg-[#111b21] border border-border rounded-xl p-3 text-card-foreground shadow space-y-2 text-left">
                                <div className="flex items-center gap-1.5 text-[#8b5cf6] text-[11px] font-black">
                                  <ShoppingCart className="w-4 h-4" />
                                  <span>PURCHASE ORDER REQUEST</span>
                                </div>
                                <div className="text-[10px] space-y-1">
                                  <p className="font-bold">ID: <span className="font-mono text-muted-foreground">{m.attachment_number}</span></p>
                                  <p className="text-muted-foreground">Authorized executives can execute directly into completed native purchases.</p>
                                </div>
                                {currentUser.hierarchy_level <= 3 ? (
                                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="h-7 text-[9px] font-bold border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                                      onClick={() => handleActionPO("approve", m, m.attachment_id)}
                                    >
                                      Approve PO
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      className="h-7 text-[9px] font-black bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                                      onClick={() => handleActionPO("purchase", m, m.attachment_id)}
                                    >
                                      Purchase
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-[9px] text-yellow-500 font-extrabold uppercase mt-1 flex items-center gap-1 border border-yellow-500/20 bg-yellow-500/5 px-2 py-0.5 rounded-lg justify-center">
                                    <ShieldAlert className="w-3 h-3" /> Pending Executive Action
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Timestamp & checkmarks right-bottom layout */}
                            <div className="flex items-center justify-end gap-1.5 self-end text-[8px] opacity-70 mt-0.5 select-none font-mono">
                              <span>
                                {new Date(m.created_date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                              </span>
                              {isMe && (
                                isRead 
                                  ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] shrink-0" />
                                  : <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              )}
                            </div>

                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )
              ) : (
                /* INBOX VIEW (THREADS LIST) */
                <div className="space-y-2 bg-card/75 dark:bg-[#0b141a]/75 backdrop-blur-md border border-border/60 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-border/55">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Active Employees</p>
                    <span className="text-[9px] font-bold text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded">{users.length} Registered</span>
                  </div>

                  {users.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground space-y-2">
                      <Inbox className="w-8 h-8 mx-auto opacity-35" />
                      <p className="text-xs">No registered staff users found.</p>
                    </div>
                  ) : (
                    <div className="space-y-1 mt-2">
                      {users.map(u => {
                        if (u.id === currentUser.id) return null;

                        const unreadCount = messages.filter(
                          m => m.sender_id === u.id && 
                               m.receiver_id === currentUser.id && 
                               (!m.read_by || !m.read_by.includes(currentUser.id))
                        ).length;

                        const threadMessages = messages.filter(
                          m => (m.sender_id === currentUser.id && m.receiver_id === u.id) ||
                               (m.sender_id === u.id && m.receiver_id === currentUser.id)
                        );
                        const lastMsg = threadMessages[threadMessages.length - 1];

                        return (
                          <button
                            key={u.id}
                            onClick={() => setActiveUser(u)}
                            className="w-full flex items-center justify-between p-3 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-secondary/40 transition-all text-left active:scale-[0.98] group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-full bg-secondary border border-border text-foreground font-black flex items-center justify-center uppercase text-sm group-hover:border-primary/30 transition-all">
                                  {u.name?.substring(0, 2) || "ST"}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-black truncate max-w-[120px]">{u.name || u.full_name}</h4>
                                  <span className={`text-[8px] font-bold border px-1.5 py-0.2 rounded-md ${ROLE_COLORS[u.role_id] || "border-border"}`}>
                                    {ROLE_LABELS[u.role_id] || "Staff"}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate max-w-[170px] mt-0.5 font-medium">
                                  {lastMsg ? lastMsg.content : "Click to write message..."}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {lastMsg && (
                                <span className="text-[8px] text-muted-foreground font-semibold">
                                  {new Date(lastMsg.created_date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                </span>
                              )}
                              {unreadCount > 0 && (
                                <span className="w-4.5 h-4.5 flex items-center justify-center text-[9px] font-black text-black bg-primary rounded-full px-1.5 py-0.5 border border-card shadow animate-pulse">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── Drawer Footer (WhatsApp Capsule Bar) ─── */}
            {activeUser && (
              <div className="p-3.5 border-t border-border bg-[#efeae2]/40 dark:bg-[#111b21] relative shrink-0">
                {/* Colorful Attachments pop-up panel */}
                {showAttachMenu && (
                  <div className="absolute bottom-[calc(100%+12px)] left-4 right-4 bg-card border border-border/80 rounded-2xl shadow-2xl p-4 z-[100] animate-fade-up max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2 border-b border-border/55 mb-2">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">Select attachment content type</span>
                      <button onClick={() => setShowAttachMenu(false)} className="p-0.5 rounded-full hover:bg-secondary transition-all"><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center py-2">
                      {/* 1. PDF / Doc uploader */}
                      <button 
                        type="button"
                        onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="w-12 h-12 rounded-full bg-purple-500 hover:bg-purple-600 text-white flex items-center justify-center shadow transition-all duration-200 active:scale-90">
                          <File className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black text-muted-foreground group-hover:text-foreground">Document</span>
                      </button>

                      {/* 2. Photo gallery uploader */}
                      <button 
                        type="button"
                        onClick={() => { setShowAttachMenu(false); imageInputRef.current?.click(); }}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="w-12 h-12 rounded-full bg-pink-500 hover:bg-pink-600 text-white flex items-center justify-center shadow transition-all duration-200 active:scale-90">
                          <Image className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black text-muted-foreground group-hover:text-foreground">Gallery</span>
                      </button>

                      {/* 3. Indent procurement trigger */}
                      <button 
                        type="button"
                        onClick={() => loadAttachments()}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow transition-all duration-200 active:scale-90">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black text-muted-foreground group-hover:text-foreground">Indent Link</span>
                      </button>

                      {/* 4. PO procurement trigger */}
                      <button 
                        type="button"
                        onClick={() => loadAttachments()}
                        className="flex flex-col items-center gap-1.5 group"
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow transition-all duration-200 active:scale-90">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <span className="text-[9px] font-black text-muted-foreground group-hover:text-foreground">PO Link</span>
                      </button>
                    </div>

                    {/* Shared Procurement registry list drawer */}
                    {loadingAttachments ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading items...
                      </div>
                    ) : (
                      (indentsList.length > 0 || poList.length > 0) && (
                        <div className="space-y-3 border-t border-border/50 pt-3 mt-1.5 max-h-36 overflow-y-auto">
                          {/* Indents */}
                          {indentsList.length > 0 && (
                            <div>
                              <p className="text-[8px] font-black text-primary uppercase mb-1 tracking-wider">Material Indents</p>
                              <div className="space-y-1">
                                {indentsList.slice(0, 3).map(item => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleShareAttachment("indent", item)}
                                    className="w-full text-left p-1.5 rounded bg-secondary hover:bg-secondary/80 text-[9px] font-mono flex items-center justify-between"
                                  >
                                    <span>{item.indent_number} ({item.items?.length || 0} items)</span>
                                    <span className="text-[8px] font-extrabold uppercase text-muted-foreground">{item.status || "pending"}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* POs */}
                          {poList.length > 0 && (
                            <div>
                              <p className="text-[8px] font-black text-[#8b5cf6] uppercase mb-1 tracking-wider">Purchase Orders</p>
                              <div className="space-y-1">
                                {poList.slice(0, 3).map(item => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleShareAttachment("po", item)}
                                    className="w-full text-left p-1.5 rounded bg-secondary hover:bg-secondary/80 text-[9px] font-mono flex items-center justify-between"
                                  >
                                    <span>{item.po_number} ({fmtINR(item.grand_total)})</span>
                                    <span className="text-[8px] font-extrabold uppercase text-muted-foreground">{item.status || "pending"}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                <form onSubmit={(e) => handleSendMessage(e)} className="flex items-center gap-2.5">
                  
                  {/* WhatsApp-Style Input Capsule bar */}
                  <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card dark:bg-[#202c33] border border-border/80 shadow-sm relative">
                    
                    {/* Emoji smile mock */}
                    <button
                      type="button"
                      onClick={() => toast.info("Emoji panel simulator triggered.")}
                      className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    {/* Paperclip attachment picker */}
                    <button
                      type="button"
                      onClick={handleToggleAttach}
                      className={cn(
                        "text-muted-foreground hover:text-foreground shrink-0 transition-all hover:scale-105 active:scale-95",
                        showAttachMenu && "text-[#008069] dark:text-green-400 rotate-45"
                      )}
                    >
                      <Paperclip className="w-4.5 h-4.5" />
                    </button>

                    {/* Chat Text Input field */}
                    <Input 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message"
                      className="flex-1 h-7 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 shadow-none outline-none focus:outline-none"
                    />
                  </div>

                  {/* Circular Send Arrow / Mic floating button */}
                  {inputText.trim() ? (
                    <Button 
                      type="submit"
                      className="h-10 w-10 shrink-0 bg-[#00a884] hover:bg-[#008069] text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all border-none"
                    >
                      <Send className="w-4.5 h-4.5 fill-white text-[#00a884]" />
                    </Button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => toast.info("Voice message recording is not enabled on this channel.")}
                      className="h-10 w-10 shrink-0 bg-[#00a884] hover:bg-[#008069] text-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-all border-none"
                    >
                      <Mic className="w-4.5 h-4.5 text-white" />
                    </button>
                  )}
                </form>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
