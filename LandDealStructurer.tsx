
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Ruler, 
  IndianRupee, 
  CalendarDays, 
  Calendar,
  FileText, 
  Calculator,
  RefreshCw,
  RotateCcw,
  Download,
  ArrowRightLeft,
  ArrowLeft,
  Clock,
  ArrowDown,
  CheckCircle,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { Card } from './Card';
import { SummaryChart } from './SummaryChart';
import { 
  LandIdentity, 
  Measurements, 
  Financials, 
  Overheads, 
  CalculationResult, 
  PaymentScheduleItem,
  UnitType,
  ProjectSavedState
} from '../types';
import { 
  formatCurrency, 
  formatDate, 
  addDays, 
  addMonths,
  formatInputNumber,
  parseInputNumber
} from '../utils/formatters';
import { addPdfFooter, addPdfHeader, autoTable, createPdfDoc, pdfTableDefaults } from '../utils/pdf';
import { supabase } from '../supabaseClient';

const CONVERSION_RATES = {
  Vigha: 1,
  SqMeter: 2377.73,
  Vaar: 2843.71,
  Guntha: 23.50,
  SqKm: 4.00
};

interface Props {
  onBack: () => void;
  initialData?: ProjectSavedState;
  initialId?: number;
}

export const LandDealStructurer: React.FC<Props> = ({ onBack, initialData, initialId }) => {
  
  // Fancy UI State for sliding input
const [addingToId, setAddingToId] = useState<string | null>(null);
  const [flashingId, setFlashingId] = useState<string | null>(null);
  const [expenseEntrySearch, setExpenseEntrySearch] = useState(''); // New search for the input section
  
  // --- STATE ---
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(initialId || null);
  const [identity, setIdentity] = useState<LandIdentity>({
    village: '', tpScheme: '', fpNumber: '', blockSurveyNumber: '',
  });

  const [measurements, setMeasurements] = useState<Measurements>({
    areaInput: '',
    inputUnit: 'SqMeter',
    displayUnit: 'Vigha', 
    jantriRate: '',
    plottedArea: '', // New Field
    plottedUnit: 'Vaar' // Default Unit
  });

  const [analysisUnit, setAnalysisUnit] = useState<UnitType>('Vigha');

const [financials, setFinancials] = useState<Financials & { priceBasis: 'Vigha' | 'Vaar' }>({
    pricePerVigha: '', 
    priceBasis: 'Vigha', // Default to Vigha
    totalDealPrice: 0, 
    downPaymentPercent: '', 
    downPaymentAmount: '',
    downPaymentDurationMonths: 3, 
    totalDurationMonths: 24, 
    numberOfInstallments: 4, 
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  const [overheads, setOverheads] = useState<Overheads>({
    stampDutyPercent: 4.9,
    architectFees: '',
    planPassFees: '',
    naExpense: '',
    naPremium: '',
    developmentCost: '',
    customExpenses: [] // New Field
  });

  const [costSheetBasis, setCostSheetBasis] = useState<'100' | '60'>('100');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // --- LEDGER & MODAL STATE ---
const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshProjectData = async () => {
    if (!currentProjectId) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('full_data')
        .eq('id', currentProjectId)
        .single();

      if (error) throw error;

      if (data?.full_data) {
        const d = data.full_data as ProjectSavedState;
        setIdentity(d.identity);
        setMeasurements(d.measurements);
        setFinancials(d.financials);
        setOverheads(d.overheads);
        setAnalysisUnit(d.analysisUnit);
        setCostSheetBasis(d.costSheetBasis);
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      // Satisfying delay so the user sees the spin
      setTimeout(() => setIsSyncing(false), 600);
    }
  };  const [tempAddDate, setTempAddDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgerRange, setLedgerRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // 1st of current month
    to: new Date().toISOString().split('T')[0] // Today
  });

  // --- HYDRATION EFFECT ---
 useEffect(() => {
    if (initialData) {
      setIdentity(initialData.identity);
      setMeasurements(initialData.measurements);
      setFinancials(initialData.financials);
      setOverheads(initialData.overheads);
      setAnalysisUnit(initialData.analysisUnit);
      setCostSheetBasis(initialData.costSheetBasis);
    }
    if (initialId) {
        setCurrentProjectId(initialId);
    }
  }, [initialData, initialId]);

  // --- CALCULATION ENGINE ---
  useEffect(() => {
    const getNum = (val: number | string) => (val === '' ? 0 : Number(val));

    // 1. Unit Conversion
    const inputVal = getNum(measurements.areaInput);
    let valInVigha = 0;
    if (measurements.inputUnit === 'Vigha') {
      valInVigha = inputVal;
    } else {
      valInVigha = inputVal / CONVERSION_RATES[measurements.inputUnit];
    }
    const totalSqMt = valInVigha * CONVERSION_RATES.SqMeter;
    const totalVaar = valInVigha * CONVERSION_RATES.Vaar;

    // 2. FP Area Logic (60%)
    const fpAreaSqMt = totalSqMt * 0.60;
    const fpInVigha = valInVigha * 0.60;

    // 3. Jantri
    const jantriRate = getNum(measurements.jantriRate);
    const totalJantriValue = totalSqMt * jantriRate;
    const fpJantriValue = fpAreaSqMt * jantriRate;

   // 4. Deal Price Logic
    const priceInput = getNum(financials.pricePerVigha);
    const calculatedDealPrice = financials.priceBasis === 'Vigha' 
      ? priceInput * valInVigha 
      : priceInput * (valInVigha * CONVERSION_RATES.Vaar * 0.60);
    
    // 5. Financials (Use State directly, handlers keep them synced)
    const effectiveDpAmount = getNum(financials.downPaymentAmount);

    // 6. Stamp Duty
    const stampPercent = getNum(overheads.stampDutyPercent);
    const stampDuty100 = totalJantriValue * (stampPercent / 100);
    const stampDuty60 = fpJantriValue * (stampPercent / 100);

    // 7. Schedule
    const schedule: PaymentScheduleItem[] = [];
    const purchaseDateObj = new Date(financials.purchaseDate);
    const totalMonths = getNum(financials.totalDurationMonths);
    const numInstallments = getNum(financials.numberOfInstallments);
    const dpDuration = financials.downPaymentDurationMonths;

    const dpDueDate = addMonths(purchaseDateObj, dpDuration);
    
    if (calculatedDealPrice > 0 || effectiveDpAmount > 0) {
      schedule.push({
        id: 1,
        date: formatDate(dpDueDate),
        description: `Down Payment (${dpDuration} Month Window)`,
        amount: effectiveDpAmount,
        type: 'Token'
      });
    }

    const balanceToPay = calculatedDealPrice - effectiveDpAmount;
    const remainingDurationMonths = Math.max(0, totalMonths - dpDuration);
    
    if (balanceToPay > 0 && numInstallments > 0 && remainingDurationMonths > 0) {
      const amountPerInstallment = balanceToPay / numInstallments;
      const startDate = addMonths(purchaseDateObj, dpDuration);
      const endDate = addMonths(purchaseDateObj, totalMonths);
      const timeSpan = endDate.getTime() - startDate.getTime();
      const intervalMs = timeSpan / numInstallments;

      for (let i = 1; i <= numInstallments; i++) {
        const dueDateMs = startDate.getTime() + (i * intervalMs);
        const dueDate = new Date(dueDateMs);
        schedule.push({
          id: i + 1,
          date: formatDate(dueDate),
          description: `Installment ${i}`,
          amount: amountPerInstallment,
          type: 'Installment'
        });
      }
    }

    // 8. Totals
    const totalCustomExpenses = (overheads.customExpenses || []).reduce((sum, item) => sum + getNum(item.amount), 0);

    const totalAdditionalExpenses = 
      getNum(overheads.architectFees) + 
      getNum(overheads.planPassFees) + 
      getNum(overheads.naExpense) + 
      getNum(overheads.naPremium) + 
      getNum(overheads.developmentCost) + 
      totalCustomExpenses;

    const landedCost100 = calculatedDealPrice + stampDuty100 + totalAdditionalExpenses;
    const landedCost60 = calculatedDealPrice + stampDuty60 + totalAdditionalExpenses;
    const grandTotalPayment = schedule.reduce((sum, item) => sum + item.amount, 0);

    // 9. Metric Calculations
    // Logic: If Plotted Area is entered, convert it and use it as the denominator.
    
    // Calculate Plotted Area in all units
    const plottedVal = getNum(measurements.plottedArea);
    let plottedInVigha = 0;
    if (plottedVal > 0) {
       // Convert whatever unit user selected (Vaar/SqMt) into Vigha for base calc
       if (measurements.plottedUnit === 'Vigha') plottedInVigha = plottedVal;
       else plottedInVigha = plottedVal / CONVERSION_RATES[measurements.plottedUnit || 'Vaar'];
    }
    
    // Denominators for 100% Basis
    // If plotted area exists, use it. Otherwise use Total Land Area.
    const denomVigha100 = plottedInVigha > 0 ? plottedInVigha : valInVigha;
    const denomSqMt100  = plottedInVigha > 0 ? plottedInVigha * CONVERSION_RATES.SqMeter : totalSqMt;
    const denomVaar100  = plottedInVigha > 0 ? plottedInVigha * CONVERSION_RATES.Vaar : totalVaar;

    // Denominators for 60% Basis
    // If plotted area exists, use it. Otherwise use FP Area (60%).
    const denomVigha60 = plottedInVigha > 0 ? plottedInVigha : (valInVigha * 0.60);
    const denomSqMt60  = plottedInVigha > 0 ? plottedInVigha * CONVERSION_RATES.SqMeter : (totalSqMt * 0.60);
    const denomVaar60  = plottedInVigha > 0 ? plottedInVigha * CONVERSION_RATES.Vaar : (totalVaar * 0.60);

    const costPerSqMt100 = denomSqMt100 > 0 ? landedCost100 / denomSqMt100 : 0;
    const costPerVaar100 = denomVaar100 > 0 ? landedCost100 / denomVaar100 : 0;
    const costPerVigha100 = denomVigha100 > 0 ? landedCost100 / denomVigha100 : 0;
    
    const costPerSqMt60 = denomSqMt60 > 0 ? landedCost60 / denomSqMt60 : 0;
    const costPerVaar60 = denomVaar60 > 0 ? landedCost60 / denomVaar60 : 0;
    const costPerVigha60 = denomVigha60 > 0 ? landedCost60 / denomVigha60 : 0;

    setResult({
      totalSqMt, fpAreaSqMt, inputInVigha: valInVigha, fpInVigha,
      totalJantriValue, fpJantriValue, 
      stampDuty100, stampDuty60,
      totalAdditionalExpenses, 
      landedCost100, landedCost60,
      schedule, grandTotalPayment, 
      costPerSqMt100, costPerVaar100, costPerVigha100,
      costPerSqMt60, costPerVaar60, costPerVigha60
    });

  }, [measurements, financials, overheads]);

  // --- HANDLERS ---
const handleClear = () => {
    // Reset all states immediately without confirmation dialog
    setCurrentProjectId(null); // Clear ID so next save is a NEW row
    setIdentity({ village: '', tpScheme: '', fpNumber: '', blockSurveyNumber: '' });
    setMeasurements({ areaInput: '', inputUnit: 'SqMeter', displayUnit: 'Vigha', jantriRate: '' });
    
    // Reset financials to default
    setFinancials({ 
      pricePerVigha: '', 
      totalDealPrice: 0, 
      downPaymentPercent: '', 
      downPaymentAmount: '', 
      downPaymentDurationMonths: 3, 
      totalDurationMonths: 24, 
      numberOfInstallments: 4, 
      purchaseDate: new Date().toISOString().split('T')[0] 
    });

    // Reset overheads
    setOverheads({ 
      stampDutyPercent: 4.9, 
      architectFees: '', 
      planPassFees: '', 
      naExpense: '', 
      naPremium: '', 
      developmentCost: '' ,
      customExpenses: []
    });

    setAnalysisUnit('Vigha');
    setCostSheetBasis('100');
    setResult(null);
    
    // Optional: Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProject = async () => {
    // 1. Safety check for Supabase
    if (!supabase) {
      alert("Database connection is not initialized. Please check Supabase configuration.");
      return;
    }

    if (!identity.village) {
        alert('Please enter a Village Name to save the project.');
        return;
    }

    const projectData: ProjectSavedState = {
        identity,
        measurements,
        financials,
        overheads,
        analysisUnit,
        costSheetBasis
    };

   const projectName = `${identity.village || 'Project'} - TP ${identity.tpScheme || '-'} - FP ${identity.fpNumber || '-'}`;

    try {
        let error;
        
        if (currentProjectId) {
            // UPDATE EXISTING ROW
            const response = await supabase.from('projects').update({
                project_name: projectName,
                village_name: identity.village,
                total_land_cost: result ? (costSheetBasis === '100' ? result.landedCost100 : result.landedCost60) : 0,
                full_data: projectData
            }).eq('id', currentProjectId);
            error = response.error;
        } else {
            // INSERT NEW ROW
            const response = await supabase.from('projects').insert({
                project_name: projectName,
                village_name: identity.village,
                total_land_cost: result ? (costSheetBasis === '100' ? result.landedCost100 : result.landedCost60) : 0,
                full_data: projectData
            }).select(); // Select to get the new ID back
            
            error = response.error;
            
            // Set the ID so next click is an update
            if (response.data && response.data[0]) {
                setCurrentProjectId(response.data[0].id);
            }
        }

        if (error) throw error;
        
        // Trigger Silent Success Animation
      
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 2000); // Hide after 2 seconds

    } catch (err: any) {
        console.error(err);
        alert(`Failed to save project: ${err.message || 'Unknown error'}`);
    }
  };

 const handleDownloadPDF = async () => {
    if (!result) return;
    const villageName = identity.village ? identity.village.replace(/\s+/g, '_') : 'Village';
    const fpNumber = identity.fpNumber ? identity.fpNumber.replace(/\s+/g, '') : 'FP';
    const filename = `GDK_NEXUS_${villageName}_FP${fpNumber}.pdf`;
    const doc = await createPdfDoc('portrait');
    if (!doc) {
      console.error('PDF generation failed: jsPDF runtime unavailable (Land Cost Sheet).');
      alert('PDF generation failed. Please refresh and try again.');
      return;
    }

    try {
    const currentLandedCost = costSheetBasis === '100' ? result.landedCost100 : result.landedCost60;
    const currentStampDuty = costSheetBasis === '100' ? result.stampDuty100 : result.stampDuty60;
    const currentJantriDisplay = costSheetBasis === '100' ? result.totalJantriValue : result.fpJantriValue;
    const getNum = (val: number | string) => (val === '' ? 0 : Number(val));
    const calculatedDealPrice = getNum(financials.pricePerVigha) * (
      financials.priceBasis === 'Vaar'
        ? result.inputInVigha * CONVERSION_RATES.Vaar * 0.60
        : result.inputInVigha
    );

    addPdfHeader(doc, 'GDK NEXUS LAND COST SHEET', `Project: ${identity.village || 'Unnamed Project'} | TP: ${identity.tpScheme || '-'} | FP: ${identity.fpNumber || '-'}`);

    autoTable(doc, {
      ...pdfTableDefaults,
      startY: 78,
      margin: { left: 40, right: 40 },
      head: [['Project Identity', 'Value']],
      body: [
        ['Village', identity.village || '-'],
        ['TP Scheme', identity.tpScheme || '-'],
        ['FP Number', identity.fpNumber || '-'],
        ['Block / Survey Number', identity.blockSurveyNumber || '-'],
      ],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 170 } },
    });

    autoTable(doc, {
      ...pdfTableDefaults,
      startY: ((doc as any).lastAutoTable?.finalY || 130) + 18,
      margin: { left: 40, right: 40 },
      head: [['Land / Jantri Metrics', 'Value']],
      body: [
        ['Input Area', `${formatInputNumber(measurements.areaInput)} ${measurements.inputUnit}`],
        ['Total Area', `${formatInputNumber(result.totalSqMt)} SqMt / ${formatInputNumber(result.inputInVigha)} Vigha`],
        ['FP Area (60%)', `${formatInputNumber(result.fpAreaSqMt)} SqMt / ${formatInputNumber(result.fpInVigha)} Vigha`],
        ['Jantri Rate', `${formatCurrency(getNum(measurements.jantriRate))} / SqMt`],
        [`Jantri Value (${costSheetBasis}% basis)`, formatCurrency(currentJantriDisplay)],
      ],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 170 } },
    });

    const costRows = [
      ['Land Deal Price', formatCurrency(calculatedDealPrice)],
      [`Stamp Duty & Registration (${costSheetBasis}% basis)`, formatCurrency(currentStampDuty)],
      ['Architect Fees', formatCurrency(getNum(overheads.architectFees))],
      ['Plan Pass Fees', formatCurrency(getNum(overheads.planPassFees))],
      ['NA Expense', formatCurrency(getNum(overheads.naExpense))],
      ['NA Premium', formatCurrency(getNum(overheads.naPremium))],
      ['Development Cost', formatCurrency(getNum(overheads.developmentCost))],
      ...(overheads.customExpenses || []).map((item: any) => [item.name || 'Extra Expense', formatCurrency(getNum(item.amount))]),
    ].filter((row) => row[1] !== formatCurrency(0));

    autoTable(doc, {
      ...pdfTableDefaults,
      startY: ((doc as any).lastAutoTable?.finalY || 250) + 18,
      margin: { left: 40, right: 40 },
      head: [['Cost Breakdown', 'Amount']],
      body: costRows,
      foot: [['Final Project Cost', formatCurrency(currentLandedCost)]],
      showFoot: 'lastPage',
      columnStyles: { 0: { cellWidth: 330 }, 1: { halign: 'right' } },
    });

    autoTable(doc, {
      ...pdfTableDefaults,
      startY: ((doc as any).lastAutoTable?.finalY || 380) + 18,
      margin: { left: 40, right: 40 },
      head: [['#', 'Description', 'Due Date', 'Amount']],
      body: result.schedule.map((item, index) => [
        `${index + 1}`,
        item.description,
        item.date,
        formatCurrency(item.amount),
      ]),
      foot: [['', 'Total Payable to Land Owner', '', formatCurrency(result.grandTotalPayment)]],
      showFoot: 'lastPage',
      columnStyles: { 0: { cellWidth: 35 }, 3: { halign: 'right' } },
    });

    addPdfFooter(doc);
    doc.save(filename);
    } catch (error) {
      console.error('PDF generation failed (Land Cost Sheet):', error);
      alert('PDF generation failed. Please check data and try again.');
    }
 };

  const handleDownloadLedgerPDF = async () => {
    const villageName = identity.village ? identity.village.replace(/\s+/g, '_') : 'Village';
    const fromDate = new Date(ledgerRange.from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const toDate = new Date(ledgerRange.to).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    const filename = `LEDGER_${villageName}_${fromDate}_to_${toDate}.pdf`;
    const doc = await createPdfDoc('portrait');
    if (!doc) {
      console.error('PDF generation failed: jsPDF runtime unavailable (Ledger Statement).');
      alert('PDF generation failed. Please refresh and try again.');
      return;
    }

    try {
    const transactions = getFilteredLedger();
    const total = transactions.reduce((sum, item) => sum + item.amount, 0);

    addPdfHeader(doc, 'EXPENSE LEDGER STATEMENT', `Project: ${identity.village || 'Unnamed Project'} | Period: ${fromDate} to ${toDate}`);

    autoTable(doc, {
      ...pdfTableDefaults,
      startY: 78,
      margin: { left: 40, right: 40 },
      head: [['Date', 'Description / Expense Name', 'Amount']],
      body: transactions.map((item) => [
        new Date(`${item.date}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        item.name,
        formatCurrency(item.amount),
      ]),
      foot: [['', 'Grand Total for Period', formatCurrency(total)]],
      showFoot: 'lastPage',
      columnStyles: {
        0: { cellWidth: 100 },
        2: { halign: 'right', cellWidth: 110 },
      },
    });

    addPdfFooter(doc);
    doc.save(filename);
    } catch (error) {
      console.error('PDF generation failed (Ledger Statement):', error);
      alert('PDF generation failed. Please check data and try again.');
    }
  };

  // Reactive Handlers
  const handlePricePerVighaChange = (val: string) => {
    const rawPrice = parseInputNumber(val);
    
    // 1. Calculate the correct area based on the Price Basis (Vigha vs Vaar 60%)
    let vighaArea = 0;
    const inputArea = Number(measurements.areaInput);
    if (measurements.inputUnit === 'Vigha') vighaArea = inputArea;
    else vighaArea = inputArea / CONVERSION_RATES[measurements.inputUnit];

    // If Vaar is selected, the area used for pricing is 60% of total land
    const pricingArea = financials.priceBasis === 'Vigha' 
      ? vighaArea 
      : (vighaArea * CONVERSION_RATES.Vaar * 0.60);

    const newDealPrice = (rawPrice === '' ? 0 : rawPrice) * pricingArea;

    // 2. Update DP Amount if Percent is already set
    const pct = Number(financials.downPaymentPercent);
    const newDpAmount = (financials.downPaymentPercent !== '' && rawPrice !== '') 
      ? newDealPrice * (pct / 100) 
      : (financials.downPaymentAmount === '' ? '' : Number(financials.downPaymentAmount));

    setFinancials(prev => ({ 
      ...prev, 
      pricePerVigha: rawPrice,
      downPaymentAmount: newDpAmount === '' ? '' : parseFloat(newDpAmount.toFixed(2))
    }));
  };

 const handleDpPercentChange = (val: string) => {
    const pct = parseInputNumber(val);
    
    // Calculate effective deal price based on basis
    const vighaArea = result?.inputInVigha || 0;
    const pricingArea = financials.priceBasis === 'Vigha' 
      ? vighaArea 
      : (vighaArea * CONVERSION_RATES.Vaar * 0.60);

    const totalDeal = (Number(financials.pricePerVigha) || 0) * pricingArea;
    const amt = pct !== '' ? totalDeal * (pct / 100) : '';
    
    setFinancials(prev => ({ 
        ...prev, 
        downPaymentPercent: pct, 
        downPaymentAmount: amt !== '' ? parseFloat(amt.toFixed(2)) : '' 
    }));
  };

const handleDpAmountChange = (val: string) => {
  const amt = parseInputNumber(val);
  
  // 1. Get the base area in Vigha
  const vighaArea = result?.inputInVigha || 0;

  // 2. Determine the pricing area (100% for Vigha, 60% for Vaar)
  const pricingArea = financials.priceBasis === 'Vigha' 
    ? vighaArea 
    : (vighaArea * CONVERSION_RATES.Vaar * 0.60);

  // 3. Calculate Total Deal Price based on the current basis
  const totalDeal = (Number(financials.pricePerVigha) || 0) * pricingArea;
  
  let pct: number | '' = '';
  
  if (totalDeal > 0 && amt !== '') {
    // 4. Calculate PCT against the relevant deal price
    pct = parseFloat(((Number(amt) / totalDeal) * 100).toFixed(2));
  }

  setFinancials(prev => ({ 
    ...prev, 
    downPaymentAmount: amt, 
    downPaymentPercent: pct 
  }));
};

  // Custom Expense Handlers
  // New State for Section 5 visibility
  const [showExpenseBreakdown, setShowExpenseBreakdown] = useState(false);

  const addCustomExpense = () => {
    setOverheads(prev => ({
      ...prev,
      customExpenses: [
        ...(prev.customExpenses || []), 
        { 
          id: Math.random().toString(), 
          name: '', 
          amount: 0, 
          date: new Date().toISOString().split('T')[0],
          history: [] // Stores additional top-ups: { date: string, amount: number }
        }
      ]
    }));
  };

  const updateCustomExpense = (id: string, field: 'name' | 'amount', val: string) => {
    setOverheads(prev => ({
      ...prev,
      customExpenses: (prev.customExpenses || []).map(item => 
        item.id === id ? { ...item, [field]: field === 'amount' ? parseInputNumber(val) : val } : item
      )
    }));
  };

  const removeCustomExpense = (id: string) => {
    setOverheads(prev => ({
      ...prev,
      customExpenses: (prev.customExpenses || []).filter(item => item.id !== id)
    }));
  };

  const getFilteredLedger = () => {
    const allTransactions: { date: string; name: string; amount: number }[] = [];
    
    (overheads.customExpenses || []).forEach(item => {
      // 1. Add the base payment
      if (item.amount > 0) {
        allTransactions.push({ 
          date: item.date || financials.purchaseDate, 
          name: item.name || 'Unnamed Expense', 
          amount: Number(item.amount) 
        });
      }
      // 2. Add all top-up history
      (item.history || []).forEach((h: any) => {
        allTransactions.push({ 
          date: h.date, 
          name: item.name || 'Unnamed Expense', 
          amount: Number(h.amount) 
        });
      });
    });

    // 3. Filter by range and sort newest first
    return allTransactions
      .filter(t => t.date >= ledgerRange.from && t.date <= ledgerRange.to)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getNum = (val: number | string) => (val === '' ? 0 : Number(val));
  const calculatedDealPrice = financials.priceBasis === 'Vigha'
    ? getNum(financials.pricePerVigha) * (result?.inputInVigha || 0)
    : getNum(financials.pricePerVigha) * ((result?.inputInVigha || 0) * CONVERSION_RATES.Vaar * 0.60);
    
  const calculatedStampDuty = (result?.totalJantriValue || 0) * (getNum(overheads.stampDutyPercent) / 100);
  const convertValue = (valInVigha: number, unit: UnitType) => valInVigha * CONVERSION_RATES[unit];

  // Dynamic Values
  const currentStampDuty = result ? (costSheetBasis === '100' ? result.stampDuty100 : result.stampDuty60) : 0;
  const currentLandedCost = result ? (costSheetBasis === '100' ? result.landedCost100 : result.landedCost60) : 0;
  const currentJantriDisplay = result ? (costSheetBasis === '100' ? result.totalJantriValue : result.fpJantriValue) : 0;

  const displayCostPerSqMt = result ? (costSheetBasis === '100' ? result.costPerSqMt100 : result.costPerSqMt60) : 0;
  const displayCostPerVaar = result ? (costSheetBasis === '100' ? result.costPerVaar100 : result.costPerVaar60) : 0;
  const displayCostPerVigha = result ? (costSheetBasis === '100' ? result.costPerVigha100 : result.costPerVigha60) : 0;

  // Styles
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1";
  const inputClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-safety-500 focus:border-safety-500 block p-2.5 outline-none transition-all";
  const selectClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-safety-500 focus:border-safety-500 block p-2.5 outline-none transition-all";

  return (
    <div className="min-h-screen pb-12 bg-slate-50 text-slate-800 animate-in fade-in duration-500 font-sans">
      
     {/* 📱 MOBILE-OPTIMIZED HEADER */}
      <header className="bg-white border-b border-slate-200 py-3 md:py-4 px-3 md:px-8 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
             <button onClick={onBack} type="button" className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                <ArrowLeft size={18} />
             </button>
            <div>
              <h1 className="text-sm md:text-xl font-black flex items-center gap-1.5 text-slate-900 leading-tight">
                <span className="hidden xs:inline">Land Acquisition</span>
                <span className="xs:hidden">Acquisition</span>
              </h1>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 md:gap-3 justify-end shrink">
            {/* Save/Clear Group */}
            <div className="flex bg-slate-100 p-1 rounded-lg md:rounded-xl">
              <button onClick={handleSaveProject} title="Save" className="p-1.5 md:p-2 text-slate-500 hover:text-safety-600 transition-colors"><Save size={18} /></button>
              <button onClick={handleClear} title="Clear" className="p-1.5 md:p-2 text-slate-500 hover:text-red-500 transition-colors"><RotateCcw size={18} /></button>
            </div>

           {/* Ledger Button (Auto-Saves before opening) */}
            <button 
              onClick={async () => {
                await handleSaveProject(); // 💾 Save current state first
                setIsLedgerOpen(true);     // 🧾 Then open ledger
              }}
              className="bg-white border border-slate-200 p-2 md:px-4 md:py-2 rounded-lg md:rounded-xl text-slate-700 flex items-center gap-2 shadow-sm active:scale-95 hover:border-blue-200 transition-all"
            >
              <div className="relative">
                <Clock size={18} className="text-blue-500" />
                
              </div>
              <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">Ledger</span>
            </button>
            {/* PDF Button */}
            <button 
              onClick={handleDownloadPDF} 
              className="bg-safety-500 p-2 md:px-4 md:py-2 rounded-lg md:rounded-xl text-white flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <Download size={18} />
              <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">PDF</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Bento Grid */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">
        
        {/* 1. Land Identity */}
        <div className="md:col-span-5">
          <Card title="1. Land Identity" icon={<FileText size={20} />} className="h-full">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Village Name</label>
                <input type="text" autoComplete="off" value={identity.village} onChange={e => setIdentity({...identity, village: e.target.value})} className={inputClass} placeholder="Enter Name" />
              </div>
              <div>
                <label className={labelClass}>TP Scheme</label>
                <input type="text" inputMode="decimal" autoComplete="off" value={identity.tpScheme} onChange={e => setIdentity({...identity, tpScheme: e.target.value})} className={inputClass} placeholder="TP-1" />
              </div>
              <div>
                <label className={labelClass}>FP Number</label>
                <input type="text" inputMode="decimal" autoComplete="off" value={identity.fpNumber} onChange={e => setIdentity({...identity, fpNumber: e.target.value})} className={inputClass} placeholder="FP-101" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Block / Survey</label>
                <input type="text" inputMode="decimal" autoComplete="off" value={identity.blockSurveyNumber} onChange={e => setIdentity({...identity, blockSurveyNumber: e.target.value})} className={inputClass} placeholder="123 / 45" />
              </div>
            </div>
          </Card>
        </div>

        {/* 2. Measurement & Jantri */}
        <div className="md:col-span-7">
          <Card title="2. Measurement & Jantri" icon={<Ruler size={20} />} className="h-full">
            <div className="space-y-5">
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-8">
                  <label className={labelClass}>Area Input</label>
                  <input type="number" inputMode="decimal" autoComplete="off" value={measurements.areaInput} onChange={e => setMeasurements({...measurements, areaInput: e.target.value === '' ? '' : Number(e.target.value)})} className={`${inputClass} text-lg font-bold text-safety-600`} placeholder="0.00" />
                </div>
                <div className="col-span-4">
                  <label className={labelClass}>Unit</label>
                  <select value={measurements.inputUnit} onChange={e => setMeasurements({...measurements, inputUnit: e.target.value as UnitType})} className={selectClass}>
                    <option value="SqMeter">Sq Mt</option>
                    <option value="Vigha">Vigha</option>
                    <option value="Vaar">Vaar</option>
                    <option value="Guntha">Guntha</option>
                    <option value="SqKm">Sq Km</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex items-center justify-between">
                 <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                    <ArrowDown size={12} /> Converted
                 </div>
                 <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-slate-800 block leading-none mb-1">
                       {result ? convertValue(result.inputInVigha, measurements.displayUnit).toFixed(2) : '0.00'}
                    </span>
                    <select 
                      value={measurements.displayUnit}
                      onChange={e => setMeasurements({...measurements, displayUnit: e.target.value as UnitType})}
                      className="bg-transparent text-[10px] font-bold text-safety-600 outline-none text-right w-full cursor-pointer uppercase tracking-wider"
                    >
                       <option value="Vigha">Vigha</option>
                       <option value="SqMeter">Sq Mt</option>
                       <option value="Vaar">Vaar</option>
                       <option value="Guntha">Guntha</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Jantri Rate (₹/SqMt)</label>
                  <input type="number" inputMode="decimal" autoComplete="off" value={measurements.jantriRate} onChange={e => setMeasurements({...measurements, jantriRate: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Plotted Area (Sellable)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      value={measurements.plottedArea || ''} 
                      onChange={e => setMeasurements({...measurements, plottedArea: e.target.value === '' ? '' : Number(e.target.value)})} 
                      className={inputClass} 
                      placeholder="Area" 
                    />
                    <select 
                      value={measurements.plottedUnit || 'Vaar'} 
                      onChange={e => setMeasurements({...measurements, plottedUnit: e.target.value as UnitType})} 
                      className="bg-white border border-slate-300 text-slate-800 text-sm rounded-lg outline-none w-24"
                    >
                        <option value="SqMeter">Sq Mt</option>
                        <option value="Vaar">Vaar</option>
                        <option value="Vigha">Vigha</option>
                        <option value="Guntha">Guntha</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Land Analysis Section - Explicitly showing 100% Jantri */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Land Analysis</h4>
                  <select value={analysisUnit} onChange={e => setAnalysisUnit(e.target.value as UnitType)} className="bg-white border border-slate-300 text-slate-600 px-2 py-1 text-[10px] font-bold rounded shadow-sm outline-none">
                      <option value="Vigha">Vigha</option>
                      <option value="SqMeter">Sq Mt</option>
                      <option value="Vaar">Vaar</option>
                   </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Total 100% */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                     <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total (100%)</div>
                     <div className="text-base font-bold text-slate-800">{result ? convertValue(result.inputInVigha, analysisUnit).toFixed(2) : '0.00'} <span className="text-[10px] text-slate-400">{analysisUnit}</span></div>
                     <div className="mt-2 pt-2 border-t border-slate-100 text-xs font-mono font-bold text-safety-600 block text-right">{formatCurrency(result?.totalJantriValue || 0)}</div>
                  </div>
                  {/* FP 60% */}
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                     <div className="text-[10px] text-blue-400 font-bold uppercase mb-1">FP Land (60%)</div>
                     <div className="text-base font-bold text-slate-800">{result ? convertValue(result.fpInVigha, analysisUnit).toFixed(2) : '0.00'} <span className="text-[10px] text-slate-400">{analysisUnit}</span></div>
                     <div className="mt-2 pt-2 border-t border-blue-200 text-xs font-mono font-bold text-blue-600 block text-right">{formatCurrency(result?.fpJantriValue || 0)}</div>
                  </div>
                </div>
              </div>

            </div>
          </Card>
        </div>

        {/* 3. Deal Structure */}
        <div className="md:col-span-6">
          <Card title="3. Deal Structure" icon={<IndianRupee size={20} />} className="h-full">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={labelClass}>Price Per {financials.priceBasis}</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl scale-90 origin-right">
                    <button 
  type="button"
  onClick={() => {
    // 1. Update Basis
    const newBasis = 'Vigha';
    const vighaArea = result?.inputInVigha || 0;
    const newDealPrice = (Number(financials.pricePerVigha) || 0) * vighaArea;
    const newDpAmt = financials.downPaymentPercent !== '' ? newDealPrice * (Number(financials.downPaymentPercent) / 100) : financials.downPaymentAmount;

    setFinancials({...financials, priceBasis: newBasis, downPaymentAmount: newDpAmt});
  }}
  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${financials.priceBasis === 'Vigha' ? 'bg-safety-500 text-white shadow-sm' : 'text-slate-400'}`}
>VIGHA</button>

<button 
  type="button"
  onClick={() => {
    // 1. Update Basis
    const newBasis = 'Vaar';
    const pricingArea = (result?.inputInVigha || 0) * CONVERSION_RATES.Vaar * 0.60;
    const newDealPrice = (Number(financials.pricePerVigha) || 0) * pricingArea;
    const newDpAmt = financials.downPaymentPercent !== '' ? newDealPrice * (Number(financials.downPaymentPercent) / 100) : financials.downPaymentAmount;

    setFinancials({...financials, priceBasis: newBasis, downPaymentAmount: newDpAmt});
  }}
  className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${financials.priceBasis === 'Vaar' ? 'bg-safety-500 text-white shadow-sm' : 'text-slate-400'}`}
>VAAR (60%)</button>
                  </div>
                </div>
                <input 
                  type="text" 
                  inputMode="decimal"
                  autoComplete="off" 
                  value={formatInputNumber(financials.pricePerVigha)} 
                  onChange={e => handlePricePerVighaChange(e.target.value)} 
                  className={`${inputClass} font-bold text-lg text-safety-600`} 
                  placeholder={`Enter Rate per ${financials.priceBasis}`} 
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <div className="text-[10px] text-slate-500 font-bold uppercase">Total Deal Price (Calculated)</div>
                 <div className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(calculatedDealPrice)}</div>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-lg">
                <label className={labelClass}>Token / Down Payment</label>
                <div className="flex gap-4 items-center">
                  <div className="w-24 relative">
                     <input 
                        type="text" 
                        inputMode="decimal"
                        autoComplete="off" 
                        value={financials.downPaymentPercent} 
                        onChange={e => handleDpPercentChange(e.target.value)} 
                        className={`${inputClass} text-center pr-6 bg-slate-50`} 
                        placeholder=""
                     />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">%</span>
                  </div>
                  <ArrowRightLeft size={16} className="text-slate-400" />
                  <div className="flex-1 relative">
                    <input 
                        type="text" 
                        inputMode="decimal"
                        autoComplete="off" 
                        value={formatInputNumber(financials.downPaymentAmount)} 
                        onChange={e => handleDpAmountChange(e.target.value)} 
                        className={`${inputClass} text-right pr-6 font-bold bg-slate-50`} 
                        placeholder=""
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">₹</span>
                  </div>
                </div>
                
                {/* DP Duration Slider */}
                <div className="mt-4">
                   <div className="flex justify-between mb-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase">DP Duration</label>
                      <span className="text-xs font-bold text-slate-800">{financials.downPaymentDurationMonths} Months</span>
                   </div>
                   <input 
                      type="range" 
                      min="0" 
                      max="5" 
                      value={financials.downPaymentDurationMonths} 
                      onChange={e => setFinancials({...financials, downPaymentDurationMonths: parseInt(e.target.value)})}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-safety-500"
                   />
                   <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                      <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                   </div>
                </div>
              </div>

              <div>
                 <label className={labelClass}>Payment Timeline</label>
                 <div className="grid grid-cols-2 gap-4 mb-2">
                   <div>
                      <label className="text-[10px] text-slate-400 uppercase ml-1">Total Months</label>
                      <input type="number" inputMode="decimal" value={financials.totalDurationMonths} onChange={e => setFinancials({...financials, totalDurationMonths: e.target.value === '' ? '' : parseInt(e.target.value)})} className={inputClass} placeholder="Months" />
                   </div>
                   <div>
                      <label className="text-[10px] text-slate-400 uppercase ml-1">Installments</label>
                      <input 
                        type="number" 
                        inputMode="decimal"
                        value={financials.numberOfInstallments} 
                        onChange={e => setFinancials({...financials, numberOfInstallments: e.target.value === '' ? '' : parseInt(e.target.value)})} 
                        className={inputClass} 
                        placeholder="Count" 
                      />
                   </div>
                 </div>
                 <div className="text-[10px] text-safety-600 mt-2 flex items-center gap-1 font-bold ml-1">
                    <Clock size={10} /> Schedule starts after DP window
                 </div>
              </div>

               <div>
                  <label className={labelClass}>Purchase Date</label>
                  <input 
                    type="date" 
                    value={financials.purchaseDate} 
                    onChange={e => setFinancials({...financials, purchaseDate: e.target.value})} 
                    className={`${inputClass} text-slate-900 [color-scheme:light]`}
                  />
               </div>
            </div>
          </Card>
        </div>

        {/* 4. Project Expenses */}
        <div className="md:col-span-6">
           <Card title="4. Project Expenses" icon={<Calculator size={20} />} className="h-full">
            <div className="space-y-4">
              
              {/* Rate Input */}
              <div className="flex justify-between items-center">
                 <label className="text-xs font-bold text-slate-600 uppercase">Stamp Duty Rate</label>
                 <div className="flex items-center gap-2 bg-white border border-slate-300 rounded px-2 py-1">
                    <input 
                      type="number" 
                      inputMode="decimal"
                      step="0.1"
                      value={overheads.stampDutyPercent} 
                      onChange={e => setOverheads({...overheads, stampDutyPercent: e.target.value === '' ? '' : Number(e.target.value)})} 
                      className="w-12 text-right text-xs outline-none font-bold text-slate-800 bg-white"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">%</span>
                 </div>
              </div>

              {/* Split Stamp Duty Display */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">On 100% Land</div>
                    <div className="text-sm font-mono font-bold text-slate-800 mt-1">{formatCurrency(result?.stampDuty100 || 0)}</div>
                 </div>
                 <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div className="text-[10px] text-blue-400 font-bold uppercase">On 60% Land (FP)</div>
                    <div className="text-sm font-mono font-bold text-blue-600 mt-1">{formatCurrency(result?.stampDuty60 || 0)}</div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Architect Fees</label><input type="number" inputMode="decimal" autoComplete="off" value={overheads.architectFees} onChange={e => setOverheads({...overheads, architectFees: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
                <div><label className={labelClass}>Plan Pass Fees</label><input type="number" inputMode="decimal" autoComplete="off" value={overheads.planPassFees} onChange={e => setOverheads({...overheads, planPassFees: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
                <div><label className={labelClass}>NA Expense</label><input type="number" inputMode="decimal" autoComplete="off" value={overheads.naExpense} onChange={e => setOverheads({...overheads, naExpense: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
                <div><label className={labelClass}>NA Premium</label><input type="number" inputMode="decimal" autoComplete="off" value={overheads.naPremium} onChange={e => setOverheads({...overheads, naPremium: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
              <div className="col-span-2"><label className={labelClass}>Development Cost</label><input type="number" inputMode="decimal" autoComplete="off" value={overheads.developmentCost} onChange={e => setOverheads({...overheads, developmentCost: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
                
               {/* 📂 MOBILE-FIRST EXPENSE CARDS (Ultra-Clickable Date Picker) */}
                <div className="col-span-2 border-t border-slate-100 pt-5 mt-2">
                  {/* Search for editing rows */}
                  <div className="mb-4">
                    <input 
                      type="text"
                      placeholder="Find row 🔍"
                      value={expenseEntrySearch}
                      onChange={(e) => setExpenseEntrySearch(e.target.value)}
                      className="w-full h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 transition-all placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex justify-between items-center mb-4 px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extra Expenses</label>
                    <button onClick={addCustomExpense} className="text-[10px] flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl hover:bg-emerald-100 font-black transition-all shadow-sm">
                      <Plus size={14} /> NEW ROW
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(overheads.customExpenses || [])
                      .filter(item => item.name.toLowerCase().includes(expenseEntrySearch.toLowerCase()))
                      .map(item => (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-in slide-in-from-right-4 duration-300">
                        
                        {/* 1. Name & Delete */}
                        <div className="flex justify-between items-start gap-3 mb-4">
                          <div className="flex-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Expense Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Brokerage" 
                              value={item.name} 
                              onChange={e => updateCustomExpense(item.id, 'name', e.target.value)} 
                              className="w-full text-sm font-bold text-slate-800 outline-none placeholder:text-slate-200 bg-transparent border-b border-slate-50 focus:border-emerald-200 pb-1 transition-colors" 
                            />
                          </div>
                          <button onClick={() => removeCustomExpense(item.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* 2. Base Date & Total Row */}
                        <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-50">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Date</label>
                            {/* THE FULL CLICKABLE WRAPPER */}
                            <div className="relative w-full h-11 group/date">
                               <input 
                                  type="date" 
                                  value={item.date || new Date().toISOString().split('T')[0]} 
                                  onChange={e => updateCustomExpense(item.id, 'date', e.target.value)} 
                                  onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch(err) {} }}
                                  className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" 
                               />
                               <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center gap-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 pointer-events-none select-none group-hover/date:border-safety-500 transition-all">
                                  <Calendar size={14} className="text-safety-600" />
                                  <span className="text-[11px] font-bold pt-0.5">
                                    {new Date(`${item.date || new Date().toISOString().split('T')[0]}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                               </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block text-right">Total (₹)</label>
                            <div className="flex items-center justify-end bg-slate-900 text-emerald-400 px-3 h-11 rounded-xl shadow-inner">
                              <input 
                                type="text" 
                                inputMode="decimal" 
                                value={formatInputNumber(item.amount)} 
                                onChange={e => updateCustomExpense(item.id, 'amount', e.target.value)} 
                                className="w-full bg-transparent font-mono font-bold text-xs outline-none text-right" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* 3. Add More Drawer */}
                        <div className="mt-4">
                          <div className="flex justify-end">
                           <button 
                              type="button"
                              onClick={() => {
                                if (addingToId !== item.id) {
                                  setTempAddDate(new Date().toISOString().split('T')[0]);
                                }
                                setAddingToId(addingToId === item.id ? null : item.id);
                              }}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm ${addingToId === item.id ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}
                            >
                              {addingToId === item.id ? 'CANCEL' : <><Plus size={14} /> ADD PAYMENT</>}
                            </button>
                          </div>

                          <div className={`grid transition-all duration-300 ease-in-out ${addingToId === item.id ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                            <div className="overflow-hidden">
                              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[9px] font-black text-blue-400 uppercase ml-1 block mb-1">New Date</label>
                                    <div className="relative w-full h-11 group/newdate">
                                       <input 
                                          type="date" 
                                          id={`date-add-${item.id}`}
                                          value={tempAddDate}
                                          onChange={(e) => setTempAddDate(e.target.value)}
                                          onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch(err) {} }}
                                          className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" 
                                       />
                                       <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center gap-2 border border-blue-100 rounded-xl bg-white text-blue-600 pointer-events-none select-none group-hover/newdate:border-blue-400 transition-all">
                                          <Calendar size={14} />
                                          <span className="text-[11px] font-bold pt-0.5">
                                             {new Date(`${tempAddDate}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                          </span>
                                       </div>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[9px] font-black text-blue-400 uppercase ml-1 block mb-1 text-right">Amount</label>
                                    <input 
                                      type="number"
                                      placeholder="₹ 0.00"
                                      id={`amt-add-${item.id}`}
                                      className="w-full bg-white border border-blue-100 rounded-xl px-3 text-xs text-blue-700 outline-none font-bold h-11 shadow-sm"
                                    />
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                 onClick={() => {
                                    const dateVal = tempAddDate;
                                    const amtVal = parseFloat((document.getElementById(`amt-add-${item.id}`) as HTMLInputElement).value) || 0;
                                    if (amtVal > 0) {
                                      const newHistory = [...(item.history || []), { date: dateVal, amount: amtVal }];
                                      const newTotal = (Number(item.amount) || 0) + amtVal;
                                      setOverheads(prev => ({
                                        ...prev,
                                        customExpenses: (prev.customExpenses || []).map(ex => 
                                          ex.id === item.id ? { ...ex, amount: newTotal, history: newHistory } : ex
                                        )
                                      }));
                                    }
                                    setAddingToId(null);
                                  }}
                                  className="w-full bg-blue-600 text-white h-12 rounded-xl flex items-center justify-center gap-2 font-black text-xs tracking-widest active:scale-95 transition-all shadow-lg shadow-blue-200"
                                >
                                  <CheckCircle size={18} /> CONFIRM ADDITION
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </Card>
        </div>

        {/* 5. Project Cost Sheet Summary (Collapsible Version) */}
        <div className="md:col-span-12">
          <Card 
            title="5. Project Cost Sheet" 
            icon={<FileText size={20} />}
            action={
                <div className="flex bg-slate-100 rounded-lg p-1">
                   <button onClick={() => setCostSheetBasis('100')} type="button" className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${costSheetBasis === '100' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>100%</button>
                   <button onClick={() => setCostSheetBasis('60')} type="button" className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${costSheetBasis === '60' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>60%</button>
                </div>
            }
          >
            {result ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Breakdown */}
                <div className="flex flex-col justify-center">
                  <div className="space-y-4 text-sm">
                    {/* Basic Costs */}
                    <div className="space-y-2">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <div className="text-slate-500 font-medium">Total Deal Price</div>
                        <div className="text-right font-bold text-slate-900">{formatCurrency(calculatedDealPrice)}</div>
                      </div>
                      
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <div className="text-slate-500 font-medium">Stamp Duty & Reg ({costSheetBasis}%)</div>
                        <div className={`text-right font-bold ${costSheetBasis === '100' ? 'text-slate-900' : 'text-blue-600'}`}>{formatCurrency(currentStampDuty)}</div>
                      </div>
                    </div>

                    {/* Collapsible Additional Expenses Section */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all duration-300">
                      <button 
                        type="button"
                        onClick={() => setShowExpenseBreakdown(!showExpenseBreakdown)}
                        className="w-full flex justify-between items-center p-4 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                           <div className={`p-1 rounded-md bg-white border border-slate-200 transition-transform duration-300 ${showExpenseBreakdown ? 'rotate-180' : ''}`}>
                             <ArrowDown size={14} className="text-slate-500" />
                           </div>
                           <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Additional Expenses</span>
                        </div>
                        <span className="font-black text-slate-900">{formatCurrency(result.totalAdditionalExpenses)}</span>
                      </button>

                      {/* The Animated Dropdown List with Scrollbar */}
                      <div className={`px-4 transition-all duration-300 ease-in-out overflow-hidden ${showExpenseBreakdown ? 'max-h-[250px] pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="space-y-2 pt-2 border-t border-slate-200/50 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                          {getNum(overheads.architectFees) > 0 && <div className="flex justify-between text-[11px] text-slate-500 pl-7"><span>Architect Fees</span><span className="font-mono">{formatCurrency(Number(overheads.architectFees))}</span></div>}
                          {getNum(overheads.planPassFees) > 0 && <div className="flex justify-between text-[11px] text-slate-500 pl-7"><span>Plan Pass Fees</span><span className="font-mono">{formatCurrency(Number(overheads.planPassFees))}</span></div>}
                          {getNum(overheads.naExpense) > 0 && <div className="flex justify-between text-[11px] text-slate-500 pl-7"><span>NA Expense</span><span className="font-mono">{formatCurrency(Number(overheads.naExpense))}</span></div>}
                          {getNum(overheads.naPremium) > 0 && <div className="flex justify-between text-[11px] text-slate-500 pl-7"><span>NA Premium</span><span className="font-mono">{formatCurrency(Number(overheads.naPremium))}</span></div>}
                          {getNum(overheads.developmentCost) > 0 && <div className="flex justify-between text-[11px] text-slate-500 pl-7"><span>Development Cost</span><span className="font-mono">{formatCurrency(Number(overheads.developmentCost))}</span></div>}
                          
                          {(overheads.customExpenses || []).map(item => (
                            getNum(item.amount) > 0 && (
                              <div key={item.id} className="flex justify-between text-[11px] text-slate-600 pl-7 border-l-2 border-slate-200 ml-1 py-1">
                                <span>{item.name || 'Extra Item'}</span>
                                <span className="font-bold font-mono">{formatCurrency(Number(item.amount))}</span>
                              </div>
                            )
                          ))}
                        </div>
                        {/* Visual indicator for more items */}
                        {showExpenseBreakdown && (overheads.customExpenses?.length || 0) > 5 && (
                          <div className="text-center text-[9px] text-slate-300 font-bold uppercase mt-2 tracking-widest">
                            Scroll to see more
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Total Box - Always Visible */}
                    <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl mt-2 shadow-lg shadow-slate-200 border border-slate-800 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800"></div>
                      <div className="text-white font-bold text-lg relative z-10">Total Project Cost</div>
                      <div className="text-right font-bold text-2xl text-emerald-400 relative z-10">{formatCurrency(currentLandedCost)}</div>
                    </div>
                  </div>
                </div>
                
                {/* Right: Pie Chart */}
                <div className="flex items-center justify-center bg-white rounded-2xl border border-slate-100 p-4 shadow-inner min-h-[300px]">
                   <div className="w-full h-full flex flex-col">
                      <div className="text-center text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-tighter">Investment Distribution</div>
                      <SummaryChart landCost={calculatedDealPrice} stampDuty={currentStampDuty} development={result.totalAdditionalExpenses} />
                   </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-12 italic bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                Complete land details to generate cost sheet
              </div>
            )}
          </Card>
        </div>

        {/* 6. Unit Costs */}
       {result && (
          <div className="md:col-span-12">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {['Sq Mt', 'Vaar', 'Vigha'].map((u, i) => (
                   <div key={u} className="bg-white border border-slate-200 p-6 rounded-xl text-center shadow-sm flex flex-col justify-center">
                      <div className="text-xs text-slate-400 font-bold uppercase mb-2 tracking-wider">Cost / {u} {measurements.plottedArea ? '(Plotted)' : '(Total)'}</div>
                      <div className="text-2xl font-bold text-slate-800">{formatCurrency(i===0 ? displayCostPerSqMt : i===1 ? displayCostPerVaar : displayCostPerVigha)}</div>
                   </div>
                 ))}
             </div>
          </div>
        )}

        {/* 7. Payment Schedule */}
        <div className="md:col-span-12">
          <Card title="6. Payment Schedule" icon={<CalendarDays size={20} />}>
            {result ? (
              <div className="flex flex-col h-full">
                <div className={`mb-6 border p-4 rounded-lg flex justify-between items-center ${costSheetBasis === '100' ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-100'}`}>
                   <div>
                     <span className={`block text-xs font-bold uppercase ${costSheetBasis === '100' ? 'text-slate-600' : 'text-blue-600'}`}>
                        Govt. Jantri Value ({costSheetBasis === '100' ? 'Total' : 'FP'})
                     </span>
                     <span className="text-[10px] text-slate-400 font-semibold">Paid at Registry (Not in Deal Price)</span>
                   </div>
                   <div className={`text-xl font-mono font-bold ${costSheetBasis === '100' ? 'text-slate-700' : 'text-blue-700'}`}>
                      {formatCurrency(currentJantriDisplay)}
                   </div>
                </div>
                
               <div className="overflow-x-auto rounded-lg border border-slate-200 pb-2">
                  <table className="w-full text-sm text-left border-collapse min-w-[600px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3">Due Date</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {result.schedule.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-700">{item.description}</td>
                          <td className="px-5 py-3 text-slate-500 font-medium whitespace-nowrap">{item.date}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-700 font-mono whitespace-nowrap">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td className="px-5 py-4 text-slate-800" colSpan={2}>Total Payable to Land Owner</td>
                        <td className="px-5 py-4 text-right text-safety-600 font-mono text-base">{formatCurrency(result.grandTotalPayment)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
               <div className="text-center text-slate-400 py-8 italic">Schedule will generate automatically</div>
            )}
          </Card>
        </div>

      </main>

      {/* Success Notification Overlay */}
      {showSaveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 animate-in zoom-in duration-300">
            <CheckCircle size={32} strokeWidth={3} />
            <span className="font-bold text-lg">Saved Successfully</span>
          </div>
        </div>
      )}
      
      <div id="pdf-template" style={{ display: 'none', width: '700px', backgroundColor: '#fff', color: '#000000', fontFamily: 'sans-serif', fontSize: '11px', lineHeight: '1.5' }}>
          
          <div style={{ padding: '40px' }}>
            
            {/* 1. HEADER */}
            <div style={{ borderBottom: '2px solid #ea580c', paddingBottom: '15px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
               <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#000000' }}>LAND ACQUISITION REPORT</h1>
                  <p style={{ margin: '4px 0 0', color: '#333333', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>GDK NEXUS 2442</p>
               </div>
                <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000000' }}>{formatDate(new Date())}</div>
                 <div style={{ fontSize: '9px', color: '#333333', marginTop: '4px', whiteSpace: 'nowrap' }}>
                    Village: {identity.village || '-'} | TP Scheme: {identity.tpScheme || '-'} | Block No: {identity.blockSurveyNumber || '-'} | FP No: {identity.fpNumber || '-'}
                 </div>
               </div>
            </div>

            {/* 2. SECTION A: LAND ANALYSIS (COMPARISON) */}
            <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
               <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #9ca3af', paddingBottom: '5px', marginBottom: '10px', color: '#000000', textTransform: 'uppercase' }}>A. Land Analysis</h3>
                
                {/* Plotted Area Display (Only if entered) */}
                {measurements.plottedArea && (
                   <div style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#ecfdf5', border: '1px solid #10b981', borderRadius: '4px', color: '#065f46', fontWeight: 'bold', fontSize: '11px' }}>
                      User Defined Plotted Area: {measurements.plottedArea} {measurements.plottedUnit}
                   </div>
                )}

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                   <thead style={{ backgroundColor: '#f3f4f6', color: '#000000' }}>
                      <tr>
                         <th style={{ textAlign: 'left', padding: '8px', width: '30%' }}>Metric</th>
                         <th style={{ textAlign: 'right', padding: '8px', width: '35%' }}>Total Land (100%)</th>
                         <th style={{ textAlign: 'right', padding: '8px', width: '35%' }}>FP Land (60%)</th>
                      </tr>
                   </thead>
                   <tbody>
                      <tr>
                         <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af' }}>Area (Sq Mt)</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold' }}>{result?.totalSqMt.toFixed(2)}</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold', color: '#1e3a8a' }}>{result?.fpAreaSqMt.toFixed(2)}</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af' }}>Area (Vigha)</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold' }}>{result ? convertValue(result.inputInVigha, 'Vigha').toFixed(2) : '-'}</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold', color: '#1e3a8a' }}>{result ? convertValue(result.fpInVigha, 'Vigha').toFixed(2) : '-'}</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af' }}>Jantri Value</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold' }}>{formatCurrency(result?.totalJantriValue || 0)}</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold', color: '#1e3a8a' }}>{formatCurrency(result?.fpJantriValue || 0)}</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af' }}>Stamp Duty ({overheads.stampDutyPercent}%)</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold' }}>{formatCurrency(result?.stampDuty100 || 0)}</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold', color: '#1e3a8a' }}>{formatCurrency(result?.stampDuty60 || 0)}</td>
                      </tr>
                   </tbody>
                </table>
            </div>

            {result && (
              <>
                {/* 3. SECTION B: DEAL STRUCTURE */}
                <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                   <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #9ca3af', paddingBottom: '5px', marginBottom: '10px', color: '#000000', textTransform: 'uppercase' }}>B. Deal Structure</h3>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '6px' }}>
                     <div style={{ flex: '1 1 40%' }}>
                         <div style={{ fontSize: '9px', color: '#333333' }}>Price Per {financials.priceBasis} {financials.priceBasis === 'Vaar' ? '(60% Land)' : ''}</div>
                         <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000' }}>{formatCurrency(Number(financials.pricePerVigha))}</div>
                      </div>
                      <div style={{ flex: '1 1 40%' }}>
                         <div style={{ fontSize: '9px', color: '#333333' }}>Total Deal Price</div>
                         <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000' }}>{formatCurrency(calculatedDealPrice)}</div>
                      </div>
                      <div style={{ flex: '1 1 40%' }}>
                         <div style={{ fontSize: '9px', color: '#333333' }}>Down Payment</div>
                         <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000' }}>
                            {formatCurrency(Number(financials.downPaymentAmount))} ({financials.downPaymentPercent}%)
                         </div>
                         <div style={{ fontSize: '10px', color: '#c2410c' }}>Window: {financials.downPaymentDurationMonths} Months</div>
                      </div>
                      <div style={{ flex: '1 1 40%' }}>
                         <div style={{ fontSize: '9px', color: '#333333' }}>Installments</div>
                         <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000' }}>
                            {financials.numberOfInstallments} Payments
                         </div>
                         <div style={{ fontSize: '10px', color: '#333333' }}>Total Duration: {financials.totalDurationMonths} Months</div>
                      </div>
                   </div>
                </div>

               {/* 4. SECTION C: COST METRICS COMPARISON */}
                <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                   <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #9ca3af', paddingBottom: '5px', marginBottom: '10px', color: '#000000', textTransform: 'uppercase' }}>C. Cost Metrics Comparison</h3>
                   
                   {measurements.plottedArea && (
                      <p style={{ fontSize: '9px', color: '#6b7280', margin: '0 0 5px 0' }}>
                         * Costs calculated using Plotted Area ({measurements.plottedArea} {measurements.plottedUnit}) as the denominator.
                      </p>
                   )}

                   <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead style={{ backgroundColor: '#f3f4f6' }}>
                         <tr>
                            <th style={{ textAlign: 'left', padding: '8px', width: '30%', color: '#000000' }}>Unit Cost</th>
                            <th style={{ textAlign: 'right', padding: '8px', width: '35%', color: '#000000' }}>On 100% Basis</th>
                            <th style={{ textAlign: 'right', padding: '8px', width: '35%', color: '#000000' }}>On 60% Basis</th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af' }}>Cost per Sq Mt</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold' }}>{formatCurrency(result.costPerSqMt100)}</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold', color: '#1e3a8a' }}>{formatCurrency(result.costPerSqMt60)}</td>
                         </tr>
                         <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af' }}>Cost per Vigha</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold' }}>{formatCurrency(result.costPerVigha100)}</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold', color: '#1e3a8a' }}>{formatCurrency(result.costPerVigha60)}</td>
                         </tr>
                         <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af' }}>Cost per Vaar</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold' }}>{formatCurrency(result.costPerVaar100)}</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #9ca3af', fontWeight: 'bold', color: '#1e3a8a' }}>{formatCurrency(result.costPerVaar60)}</td>
                         </tr>
                      </tbody>
                   </table>
                </div>

                {/* 5. SECTION D: PROJECT EXPENSES & TOTAL */}
                <div style={{ marginBottom: '30px', pageBreakInside: 'avoid' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #9ca3af', paddingBottom: '5px', marginBottom: '10px', color: '#000000', textTransform: 'uppercase' }}>D. Project Expenses & Total ({costSheetBasis}%)</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px' }}>
                     <tbody>
                       {/* 1. Stamp Duty */}
                       <tr className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <td style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#000000' }}>1. Stamp Duty & Registration ({costSheetBasis === '100' ? '100% Land' : '60% FP'})</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', color: '#000000' }}>{formatCurrency(currentStampDuty)}</td>
                       </tr>
                       
                       {/* 2. Additional Expenses Header */}
                       <tr className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <td colSpan={2} style={{ padding: '8px 0 4px', fontWeight: 'bold', color: '#333333', fontSize: '10px', textTransform: 'uppercase' }}>2. Additional Expenses Breakdown</td>
                       </tr>

                       {/* List of Extras */}
                       {getNum(overheads.architectFees) > 0 && <tr className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}><td style={{ padding: '4px 0 4px 15px', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>Architect Fees</td><td style={{ textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>{formatCurrency(Number(overheads.architectFees))}</td></tr>}
                       {getNum(overheads.planPassFees) > 0 && <tr className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}><td style={{ padding: '4px 0 4px 15px', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>Plan Pass Fees</td><td style={{ textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>{formatCurrency(Number(overheads.planPassFees))}</td></tr>}
                       {getNum(overheads.naExpense) > 0 && <tr className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}><td style={{ padding: '4px 0 4px 15px', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>NA Expense</td><td style={{ textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>{formatCurrency(Number(overheads.naExpense))}</td></tr>}
                       {getNum(overheads.naPremium) > 0 && <tr className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}><td style={{ padding: '4px 0 4px 15px', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>NA Premium</td><td style={{ textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>{formatCurrency(Number(overheads.naPremium))}</td></tr>}
                       {getNum(overheads.developmentCost) > 0 && <tr className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}><td style={{ padding: '4px 0 4px 15px', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>Development Cost</td><td style={{ textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>{formatCurrency(Number(overheads.developmentCost))}</td></tr>}
                       
                       {/* Custom Expenses List in PDF */}
                       {(overheads.customExpenses || []).map(item => (
                          getNum(item.amount) > 0 && (
                            <tr key={item.id} className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                              <td style={{ padding: '4px 0 4px 15px', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>{item.name || 'Extra Expense'}</td>
                              <td style={{ textAlign: 'right', borderBottom: '1px solid #f3f4f6', color: '#333333' }}>{formatCurrency(Number(item.amount))}</td>
                            </tr>
                          )
                       ))}

                       {/* Total Additional Expenses Subtotal */}
                       <tr className="pdf-row" style={{ backgroundColor: '#f9fafb', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#4b5563', fontSize: '11px' }}>Total Additional Expenses</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#4b5563', fontSize: '11px' }}>{formatCurrency(result.totalAdditionalExpenses)}</td>
                       </tr>

                       {/* Grand Total */}
                       <tr className="pdf-row" style={{ backgroundColor: '#fff7ed', borderTop: '2px solid #ea580c', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#c2410c', fontSize: '12px' }}>FINAL PROJECT COST ({costSheetBasis}%)</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: '#c2410c', fontSize: '14px' }}>{formatCurrency(currentLandedCost)}</td>
                       </tr>
                       
                       {/* Total Project Cost */}
                       <tr className="pdf-row" style={{ backgroundColor: '#fff7ed', borderTop: '2px solid #ea580c', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#c2410c', fontSize: '12px' }}>TOTAL PROJECT COST ({costSheetBasis}%)</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: '#c2410c', fontSize: '14px' }}>{formatCurrency(currentLandedCost)}</td>
                       </tr>
                     </tbody>
                  </table>
                </div>

                {/* 6. SECTION E: PAYMENT SCHEDULE */}
                <div style={{ marginTop: '30px' }}>
                   <div style={{ borderBottom: '2px solid #ea580c', paddingBottom: '10px', marginBottom: '20px' }}>
                      <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#000000' }}>E. PAYMENT SCHEDULE</h1>
                      <p style={{ margin: '4px 0 0', color: '#333333', fontSize: '10px' }}>Detailed Installment Plan</p>
                   </div>

                   <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                     <thead style={{ backgroundColor: '#f3f4f6' }}>
                       <tr>
                         <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #9ca3af', color: '#000000' }}>#</th>
                         <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #9ca3af', color: '#000000' }}>Description</th>
                         <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #9ca3af', color: '#000000' }}>Due Date</th>
                         <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #9ca3af', color: '#000000' }}>Amount</th>
                       </tr>
                     </thead>
                     <tbody>
                       {result.schedule.map((item, i) => (
                         <tr key={item.id} className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af', width: '30px' }}>{i+1}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af' }}>{item.description}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af' }}>{item.date}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #9ca3af', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.amount)}</td>
                         </tr>
                       ))}
                       <tr className="pdf-row" style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                         <td colSpan={3} style={{ padding: '10px', borderBottom: '1px solid #9ca3af', textTransform: 'uppercase', color: '#000000' }}>Total Payable to Land Owner</td>
                         <td style={{ padding: '10px', borderBottom: '1px solid #9ca3af', textAlign: 'right', color: '#000000' }}>{formatCurrency(result.grandTotalPayment)}</td>
                       </tr>
                     </tbody>
                   </table>

                   <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#eff6ff', border: '1px solid #9ca3af', borderRadius: '6px', fontSize: '10px', pageBreakInside: 'avoid' }}>
                      <strong style={{ color: '#1e3a8a', display: 'block', marginBottom: '5px' }}>Important Notes:</strong>
                      <ul style={{ margin: 0, paddingLeft: '15px', color: '#1e3a8a' }}>
                         <li style={{ marginBottom: '3px' }}>The Govt. Jantri Value ({formatCurrency(currentJantriDisplay)}) is <strong>excluded</strong> from this schedule (Paid via Cheque at Registry).</li>
                         <li>Installments are calculated after deducting the initial Down Payment window ({financials.downPaymentDurationMonths} Months).</li>
                      </ul>
                   </div>
               </div>
              </>
            )}
          </div>
      </div>
      
   {/* 🧾 EXPENSE LEDGER MODAL */}
      {isLedgerOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLedgerOpen(false)}></div>
          
          <div className="relative bg-white w-full max-w-2xl h-[85vh] md:h-auto md:max-h-[85vh] rounded-t-[2.5rem] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-400">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Clock className="text-blue-500" /> Expense Ledger
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Synced: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                </div>
                
                {/* 🚀 NEW SYNC BUTTON */}
                <button 
                  onClick={refreshProjectData}
                  disabled={isSyncing}
                  className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all active:scale-90 group"
                  title="Sync Latest Data"
                >
                  <RefreshCw 
                    size={18} 
                    className={`${isSyncing ? 'animate-spin text-blue-600' : 'group-hover:rotate-180 duration-500'}`} 
                  />
                </button>
              </div>

              <button onClick={() => setIsLedgerOpen(false)} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            {/* Date Range Selectors (Using your approved big-target UI) */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">From</label>
                <div className="relative h-11 group">
                   <input type="date" value={ledgerRange.from} onChange={(e) => setLedgerRange({...ledgerRange, from: e.target.value})} onClick={(e) => { try { (e.target as any).showPicker(); } catch(err) {} }} className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" />
                   <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center gap-2 border border-slate-200 rounded-xl bg-white text-slate-700 pointer-events-none group-hover:border-blue-400 transition-all">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="text-xs font-bold">{new Date(`${ledgerRange.from}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                   </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 text-right block">To</label>
                <div className="relative h-11 group">
                   <input type="date" value={ledgerRange.to} onChange={(e) => setLedgerRange({...ledgerRange, to: e.target.value})} onClick={(e) => { try { (e.target as any).showPicker(); } catch(err) {} }} className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" />
                   <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center gap-2 border border-slate-200 rounded-xl bg-white text-slate-700 pointer-events-none group-hover:border-blue-400 transition-all">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="text-xs font-bold">{new Date(`${ledgerRange.to}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
              {getFilteredLedger().length > 0 ? (
                getFilteredLedger().map((t, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">
                        {new Date(`${t.date}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-sm font-bold text-slate-800 mt-0.5">{t.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 block">{formatCurrency(t.amount)}</span>
                      <span className="text-[9px] font-bold text-emerald-500 uppercase">Paid</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <Calculator size={48} className="opacity-10 mb-4" />
                  <p className="font-bold text-sm">No expenses found for this range</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-white border-t border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total for Period</span>
                <span className="text-2xl font-black text-slate-900">
                  {formatCurrency(getFilteredLedger().reduce((sum, t) => sum + t.amount, 0))}
                </span>
              </div>
              <button 
                onClick={handleDownloadLedgerPDF}
                className="w-full bg-slate-900 text-white h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-sm tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all"
              >
                <Download size={20} /> DOWNLOAD STATEMENT
              </button>
            </div>
          </div>
        </div>
      )/* 📥 LEDGER PDF TEMPLATE (HIDDEN) */}
      <div id="ledger-pdf-template" style={{ display: 'none', width: '700px', backgroundColor: '#fff', color: '#000', fontFamily: 'sans-serif', padding: '40px' }}>
        {/* Header Section */}
        <div style={{ borderBottom: '2px solid #3b82f6', paddingBottom: '15px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#1e40af' }}>EXPENSE LEDGER STATEMENT</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>GDK NEXUS 2442 • PROPERTY AUDIT</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000' }}>Project: {identity.village || 'Unnamed Project'}</div>
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>FP No: {identity.fpNumber || '-'} | Block No: {identity.blockSurveyNumber || '-'}</div>
          </div>
        </div>

        {/* Date Range Summary */}
        <div style={{ backgroundColor: '#f8fafc', padding: '12px 15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>Statement Period</span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>
              {new Date(`${ledgerRange.from}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} to {new Date(`${ledgerRange.to}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>Total Period Expense</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af' }}>
              {formatCurrency(getFilteredLedger().reduce((sum, t) => sum + t.amount, 0))}
            </span>
          </div>
        </div>

        {/* Ledger Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr className="pdf-row" style={{ backgroundColor: '#f1f5f9', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#475569', width: '20%' }}>Date</th>
              <th style={{ padding: '12px 10px', textAlign: 'left', borderBottom: '2px solid #cbd5e1', color: '#475569', width: '55%' }}>Description / Expense Name</th>
              <th style={{ padding: '12px 10px', textAlign: 'right', borderBottom: '2px solid #cbd5e1', color: '#475569', width: '25%' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {getFilteredLedger().length > 0 ? (
              getFilteredLedger().map((t, i) => (
                <tr key={i} className="pdf-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', color: '#64748b' }}>
                    {new Date(`${t.date}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', color: '#1e293b' }}>
                    {t.name}
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                  No transactions recorded for this period.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="pdf-row" style={{ backgroundColor: '#f8fafc', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
              <td colSpan={2} style={{ padding: '15px 10px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px', color: '#334155', borderTop: '2px solid #cbd5e1' }}>
                GRAND TOTAL FOR PERIOD
              </td>
              <td style={{ padding: '15px 10px', textAlign: 'right', fontWeight: '900', fontSize: '14px', color: '#1e40af', borderTop: '2px solid #cbd5e1', fontFamily: 'monospace' }}>
                {formatCurrency(getFilteredLedger().reduce((sum, t) => sum + t.amount, 0))}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer Audit Info */}
        <div style={{ marginTop: '50px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '8px', color: '#94a3b8' }}>
            Report UID: {Math.random().toString(36).substr(2, 9).toUpperCase()} | System Generated
          </div>
          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 'bold' }}>
            Generated: {new Date().toLocaleString('en-GB')}
          </div>
        </div>
      </div>
      
    </div>
  );
};
