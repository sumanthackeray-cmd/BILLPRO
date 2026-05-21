import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Step1AccountType from './Step1AccountType';
import Step2BasicInfo from './Step2BasicInfo';
import Step3BusinessDetails from './Step3BusinessDetails';
import Step4PlanSelection from './Step4PlanSelection';
import Step5Welcome from './Step5Welcome';

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    account_type: 'small_shop',
    admin_name: '',
    admin_mobile: '',
    email: '',
    password: '',
    confirm_password: '',
    business_name: '',
    business_type: '',
    city: '',
    
    // Step 3 fields
    legal: {
      gstin: null,
      pan: null,
      entity_type: 'sole_prop',
      year_established: null
    },
    address: {
      line1: null,
      line2: null,
      state: null,
      pincode: null
    },
    contact: {
      business_email: null,
      business_phone: null,
      website: null
    },
    banking: {
      bank_name: null,
      account_number: null,
      ifsc: null,
      upi_id: null
    },
    manufacturing: {
      plant_name: null,
      plant_address: null,
      manufacturing_license: null,
      factory_registration: null,
      product_categories: [],
      production_capacity: null,
      no_of_plants: null,
      certifications: [],
      raw_material_suppliers: []
    },
    franchise: {
      parent_brand: null,
      agreement_number: null,
      agreement_valid_till: null,
      royalty_percentage: null,
      total_outlets: null,
      territory: null,
      ho_address: null
    },
    enterprise: {
      cin: null,
      parent_company: null,
      country_of_origin: null,
      india_ho_city: null,
      total_employees_india: null,
      annual_turnover_range: null,
      stock_exchange: null,
      existing_erp: null,
      no_of_branches: null,
      international_presence: null,
      compliance_officer: null,
      company_secretary: null
    },
    wholesale: {
      drug_license: null,
      fssai_license: null,
      iec_code: null,
      distribution_territory: null,
      retailers_served_count: null,
      warehouse_size_sqft: null,
      no_of_warehouses: null,
      cold_storage: null
    }
  });

  const nextStep = () => setCurrentStep(prev => prev + 1);
  const prevStep = () => setCurrentStep(prev => prev - 1);
  const updateData = (newData) => setFormData(prev => ({ ...prev, ...newData }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1.5 bg-slate-100 dark:bg-slate-800 w-full">
          <div 
            className="h-full bg-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          {currentStep === 1 && (
            <Step1AccountType 
              formData={formData} 
              updateData={updateData} 
              onNext={nextStep} 
            />
          )}
          
          {currentStep === 2 && (
            <Step2BasicInfo 
              formData={formData} 
              updateData={updateData} 
              onNext={nextStep} 
              onPrev={prevStep}
            />
          )}

          {currentStep === 3 && (
            <Step3BusinessDetails 
              formData={formData} 
              updateData={updateData} 
              onNext={nextStep} 
              onPrev={prevStep}
            />
          )}

          {currentStep === 4 && (
            <Step4PlanSelection 
              formData={formData} 
              updateData={updateData} 
              onNext={nextStep} 
              onPrev={prevStep}
            />
          )}

          {currentStep === 5 && (
            <Step5Welcome 
              formData={formData} 
              onFinish={() => navigate('/dashboard')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
