import React, { createContext, useState, useContext, useEffect } from "react";

const LanguageContext = createContext();

const TRANSLATIONS = {
  en: {
    // Nav Items
    "nav.dashboard": "Dashboard",
    "nav.pos": "Quick POS",
    "nav.invoices": "Invoices",
    "nav.purchases": "Purchases",
    "nav.waybills": "E-Waybills",
    "nav.inventory": "Inventory",
    "nav.customers": "Customers",
    "nav.expenses": "Expenses",
    "nav.accounting": "Accounting",
    "nav.loans": "Loans",
    "nav.barcode": "Barcode",
    "nav.gstfiling": "GST Filing",
    "nav.reports": "Reports",
    "nav.aiinsights": "AI Insights",
    "nav.settings": "Settings",
    "nav.upgrade": "Upgrade",
    "nav.logout": "Logout",
    
    // Greetings & Headers
    "greeting.namaste": "Namaste",
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Configure your business operations",
    "settings.title": "⚙️ Settings",
    "settings.subtitle": "Configure your business profile",
    
    // POS Controls
    "pos.barcode": "Barcode Mode",
    "pos.search_placeholder": "Search item, HSN code, or SKU...",
    "pos.scan_placeholder": "Scan Barcode Now...",
    "pos.table": "Table:",
    "pos.size": "Size:",
    "pos.color": "Color:",
    "pos.cart_empty": "Cart is empty",
    "pos.cart_sub": "Scan barcodes or touch products on the left",
    "pos.discount": "Discount Apply",
    "pos.payment_method": "Payment Method",
    "pos.subtotal": "Subtotal",
    "pos.tax": "Tax CGST + SGST",
    "pos.grand_total": "GRAND TOTAL",
    "pos.park_bill": "Park Bill",
    "pos.pay_print": "PAY & PRINT (F4)",
    "pos.customer_acc": "Customer Account",
    "pos.add_new": "ADD NEW",
    "pos.billing_type": "Billing Type",
    "pos.send_kitchen": "Send to Kitchen (KOT)",
    "pos.weight_label": "Enter Weight (Kg)",
    "pos.variants_label": "Select Variants",
    "pos.expiry_label": "Exp Date",
    
    // Dashboard metrics
    "metric.total_sales": "Total Sales",
    "metric.gross_profit": "Gross Profit",
    "metric.net_profit": "Net Profit",
    "metric.gst_collected": "GST Collected",
    "metric.outstanding": "Outstanding",
    "metric.purchases": "Purchases",
    "metric.expenses": "Expenses",
    "metric.customers": "Customers",
    "metric.products": "Products",
    "metric.loan_debt": "Loan Debt",
    "metric.sales_vs_expenses": "📊 Sales vs Expenses (Daily)",
    "metric.payment_status": "💰 Payment Status",
    "metric.monthly_pl": "📈 Monthly P&L (6 Months)",
    "metric.expense_breakdown": "💸 Expense Breakdown",
    "metric.profit_trend": "Profit Trend",
    "metric.recent_invoices": "📄 Recent Invoices",
    "metric.stock_alerts": "⚠️ Stock Alerts",
    "metric.top_customers": "⭐ Top Customers",
    
    // Voice Alerts / Guidance (English TTS text)
    "voice.welcome": "Welcome back!",
    "voice.cart_added": "Product added.",
    "voice.cart_removed": "Item removed from cart.",
    "voice.checkout_success": "Bill paid and printed successfully.",
    "voice.bill_parked": "Bill has been parked.",
    "voice.scan_enabled": "Barcode scanning enabled.",
    "voice.scan_disabled": "Barcode scanning disabled.",
    "voice.kot_sent": "Order sent to kitchen.",
  },
  hi: {
    // Nav Items
    "nav.dashboard": "डैशबोर्ड",
    "nav.pos": "क्विक पीओएस (POS)",
    "nav.invoices": "इनवॉइस / बिल",
    "nav.purchases": "खरीदारी (Purchases)",
    "nav.waybills": "ई-वे बिल (Waybills)",
    "nav.inventory": "स्टॉक / इन्वेंटरी",
    "nav.customers": "ग्राहक (Customers)",
    "nav.expenses": "खर्चे (Expenses)",
    "nav.accounting": "खाता-बही (Accounting)",
    "nav.loans": "लोन (Loans)",
    "nav.barcode": "बारकोड प्रिंटर",
    "nav.gstfiling": "जीएसटी फाइलिंग",
    "nav.reports": "रिपोर्ट्स",
    "nav.aiinsights": "AI सुझाव",
    "nav.settings": "सेटिंग्स",
    "nav.upgrade": "अपग्रेड प्रो",
    "nav.logout": "लॉगआउट",
    
    // Greetings & Headers
    "greeting.namaste": "नमस्ते",
    "dashboard.title": "डैशबोर्ड",
    "dashboard.subtitle": "अपने व्यापार को प्रबंधित करें",
    "settings.title": "⚙️ सेटिंग्स",
    "settings.subtitle": "अपने व्यापार की प्रोफाइल सेट करें",
    
    // POS Controls
    "pos.barcode": "बारकोड मोड",
    "pos.search_placeholder": "सामान, HSN कोड या बारकोड खोजें...",
    "pos.scan_placeholder": "कृपया बारकोड स्कैन करें...",
    "pos.table": "टेबल:",
    "pos.size": "साइज़:",
    "pos.color": "रंग:",
    "pos.cart_empty": "कार्ट खाली है",
    "pos.cart_sub": "उत्पादों को जोड़ने के लिए उनपर क्लिक करें या बारकोड स्कैन करें",
    "pos.discount": "छूट लागू करें",
    "pos.payment_method": "भुगतान का प्रकार",
    "pos.subtotal": "मूल मूल्य",
    "pos.tax": "जीएसटी टैक्स (CGST + SGST)",
    "pos.grand_total": "कुल बिल राशि",
    "pos.park_bill": "बिल पार्क करें",
    "pos.pay_print": "भुगतान और प्रिंट (F4)",
    "pos.customer_acc": "ग्राहक खाता",
    "pos.add_new": "नया जोड़ें",
    "pos.billing_type": "बिलिंग प्रकार",
    "pos.send_kitchen": "रसोई में भेजें (KOT)",
    "pos.weight_label": "वजन दर्ज करें (Kg)",
    "pos.variants_label": "वेरिएंट चुनें",
    "pos.expiry_label": "समाप्ति तिथि",
    
    // Dashboard metrics
    "metric.total_sales": "कुल बिक्री",
    "metric.gross_profit": "सकल लाभ (Gross Profit)",
    "metric.net_profit": "शुद्ध मुनाफा (Net Profit)",
    "metric.gst_collected": "जीएसटी संग्रह",
    "metric.outstanding": "बाकी पैसे",
    "metric.purchases": "कुल खरीद",
    "metric.expenses": "कुल खर्च",
    "metric.customers": "कुल ग्राहक",
    "metric.products": "कुल उत्पाद",
    "metric.loan_debt": "लोन कर्ज",
    "metric.sales_vs_expenses": "📊 बिक्री बनाम खर्चे (दैनिक)",
    "metric.payment_status": "💰 भुगतान की स्थिति",
    "metric.monthly_pl": "📈 मासिक लाभ-हानि (6 महीने)",
    "metric.expense_breakdown": "💸 खर्चों का विवरण",
    "metric.profit_trend": "मुनाफे का ग्राफ",
    "metric.recent_invoices": "📄 हालिया इनवॉइस",
    "metric.stock_alerts": "⚠️ स्टॉक अलर्ट (कम स्टॉक)",
    "metric.top_customers": "⭐ खास ग्राहक",
    
    // Voice Alerts / Guidance (Hindi TTS text)
    "voice.welcome": "नमस्ते! आपके व्यापार डैशबोर्ड में आपका स्वागत है।",
    "voice.cart_added": "सामान कार्ट में जोड़ दिया गया है।",
    "voice.cart_removed": "सामान कार्ट से हटा दिया गया है।",
    "voice.checkout_success": "बिल का भुगतान सफल रहा और प्रिंट हो गया है।",
    "voice.bill_parked": "बिल को पार्क कर दिया गया है।",
    "voice.scan_enabled": "बारकोड स्कैनर चालू कर दिया गया है।",
    "voice.scan_disabled": "बारकोड स्कैनर बंद कर दिया गया है।",
    "voice.kot_sent": "ऑर्डर रसोई घर में भेज दिया गया है।",
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("app_language") || "en";
  });
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem("voice_enabled") !== "false"; // default to true
  });

  useEffect(() => {
    localStorage.setItem("app_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("voice_enabled", String(voiceEnabled));
  }, [voiceEnabled]);

  const t = (key) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS["en"]?.[key] || key;
  };

  const speak = (keyOrText, raw = false) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();
      const textToSpeak = raw ? keyOrText : t(keyOrText);
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = language === "hi" ? "hi-IN" : "en-US";
      
      // Try to find matching voice
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(voice => voice.lang.includes(language === "hi" ? "hi" : "en"));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech Synthesis Error:", e);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, voiceEnabled, setVoiceEnabled, t, speak }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
