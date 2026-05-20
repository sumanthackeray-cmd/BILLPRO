export const INDIAN_STATES = [
  "01-Jammu & Kashmir", "02-Himachal Pradesh", "03-Punjab", "04-Chandigarh", "05-Uttarakhand",
  "06-Haryana", "07-Delhi", "08-Rajasthan", "09-Uttar Pradesh", "10-Bihar", "11-Sikkim",
  "12-Arunachal Pradesh", "13-Nagaland", "14-Manipur", "15-Mizoram", "16-Tripura",
  "17-Meghalaya", "18-Assam", "19-West Bengal", "20-Jharkhand", "21-Odisha", "22-Chhattisgarh",
  "23-Madhya Pradesh", "24-Gujarat", "27-Maharashtra", "28-Andhra Pradesh", "29-Karnataka",
  "30-Goa", "32-Kerala", "33-Tamil Nadu", "36-Telangana",
];

export const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28];
export const TRANSPORT_MODES = ["Road", "Rail", "Air", "Ship", "Pipeline", "In-Transit"];

export const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const today = () => new Date().toISOString().split("T")[0];

export const addDays = (d, n) => {
  const dt = new Date(d || today());
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
};

export const isOverdue = (inv) =>
  inv.status !== "paid" && new Date(inv.due_date) < new Date();

export const getMonth = (d) => d ? d.slice(0, 7) : "";
export const thisMonth = () => today().slice(0, 7);

export const calcItems = (items = [], discount = 0) => {
  const subtotal = items.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
  const discAmt = (subtotal * discount) / 100;
  const taxable = subtotal - discAmt;
  const totalGst = items.reduce((s, it) => {
    const itemTaxable = (it.qty || 0) * (it.rate || 0) * (1 - discount / 100);
    return s + (itemTaxable * (it.gst_rate || 0)) / 100;
  }, 0);
  const cgst = totalGst / 2;
  const sgst = totalGst / 2;
  const igst = totalGst;
  return { subtotal, discAmt, taxable, cgst, sgst, igst, totalGst };
};

export const numToWords = (n) => {
  n = Math.floor(n || 0);
  if (n === 0) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (num) => {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : "");
    if (num < 1000) return a[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + inWords(num % 100) : "");
    if (num < 100000) return inWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + inWords(num % 1000) : "");
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + inWords(num % 100000) : "");
    return inWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + inWords(num % 10000000) : "");
  };
  return inWords(n) + " Rupees Only";
};

export const generateInvNo = (prefix, counter) =>
  `${prefix}${String(counter + 1).padStart(4, "0")}`;