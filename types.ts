export interface LandIdentity {
  tpScheme: string;
  fpNumber: string; 
  blockSurveyNumber: string; 
  village: string;
}

export interface Measurements {
  areaSqMt: number | ''; // Allow empty string for input handling
  jantriRate: number | '';
}

export interface Financials {
  totalDealPrice: number | ''; // Allow empty string
  downPaymentPercent: number | ''; // Allow empty string for manual entry
  downPaymentAmount: number; // Calculated
  numberOfInstallments: number | ''; // Allow empty string
  purchaseDate: string; // ISO Date string
}

export interface Overheads {
  stampDutyType: 'DealPrice' | 'Jantri'; // New field for Radio Button selection
  stampDutyPercent: number | '';
  stampDutyAmount: number; // Calculated
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
  type: 'Token' | 'Installment' | 'Jantri';
}

export interface CalculationResult {
  totalSqMt: number;
  vighaEquivalent: number;
  totalJantriValue: number;
  totalAdditionalExpenses: number;
  landedCost: number; 
  schedule: PaymentScheduleItem[];
  grandTotalPayment: number; 
  landCostPerSqMt: number;
  finalProjectCostPerSqMt: number;
}