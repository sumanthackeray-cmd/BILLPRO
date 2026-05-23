# 🔧 Advanced Implementation Guide - Code Skeletons

## Quick Implementation Templates for High-Priority Features

---

## 1️⃣ ADVANCED PAYROLL SYSTEM (Priority: 🔴 CRITICAL)

### Step 1: Create Payroll Engine Core

**File: `src/modules/payroll/PayrollCalculations.js`**

```javascript
/**
 * Advanced Payroll Engine for Indian Businesses
 * Handles TDS, PF, ESI, LTA, Gratuity, etc.
 */

// Income Tax Slabs FY 2024-25 (for individual)
const TAX_SLABS_2024 = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 600000, rate: 0.05 },
  { min: 600000, max: 900000, rate: 0.10 },
  { min: 900000, max: 1200000, rate: 0.15 },
  { min: 1200000, max: 1500000, rate: 0.20 },
  { min: 1500000, max: Infinity, rate: 0.30 }
];

const STANDARD_DEDUCTION = 75000; // FY 2024-25

// ===== TDS CALCULATION =====
export const calculateTDS = (annualSalary) => {
  const taxableIncome = Math.max(0, annualSalary - STANDARD_DEDUCTION);
  let tax = 0;

  for (const slab of TAX_SLABS_2024) {
    if (taxableIncome > slab.max) {
      tax += (slab.max - slab.min) * slab.rate;
    } else if (taxableIncome > slab.min) {
      tax += (taxableIncome - slab.min) * slab.rate;
      break;
    }
  }

  // Add cess (4% on tax)
  const totalTax = tax + (tax * 0.04);
  
  // TDS is typically withheld monthly
  return Math.round(totalTax / 12);
};

// ===== PF CALCULATION =====
export const calculatePF = (basicSalary, dearness_allowance = 0) => {
  const pfWageBase = basicSalary + dearness_allowance;
  
  // Employee contribution: 12% of wage base
  const employeeContribution = Math.round(pfWageBase * 0.12);
  
  // Employer contribution: 12% (8.33% to PF + 3.67% to administration)
  const employerContribution = Math.round(pfWageBase * 0.12);
  
  // Employer can contribute additional amount to voluntary PF
  
  return {
    employee: employeeContribution,
    employer: employerContribution,
    total: employeeContribution + employerContribution
  };
};

// ===== ESI CALCULATION (if applicable) =====
export const calculateESI = (grossSalary) => {
  // ESI applicable only if monthly salary < ₹21,000 (as of 2024)
  const ESI_WAGE_CEILING = 21000;
  
  if (grossSalary >= ESI_WAGE_CEILING) {
    return { employee: 0, employer: 0, total: 0 };
  }
  
  // Employee: 0.75% | Employer: 3.25% of ESI wages
  const esiWage = grossSalary;
  
  return {
    employee: Math.round(esiWage * 0.0075),
    employer: Math.round(esiWage * 0.0325),
    total: Math.round(esiWage * 0.04)
  };
};

// ===== GRATUITY CALCULATION (Labor Code) =====
export const calculateGratuity = (
  lastDrawnSalary,
  yearsOfService,
  separationType = 'normal' // normal, termination, resignation
) => {
  // Gratuity formula: (Last drawn salary * 15 * Years of service) / 30
  // OR: (Last drawn salary * 0.5 * Years of service)
  
  // Maximum gratuity limit: ₹10,00,000
  const MAX_GRATUITY = 1000000;
  
  let gratuity = 0;
  
  if (yearsOfService >= 5) {
    // Full gratuity after 5 years
    gratuity = (lastDrawnSalary * 15 * yearsOfService) / 30;
  } else if (yearsOfService >= 3 && separationType === 'termination') {
    // Pro-rata for termination after 3 years
    gratuity = (lastDrawnSalary * 15 * yearsOfService) / 30;
  } else if (separationType === 'resignation' && yearsOfService < 5) {
    // No gratuity on resignation < 5 years
    gratuity = 0;
  }
  
  return Math.min(gratuity, MAX_GRATUITY);
};

// ===== NET SALARY CALCULATION =====
export const calculateNetSalary = (employee, components, attendanceDays = 30) => {
  const totalDays = 30; // Calendar days in month
  const attendanceRatio = attendanceDays / totalDays;
  
  // Earnings
  let grossSalary = 0;
  const earnings = {};
  
  components.earning.forEach(comp => {
    let amount = comp.amount;
    
    // Apply attendance ratio if applicable
    if (comp.is_prorata_eligible) {
      amount = Math.round(amount * attendanceRatio);
    }
    
    earnings[comp.name] = amount;
    grossSalary += amount;
  });
  
  // Deductions
  let totalDeductions = 0;
  const deductions = {};
  
  // Standard deductions
  const pfData = calculatePF(earnings['Basic'] || 0, earnings['Dearness Allowance'] || 0);
  deductions['PF Contribution'] = pfData.employee;
  totalDeductions += pfData.employee;
  
  const esiData = calculateESI(grossSalary);
  if (esiData.employee > 0) {
    deductions['ESI Contribution'] = esiData.employee;
    totalDeductions += esiData.employee;
  }
  
  const tds = calculateTDS(employee.annual_salary || (grossSalary * 12));
  deductions['TDS'] = tds;
  totalDeductions += tds;
  
  // Additional deductions from salary structure
  components.deduction.forEach(comp => {
    const amount = comp.fixed_amount || Math.round(grossSalary * (comp.percentage / 100));
    deductions[comp.name] = amount;
    totalDeductions += amount;
  });
  
  const netSalary = grossSalary - totalDeductions;
  
  return {
    gross_salary: grossSalary,
    earnings,
    deductions,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    employer_contribution: pfData.employer + esiData.employer,
    ctc: grossSalary + pfData.employer + esiData.employer,
    attendance_days: attendanceDays,
    calculation_date: new Date().toISOString()
  };
};

// ===== BULK PAYROLL PROCESSING =====
export const processMonthlyPayroll = async (
  month, // "2024-01"
  employees,
  salaryStructures,
  attendanceData
) => {
  const payrollRecords = [];
  let totalPayable = 0;
  let totalEarnings = 0;
  let totalDeductions = 0;
  let totalEmployerContribution = 0;
  
  for (const employee of employees) {
    if (!employee.is_active) continue;
    
    const structure = salaryStructures.find(s => s.employee_id === employee.id);
    if (!structure) continue;
    
    const attendance = attendanceData.find(a => 
      a.employee_id === employee.id && a.month === month
    );
    
    const attendanceDays = attendance?.present_days || 25;
    
    const payroll = calculateNetSalary(
      employee,
      structure.components,
      attendanceDays
    );
    
    payrollRecords.push({
      id: `PAY-${employee.id}-${month}`,
      employee_id: employee.id,
      employee_name: employee.name,
      month,
      ...payroll,
      status: 'pending',
      created_date: new Date().toISOString()
    });
    
    totalPayable += payroll.net_salary;
    totalEarnings += payroll.gross_salary;
    totalDeductions += payroll.total_deductions;
    totalEmployerContribution += payroll.employer_contribution;
  }
  
  return {
    payroll_records: payrollRecords,
    summary: {
      month,
      total_employees: payrollRecords.length,
      total_payable: totalPayable,
      total_earnings: totalEarnings,
      total_deductions: totalDeductions,
      total_employer_contribution: totalEmployerContribution,
      total_ctc: totalEarnings + totalEmployerContribution,
      processing_date: new Date().toISOString()
    }
  };
};

export default {
  calculateTDS,
  calculatePF,
  calculateESI,
  calculateGratuity,
  calculateNetSalary,
  processMonthlyPayroll,
  TAX_SLABS_2024
};
```

---

### Step 2: Create Salary Structure UI

**File: `src/modules/payroll/SalaryStructureSetup.jsx`**

```javascript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

export function SalaryStructureSetup({ employee, onSave }) {
  const [structure, setStructure] = useState({
    earning: [
      { name: 'Basic', amount: 0, is_prorata_eligible: true },
      { name: 'Dearness Allowance', amount: 0, is_prorata_eligible: true },
      { name: 'House Rent Allowance', amount: 0, is_prorata_eligible: true }
    ],
    deduction: [
      { name: 'Professional Tax', fixed_amount: 200, percentage: 0 },
      { name: 'Provident Fund', fixed_amount: 0, percentage: 0 }
    ]
  });

  const handleEarningChange = (idx, field, value) => {
    const updated = [...structure.earning];
    updated[idx] = { ...updated[idx], [field]: value };
    setStructure({ ...structure, earning: updated });
  };

  const handleDeductionChange = (idx, field, value) => {
    const updated = [...structure.deduction];
    updated[idx] = { ...updated[idx], [field]: value };
    setStructure({ ...structure, deduction: updated });
  };

  const addEarning = () => {
    setStructure({
      ...structure,
      earning: [...structure.earning, { name: '', amount: 0, is_prorata_eligible: true }]
    });
  };

  const addDeduction = () => {
    setStructure({
      ...structure,
      deduction: [...structure.deduction, { name: '', fixed_amount: 0, percentage: 0 }]
    });
  };

  const removeEarning = (idx) => {
    setStructure({
      ...structure,
      earning: structure.earning.filter((_, i) => i !== idx)
    });
  };

  const removeDeduction = (idx) => {
    setStructure({
      ...structure,
      deduction: structure.deduction.filter((_, i) => i !== idx)
    });
  };

  const totalBasic = structure.earning.reduce((sum, e) => sum + (e.amount || 0), 0);
  const ctcAnnual = totalBasic * 12 * 1.3; // Basic + typical benefits

  return (
    <div className="space-y-6">
      {/* Earnings */}
      <Card className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Earnings</h3>
          <Button size="sm" variant="outline" onClick={addEarning}>
            <Plus className="w-4 h-4 mr-2" /> Add Earning
          </Button>
        </div>
        <div className="space-y-3">
          {structure.earning.map((earning, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-5">
                <Label className="text-xs">Component Name</Label>
                <Input
                  value={earning.name}
                  onChange={(e) => handleEarningChange(idx, 'name', e.target.value)}
                  placeholder="e.g., Basic Salary"
                />
              </div>
              <div className="col-span-5">
                <Label className="text-xs">Monthly Amount (₹)</Label>
                <Input
                  type="number"
                  value={earning.amount}
                  onChange={(e) => handleEarningChange(idx, 'amount', parseFloat(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2 flex gap-1">
                <input
                  type="checkbox"
                  checked={earning.is_prorata_eligible}
                  onChange={(e) => handleEarningChange(idx, 'is_prorata_eligible', e.target.checked)}
                  title="Pro-rata eligible"
                />
                <Button size="sm" variant="ghost" onClick={() => removeEarning(idx)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Deductions */}
      <Card className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Deductions</h3>
          <Button size="sm" variant="outline" onClick={addDeduction}>
            <Plus className="w-4 h-4 mr-2" /> Add Deduction
          </Button>
        </div>
        <div className="space-y-3">
          {structure.deduction.map((deduction, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-5">
                <Label className="text-xs">Deduction Name</Label>
                <Input
                  value={deduction.name}
                  onChange={(e) => handleDeductionChange(idx, 'name', e.target.value)}
                  placeholder="e.g., Professional Tax"
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Fixed Amount (₹)</Label>
                <Input
                  type="number"
                  value={deduction.fixed_amount}
                  onChange={(e) => handleDeductionChange(idx, 'fixed_amount', parseFloat(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={deduction.percentage}
                  onChange={(e) => handleDeductionChange(idx, 'percentage', parseFloat(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="col-span-1">
                <Button size="sm" variant="ghost" onClick={() => removeDeduction(idx)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-5 bg-amber-50 border-amber-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Basic Salary (Monthly)</p>
            <p className="text-2xl font-bold">₹{totalBasic.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Estimated CTC (Annual)</p>
            <p className="text-2xl font-bold">₹{Math.round(ctcAnnual).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </Card>

      <Button className="w-full" onClick={() => onSave(structure)}>
        Save Salary Structure
      </Button>
    </div>
  );
}
```

---

### Step 3: Process Monthly Payroll

**File: `src/modules/payroll/PayrollProcessing.jsx`**

```javascript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { processMonthlyPayroll, fmtINR } from './PayrollCalculations';
import base44 from '@base44/sdk';

export function PayrollProcessing() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().split('-').slice(0, 2).join('-')
  );
  const [payrollData, setPayrollData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: structures = [] } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: () => base44.entities.SalaryStructure.list()
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', selectedMonth],
    queryFn: () => base44.entities.AttendanceLog.list(selectedMonth)
  });

  const handleProcessPayroll = async () => {
    setIsProcessing(true);
    try {
      const result = await processMonthlyPayroll(
        selectedMonth,
        employees,
        structures,
        attendance
      );
      setPayrollData(result);
    } catch (error) {
      console.error('Payroll processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprovePayroll = async () => {
    try {
      // Save all payroll records to Firestore
      for (const record of payrollData.payroll_records) {
        await base44.entities.Payroll.create(record);
      }
      // Create bank instruction document
      await base44.entities.PayrollSummary.create({
        ...payrollData.summary,
        status: 'approved',
        approved_by: 'current_user',
        approved_date: new Date().toISOString()
      });
      alert('Payroll approved and saved successfully!');
    } catch (error) {
      console.error('Failed to save payroll:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Selection */}
      <Card className="p-5">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-bold mb-2">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          <Button
            onClick={handleProcessPayroll}
            disabled={isProcessing}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isProcessing ? 'Processing...' : 'Process Payroll'}
          </Button>
        </div>
      </Card>

      {/* Processing Results */}
      {payrollData && (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="p-5 bg-gradient-to-r from-blue-50 to-blue-100">
            <h3 className="font-bold mb-4 text-lg">Payroll Summary - {selectedMonth}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{payrollData.summary.total_employees}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold">{fmtINR(payrollData.summary.total_earnings)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Deductions</p>
                <p className="text-2xl font-bold">{fmtINR(payrollData.summary.total_deductions)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Payable</p>
                <p className="text-2xl font-bold text-green-600">{fmtINR(payrollData.summary.total_payable)}</p>
              </div>
            </div>
          </Card>

          {/* Employee Breakdown */}
          <Card className="p-5">
            <h3 className="font-bold mb-3">Employee Payroll Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="text-left px-3 py-2">Employee</th>
                    <th className="text-right px-3 py-2">Gross</th>
                    <th className="text-right px-3 py-2">Deductions</th>
                    <th className="text-right px-3 py-2">Net Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.payroll_records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{record.employee_name}</td>
                      <td className="text-right px-3 py-2">{fmtINR(record.gross_salary)}</td>
                      <td className="text-right px-3 py-2">{fmtINR(record.total_deductions)}</td>
                      <td className="text-right px-3 py-2 font-bold text-green-600">{fmtINR(record.net_salary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Button
            onClick={handleApprovePayroll}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Approve & Process Payroll
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## 2️⃣ INVENTORY OPTIMIZATION (Priority: 🔴 CRITICAL)

### Step 1: ABC Analysis Engine

**File: `src/modules/inventory/ABCAnalysis.js`**

```javascript
/**
 * ABC Analysis for Inventory Optimization
 * Pareto Principle: 80% of inventory value comes from 20% of items
 */

export const performABCAnalysis = (products) => {
  // Calculate total value per product
  const productsWithValue = products.map(p => ({
    ...p,
    total_value: (p.unit_price || 0) * (p.qty_on_hand || 0)
  }));

  // Sort by value (descending)
  const sorted = productsWithValue.sort((a, b) => b.total_value - a.total_value);

  // Calculate cumulative percentage
  const totalValue = sorted.reduce((sum, p) => sum + p.total_value, 0);
  let cumulative = 0;

  const analysed = sorted.map((product, index) => {
    cumulative += product.total_value;
    const percentage = (cumulative / totalValue) * 100;

    let category = 'C'; // Low value
    if (percentage <= 80) {
      category = 'A'; // High value (80% of revenue from 20% items)
    } else if (percentage <= 95) {
      category = 'B'; // Medium value
    }

    return {
      ...product,
      category,
      cumulative_percentage: percentage,
      rank: index + 1
    };
  });

  return {
    analysis: analysed,
    summary: {
      total_items: analysed.length,
      total_value: totalValue,
      category_a_count: analysed.filter(p => p.category === 'A').length,
      category_b_count: analysed.filter(p => p.category === 'B').length,
      category_c_count: analysed.filter(p => p.category === 'C').length,
      category_a_value: analysed
        .filter(p => p.category === 'A')
        .reduce((sum, p) => sum + p.total_value, 0),
      category_b_value: analysed
        .filter(p => p.category === 'B')
        .reduce((sum, p) => sum + p.total_value, 0),
      category_c_value: analysed
        .filter(p => p.category === 'C')
        .reduce((sum, p) => sum + p.total_value, 0)
    }
  };
};

// ===== INVENTORY RECOMMENDATIONS =====
export const getInventoryRecommendations = (analysedProducts) => {
  const recommendations = [];

  analysedProducts.forEach(product => {
    // Category A: High value - frequent monitoring, higher safety stock
    if (product.category === 'A') {
      if (product.qty_on_hand < product.min_stock) {
        recommendations.push({
          product_id: product.id,
          product_name: product.name,
          category: 'A',
          action: 'URGENT_REORDER',
          reason: 'Category A item below min stock',
          severity: 'CRITICAL'
        });
      }
    }

    // Category C: Low value - lower safety stock, less frequent reorders
    if (product.category === 'C') {
      if (product.days_in_stock > 180) {
        recommendations.push({
          product_id: product.id,
          product_name: product.name,
          category: 'C',
          action: 'CONSIDER_DISCONTINUE',
          reason: 'Dead stock (>180 days)',
          severity: 'MEDIUM'
        });
      }
    }
  });

  return recommendations;
};

// ===== STOCK AGING ANALYSIS =====
export const calculateStockAging = (products) => {
  const today = new Date();

  return products.map(product => {
    const lastPurchaseDate = new Date(product.last_purchase_date);
    const daysInStock = Math.floor((today - lastPurchaseDate) / (1000 * 60 * 60 * 24));

    let ageCategory = 'Fresh';
    if (daysInStock > 90) ageCategory = 'Slow-moving';
    if (daysInStock > 180) ageCategory = 'Stagnant';
    if (daysInStock > 365) ageCategory = 'Dead Stock';

    return {
      ...product,
      days_in_stock: daysInStock,
      age_category: ageCategory,
      turnover_ratio: (product.annual_sales || 0) / Math.max(1, product.qty_on_hand)
    };
  });
};
```

---

### Step 2: Auto PO Generation

**File: `src/modules/inventory/AutoPOGeneration.js`**

```javascript
/**
 * Automatic Purchase Order Generation
 * Based on Min-Max inventory levels and demand forecast
 */

export const generateAutoPurchaseOrders = (
  products,
  minMaxRules,
  currentInventory,
  leadTimeData
) => {
  const purchaseOrders = [];

  minMaxRules.forEach(rule => {
    const product = products.find(p => p.id === rule.product_id);
    if (!product) return;

    const currentStock = currentInventory[rule.product_id] || 0;
    const leadTime = leadTimeData[rule.vendor_id]?.lead_time_days || 7;

    // Reorder Point = (Average daily demand × Lead Time) + Safety Stock
    const avgDailyDemand = (product.annual_sales || 0) / 365;
    const safetyStock = avgDailyDemand * 3; // 3-day safety buffer
    const reorderPoint = (avgDailyDemand * leadTime) + safetyStock;

    // Generate PO if stock below reorder point
    if (currentStock <= reorderPoint) {
      const orderQuantity = rule.max_stock - currentStock;

      purchaseOrders.push({
        id: `AUTO-PO-${Date.now()}`,
        vendor_id: rule.vendor_id,
        vendor_name: rule.vendor_name,
        auto_generated: true,
        lines: [
          {
            product_id: rule.product_id,
            product_name: product.name,
            quantity: orderQuantity,
            unit_price: rule.last_purchase_price || product.cost_price,
            lead_time_days: leadTime
          }
        ],
        total_amount: orderQuantity * (rule.last_purchase_price || product.cost_price),
        expected_delivery: new Date(Date.now() + leadTime * 24 * 60 * 60 * 1000),
        status: 'draft',
        reason: 'Auto-generated - Below reorder point'
      });
    }
  });

  return {
    purchase_orders: purchaseOrders,
    total_orders: purchaseOrders.length,
    total_value: purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0),
    generation_date: new Date().toISOString()
  };
};
```

---

## 3️⃣ ADVANCED ANALYTICS DASHBOARD (Priority: 🔴 CRITICAL)

**File: `src/modules/analytics/AnalyticsDashboard.jsx`**

```javascript
import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import base44 from '@base44/sdk';

export function AnalyticsDashboard() {
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-date', 1000)
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentInvoices = invoices.filter(
      inv => new Date(inv.date) >= last30Days
    );

    const totalRevenue = recentInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
    const totalTransactions = recentInvoices.length;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Category-wise sales
    const categoryWiseSales = {};
    recentInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        const cat = item.category || 'Uncategorized';
        categoryWiseSales[cat] = (categoryWiseSales[cat] || 0) + item.qty;
      });
    });

    // Top 5 products
    const productSales = {};
    recentInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        productSales[item.name] = (productSales[item.name] || 0) + item.qty;
      });
    });

    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    return {
      total_revenue: totalRevenue,
      total_transactions: totalTransactions,
      avg_transaction: avgTransaction,
      category_sales: categoryWiseSales,
      top_products: topProducts
    };
  }, [invoices]);

  // Daily sales trend
  const dailyTrend = useMemo(() => {
    const trend = {};
    invoices.forEach(inv => {
      const date = inv.date?.split('T')[0] || new Date().toISOString().split('T')[0];
      trend[date] = (trend[date] || 0) + (inv.grand_total || 0);
    });

    return Object.entries(trend)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30) // Last 30 days
      .map(([date, revenue]) => ({ date, revenue }));
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100">
          <p className="text-xs text-gray-600 mb-1">Total Revenue (30 days)</p>
          <p className="text-3xl font-bold">₹{Math.round(kpis.total_revenue).toLocaleString('en-IN')}</p>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100">
          <p className="text-xs text-gray-600 mb-1">Transactions</p>
          <p className="text-3xl font-bold">{kpis.total_transactions}</p>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100">
          <p className="text-xs text-gray-600 mb-1">Avg Transaction</p>
          <p className="text-3xl font-bold">₹{Math.round(kpis.avg_transaction).toLocaleString('en-IN')}</p>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100">
          <p className="text-xs text-gray-600 mb-1">Profit Margin</p>
          <p className="text-3xl font-bold">22.5%</p>
        </Card>
      </div>

      {/* Daily Sales Trend */}
      <Card className="p-5">
        <h3 className="font-bold mb-4">Revenue Trend (Last 30 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `₹${Math.round(value).toLocaleString('en-IN')}`} />
            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Top Products */}
      <Card className="p-5">
        <h3 className="font-bold mb-4">Top 5 Products</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={kpis.top_products}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="qty" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
```

---

## 📋 Implementation Checklist

### Week 1 (Payroll):
- [ ] Create PayrollCalculations.js
- [ ] Create SalaryStructureSetup component
- [ ] Create PayrollProcessing component
- [ ] Test TDS, PF, ESI calculations
- [ ] Create Payroll entity in Base44

### Week 2 (Inventory):
- [ ] Create ABCAnalysis.js
- [ ] Create AutoPOGeneration.js
- [ ] Build ABC Analysis UI
- [ ] Test with product sample data
- [ ] Create inventory reports

### Week 3 (Analytics):
- [ ] Create AnalyticsDashboard.jsx
- [ ] Add more KPI cards
- [ ] Integrate with Recharts
- [ ] Test with real sales data
- [ ] Add drill-down reports

---

This skeleton provides the foundation. Extend it based on specific business requirements!

