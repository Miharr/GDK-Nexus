

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
  plottedArea?: number | ''; // New field for Plotted/Saleable Area
  plottedUnit?: UnitType;    // Unit for Plotted Area
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

export interface CustomExpense {
  id: string;
  name: string;
  amount: number | '';
}

export interface Overheads {
  stampDutyPercent: number | '';
  architectFees: number | '';
  planPassFees: number | '';
  naExpense: number | '';
  naPremium: number | '';
  developmentCost: number | ''; 
  customExpenses?: CustomExpense[]; // New field for dynamic list
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

// --- NEW TYPES FOR PLOTTING MODULE ---

export interface PlottingDevExpense {
  id: string; // uuid for list management
  description: string;
  amount: number | '';
}

export interface PlotGroup {
  id: string;
  count: number | '';
  area: number | '';
  unit: UnitType;
}

export type PlotStatus = 'available' | 'booked' | 'sold';

export interface PlotPaymentEntry {
  id: string;
  date: string;
  amount: number | '';
  description: string; // e.g. "Token", "Installment 1"
  isPaid: boolean;
}

export interface PlotSaleItem {
  id: string;
  plotNumber: number;
  customerName: string;
  phoneNumber: string;
  bookingDate: string;
  dimLengthFt: number | '';
  dimWidthFt: number | '';
  areaVaar: number; 
  
  // New Payment Tracking Data
  salePrice: number; // Frozen price at time of booking
  paymentSchedule: PlotPaymentEntry[];
  totalReceived: number;
}

export interface PlottingState {
  // Tile 1: Project Cost
  landRate: number | ''; 
  devRate: number | '';  
  
  // Tile 2: Dev Expenses
  developmentExpenses: PlottingDevExpense[];

  // Tile 3: Plot Sales (New)
  plotSales: PlotSaleItem[];

  // Legacy/Unused fields (Kept for type safety if needed)
  deductionPercent?: number | '';
  totalPlots?: number | ''; 
  plotsStatus?: PlotStatus[];
  plotGroups?: any[];
  expectedSalesRate?: number | '';
  salesRateUnit?: UnitType;
}

export interface ProjectRow {
  id: number;
  created_at: string;
  project_name: string;
  village_name: string;
  total_land_cost: number;
  full_data: ProjectSavedState;
  plotting_data?: PlottingState;
}