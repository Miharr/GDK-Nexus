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
  totalDealPrice: number | ''; 
  downPaymentPercent: number | ''; 
  downPaymentAmount: number | ''; // Now bi-directional
  totalDurationMonths: number | ''; // New duration field
  installmentFrequency: number; // 1 = Monthly, 2 = Bi-monthly, etc.
  purchaseDate: string;
}

export interface Overheads {
  stampDutyPercent: number | '';
  architectFees: number | '';
  planPassFees: number | '';
  naExpense: number | '';
  naPremium: number | '';
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
  apAreaSqMt: number; // 60%
  
  // Conversions for display
  inputInVigha: number;
  apInVigha: number;
  
  totalJantriValue: number; // On 100%
  apJantriValue: number; // On 60%
  
  totalAdditionalExpenses: number;
  landedCost: number; 
  
  schedule: PaymentScheduleItem[];
  grandTotalPayment: number; 
  
  // Unit Costs
  costPerSqMt: number;
  costPerVaar: number;
  costPerVigha: number;
}