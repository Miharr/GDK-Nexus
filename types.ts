export type UnitType = 'SqMeter' | 'Vaar' | 'Vigha' | 'Guntha' | 'SqKm';

export interface LandIdentity {
  tpScheme: string;
  fpNumber: string; 
  blockSurveyNumber: string; 
  village: string;
}

export interface Measurements {
  areaInput: number | '';
  inputUnit: UnitType;
  displayUnit: UnitType;
  jantriRate: number | ''; // Rate per Sq Meter
}

export interface Financials {
  pricePerVigha: number | ''; 
  totalDealPrice: number; // Calculated (Read-only)
  downPaymentPercent: number | ''; 
  downPaymentAmount: number | ''; 
  downPaymentDurationMonths: number; // New Field (0-5)
  totalDurationMonths: number | ''; 
  numberOfInstallments: number | ''; 
  purchaseDate: string;
}

export interface Overheads {
  stampDutyPercent: number | '';
  architectFees: number | '';
  planPassFees: number | '';
  naExpense: number | '';
  naPremium: number | '';
  developmentCost: number | ''; 
}

export interface PaymentScheduleItem {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'Token' | 'Installment' | 'Jantri' | 'Total';
}

export interface CalculationResult {
  totalSqMt: number;
  fpAreaSqMt: number; 
  
  inputInVigha: number;
  fpInVigha: number; 
  
  totalJantriValue: number; 
  fpJantriValue: number; 
  
  stampDuty100: number; 
  stampDuty60: number; 
  
  totalAdditionalExpenses: number;
  
  landedCost100: number; 
  landedCost60: number; 
  
  schedule: PaymentScheduleItem[];
  grandTotalPayment: number; 
  
  // Metrics for 100% Basis
  costPerSqMt100: number;
  costPerVaar100: number;
  costPerVigha100: number;

  // Metrics for 60% (FP) Basis
  costPerSqMt60: number;
  costPerVaar60: number;
  costPerVigha60: number;
}

// --- NEW TYPES FOR PROJECT HISTORY ---

export interface ProjectSavedState {
  identity: LandIdentity;
  measurements: Measurements;
  financials: Financials;
  overheads: Overheads;
  analysisUnit: UnitType;
  costSheetBasis: '100' | '60';
}

export interface ProjectRow {
  id: number;
  created_at: string;
  project_name: string;
  village_name: string;
  total_land_cost: number;
  full_data: ProjectSavedState;
}