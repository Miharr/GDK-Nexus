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
  developmentCost: number | ''; // New field
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
  
  totalJantriValue: number; // 100%
  fpJantriValue: number; // 60%
  
  stampDuty100: number; // New
  stampDuty60: number; // New
  
  totalAdditionalExpenses: number;
  
  landedCost100: number; // New (Total Cost based on 100% Stamp)
  landedCost60: number; // New (Total Cost based on 60% Stamp)
  
  schedule: PaymentScheduleItem[];
  grandTotalPayment: number; 
  
  costPerSqMt: number;
  costPerVaar: number;
  costPerVigha: number;
}