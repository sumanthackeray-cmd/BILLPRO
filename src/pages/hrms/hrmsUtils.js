import { base44 } from "@/api/base44Client";

// --- STATUTORY CONSTANTS & CONFIG SYSTEM ---
export function getRegulatoryConfig() {
  if (typeof window === "undefined") {
    return {
      country: "India",
      currency: "₹",
      pfEmployeeRate: 12,
      pfEmployerRate: 12,
      esicEmployeeRate: 0.75,
      esicEmployerRate: 3.25,
      esicThreshold: 21000,
      ptRate: 200,
      tdsThreshold: 700000
    };
  }
  const stored = localStorage.getItem("hrms_regulatory_config");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  return {
    country: "India",
    currency: "₹",
    pfEmployeeRate: 12,      // %
    pfEmployerRate: 12,      // %
    esicEmployeeRate: 0.75,  // %
    esicEmployerRate: 3.25,  // %
    esicThreshold: 21000,
    ptRate: 200,             // Fixed professional tax
    tdsThreshold: 700000     // Annual threshold below which tax is nil
  };
}

export function saveRegulatoryConfig(config) {
  if (typeof window !== "undefined") {
    localStorage.setItem("hrms_regulatory_config", JSON.stringify(config));
  }
}

export const PF_RATE_EMPLOYEE = 0.12;
export const PF_RATE_EMPLOYER = 0.12;
export const ESIC_RATE_EMPLOYEE = 0.0075;
export const ESIC_RATE_EMPLOYER = 0.0325;
export const PT_FIXED_MH = 200;

// --- COMPLIANCE CALCULATORS ---

/**
 * Calculates Employee & Employer PF contribution
 * PF is typically 12% of Basic Salary.
 */
export function calculatePF(basic) {
  const config = getRegulatoryConfig();
  const empPF = Math.round(basic * (config.pfEmployeeRate / 100));
  const emprPF = Math.round(basic * (config.pfEmployerRate / 100));
  return { employee: empPF, employer: emprPF };
}

/**
 * Calculates Employee & Employer ESIC contribution
 * ESIC applies if Gross Salary is <= threshold.
 */
export function calculateESIC(gross) {
  const config = getRegulatoryConfig();
  if (config.esicThreshold && gross > config.esicThreshold) {
    return { employee: 0, employer: 0 };
  }
  const empESIC = Number((gross * (config.esicEmployeeRate / 100)).toFixed(2));
  const emprESIC = Number((gross * (config.esicEmployerRate / 100)).toFixed(2));
  return { employee: empESIC, employer: emprESIC };
}

/**
 * Calculates Professional Tax (PT)
 * Pt is standard state-wise. Fallback to customized rate.
 */
export function calculatePT(gross, state = "Maharashtra") {
  const config = getRegulatoryConfig();
  if (config.country !== "India") {
    return config.ptRate || 0;
  }
  if (gross < 7500) return 0;
  if (gross < 10000) return 175;
  return config.ptRate || 200;
}

/**
 * Calculates estimated monthly TDS (Withholding tax)
 * A dynamic regime based on configurable tdsThreshold.
 */
export function calculateTDS(monthlyGross) {
  const config = getRegulatoryConfig();
  const annualGross = monthlyGross * 12;
  let annualTax = 0;
  
  if (annualGross <= config.tdsThreshold) {
    annualTax = 0;
  } else {
    const taxable = annualGross - config.tdsThreshold;
    if (taxable <= 0) {
      annualTax = 0;
    } else if (taxable <= 300000) {
      annualTax = taxable * 0.05;
    } else if (taxable <= 600000) {
      annualTax = 15000 + (taxable - 300000) * 0.10;
    } else {
      annualTax = 45000 + (taxable - 600000) * 0.15;
    }
  }
  return Math.round(annualTax / 12);
}

/**
 * Bonus Act calculation: 8.33% to 20% of basic. Default 8.33%
 */
export function calculateStatutoryBonus(basic, percent = 8.33) {
  const rate = percent / 100;
  return Number((basic * rate).toFixed(2));
}

/**
 * Gratuity: 15 / 26 * Basic * Completed Years (applicable after 5 years)
 */
export function calculateGratuity(basic, years) {
  if (years < 5) return 0;
  return Math.round((15 / 26) * basic * years);
}

// --- MASTER SEED DATA ---

export const DEFAULT_DEPARTMENTS = [
  { name: "Manufacturing", code: "MFG" },
  { name: "Sales & Marketing", code: "SLS" },
  { name: "Accounts & Finance", code: "ACC" },
  { name: "HR & Administration", code: "HRM" },
  { name: "Warehouse & Logistics", code: "WHS" },
  { name: "IT Support & Systems", code: "IT" }
];

export const DEFAULT_DESIGNATIONS = [
  { name: "Floor Operator", code: "OPR" },
  { name: "Line Supervisor", code: "SUP" },
  { name: "QC Specialist", code: "QCS" },
  { name: "Department Manager", code: "MGR" },
  { name: "HR Executive", code: "EXE" },
  { name: "Accounts Head", code: "ACT" },
  { name: "Software Engineer", code: "SDE" },
  { name: "Managing Director", code: "MD" }
];

export const DEFAULT_SHIFTS = [
  { name: "General Shift", start_time: "09:30 AM", end_time: "06:30 PM" },
  { name: "Shift A: Morning", start_time: "06:00 AM", end_time: "02:00 PM" },
  { name: "Shift B: Evening", start_time: "02:00 PM", end_time: "10:00 PM" },
  { name: "Shift C: Night Run", start_time: "10:00 PM", end_time: "06:00 AM" }
];

export const DEFAULT_HOLIDAYS = [
  { name: "Republic Day", date: "2026-01-26" },
  { name: "Independence Day", date: "2026-08-15" },
  { name: "Gandhi Jayanti", date: "2026-10-02" },
  { name: "Diwali festival", date: "2026-11-08" },
  { name: "Holi festival", date: "2026-03-14" },
  { name: "New Year Day", date: "2026-01-01" }
];

// --- SEED TRIGGER LOGIC ---

export async function ensureHRMSeedData() {
  try {
    const [depts, desigs, shifts, holidays] = await Promise.all([
      base44.entities.Department.list(),
      base44.entities.Designation.list(),
      base44.entities.Shift.list(),
      base44.entities.Holiday.list()
    ]);

    const promises = [];

    if (depts.length === 0) {
      DEFAULT_DEPARTMENTS.forEach(d => promises.push(base44.entities.Department.create(d)));
    }
    if (desigs.length === 0) {
      DEFAULT_DESIGNATIONS.forEach(d => promises.push(base44.entities.Designation.create(d)));
    }
    if (shifts.length === 0) {
      DEFAULT_SHIFTS.forEach(s => promises.push(base44.entities.Shift.create(s)));
    }
    if (holidays.length === 0) {
      DEFAULT_HOLIDAYS.forEach(h => promises.push(base44.entities.Holiday.create(h)));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log("HRM Master Tables seeded successfully!");
    }
  } catch (error) {
    console.error("Failed to seed HRM master data:", error);
  }
}
