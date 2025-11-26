import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Ruler, 
  IndianRupee, 
  CalendarDays, 
  FileText, 
  Calculator,
  RotateCcw,
  Download,
  ArrowRightLeft,
  ArrowLeft,
  Clock,
  ArrowDown
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
  UnitType
} from '../types';
import { 
  formatCurrency, 
  formatDate, 
  addDays, 
  addMonths 
} from '../utils/formatters';

// Declare html2pdf for TypeScript
declare var html2pdf: any;

const CONVERSION_RATES = {
  Vigha: 1,
  SqMeter: 2377.73,
  Vaar: 2843.71,
  Guntha: 23.50,
  SqKm: 4.00
};

interface Props {
  onBack: () => void;
}

export const LandDealStructurer: React.FC<Props> = ({ onBack }) => {
  
  // --- STATE ---
  const [identity, setIdentity] = useState<LandIdentity>({
    village: '', tpScheme: '', fpNumber: '', blockSurveyNumber: '',
  });

  const [measurements, setMeasurements] = useState<Measurements>({
    areaInput: '',
    inputUnit: 'SqMeter',
    displayUnit: 'Vigha', 
    jantriRate: '',
  });

  const [analysisUnit, setAnalysisUnit] = useState<UnitType>('Vigha');

  const [financials, setFinancials] = useState<Financials>({
    pricePerVigha: '', 
    totalDealPrice: 0, 
    downPaymentPercent: '', // Default Empty
    downPaymentAmount: '', // Default Empty
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
    developmentCost: '', // New field
  });

  // View Toggle State for Cost Sheet
  const [costSheetBasis, setCostSheetBasis] = useState<'100' | '60'>('100');

  const [result, setResult] = useState<CalculationResult | null>(null);

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

    // 3. Jantri Logic
    const jantriRate = getNum(measurements.jantriRate);
    const totalJantriValue = totalSqMt * jantriRate;
    const fpJantriValue = fpAreaSqMt * jantriRate;

    // 4. Deal Price Logic
    const pricePerVigha = getNum(financials.pricePerVigha);
    const calculatedDealPrice = pricePerVigha * valInVigha;
    
    // 5. Financials
    let effectiveDpAmount = getNum(financials.downPaymentAmount);
    if (financials.downPaymentPercent !== '' && financials.downPaymentAmount === '') {
       effectiveDpAmount = calculatedDealPrice * (Number(financials.downPaymentPercent) / 100);
    }

    // 6. Stamp Duty (Split Calculation)
    const stampPercent = getNum(overheads.stampDutyPercent);
    const stampDuty100 = totalJantriValue * (stampPercent / 100);
    const stampDuty60 = fpJantriValue * (stampPercent / 100);

    // 7. Schedule Logic
    const schedule: PaymentScheduleItem[] = [];
    const purchaseDateObj = new Date(financials.purchaseDate);
    const totalMonths = getNum(financials.totalDurationMonths);
    const numInstallments = getNum(financials.numberOfInstallments);

    const dpDueDate = addDays(purchaseDateObj, 90);
    
    if (calculatedDealPrice > 0 || effectiveDpAmount > 0) {
      schedule.push({
        id: 1,
        date: formatDate(dpDueDate),
        description: 'Down Payment (Day 90)',
        amount: effectiveDpAmount,
        type: 'Token'
      });
    }

    const balanceToPay = calculatedDealPrice - effectiveDpAmount;
    const remainingDurationMonths = Math.max(0, totalMonths - 3);
    
    if (balanceToPay > 0 && numInstallments > 0 && remainingDurationMonths > 0) {
      const amountPerInstallment = balanceToPay / numInstallments;
      const startDate = addMonths(purchaseDateObj, 3);
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
    const totalAdditionalExpenses = 
      getNum(overheads.architectFees) + 
      getNum(overheads.planPassFees) + 
      getNum(overheads.naExpense) + 
      getNum(overheads.naPremium) + 
      getNum(overheads.developmentCost);

    // Landed Cost Scenarios
    const landedCost100 = calculatedDealPrice + stampDuty100 + totalAdditionalExpenses;
    const landedCost60 = calculatedDealPrice + stampDuty60 + totalAdditionalExpenses;

    const grandTotalPayment = schedule.reduce((sum, item) => sum + item.amount, 0);

    // 9. Unit Costs (Defaulting to 100% Basis for general metrics, or we could toggle this too)
    // For now, let's use 100% basis for unit costs as standard practice usually considers full stamp?
    // Actually, if the user toggles to 60%, they likely want to see costs based on that scenario.
    // However, types.ts only has one set of unit costs. I'll use the currently selected basis in the Render phase.
    // Here I'll just store placeholders or calculate based on 100 for now, UI will handle display math.
    
    // Helper for UI math
    const costPerSqMt = totalSqMt > 0 ? landedCost100 / totalSqMt : 0;
    const costPerVaar = totalVaar > 0 ? landedCost100 / totalVaar : 0;
    const costPerVigha = valInVigha > 0 ? landedCost100 / valInVigha : 0;

    setResult({
      totalSqMt, fpAreaSqMt, inputInVigha: valInVigha, fpInVigha,
      totalJantriValue, fpJantriValue, 
      stampDuty100, stampDuty60,
      totalAdditionalExpenses, 
      landedCost100, landedCost60,
      schedule, grandTotalPayment, 
      costPerSqMt, costPerVaar, costPerVigha // These are base 100% values
    });

  }, [measurements, financials, overheads]);

  // --- HANDLERS ---
  const handleClear = () => {
    setIdentity({ village: '', tpScheme: '', fpNumber: '', blockSurveyNumber: '' });
    setMeasurements({ areaInput: '', inputUnit: 'SqMeter', displayUnit: 'Vigha', jantriRate: '' });
    setFinancials({ pricePerVigha: '', totalDealPrice: 0, downPaymentPercent: '', downPaymentAmount: '', totalDurationMonths: 24, numberOfInstallments: 4, purchaseDate: new Date().toISOString().split('T')[0] });
    setOverheads({ stampDutyPercent: 4.9, architectFees: '', planPassFees: '', naExpense: '', naPremium: '', developmentCost: '' });
    setAnalysisUnit('Vigha');
    setCostSheetBasis('100');
    setResult(null);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('pdf-template');
    if (!element) return;
    element.style.display = 'block'; 
    const opt = {
      margin: 0.25,
      filename: `LandDeal_${identity.village || 'Report'}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save().then(() => {
       element.style.display = 'none'; 
    });
  };

  const handlePricePerVighaChange = (val: string) => {
    const price = val === '' ? '' : Number(val);
    setFinancials(prev => ({ ...prev, pricePerVigha: price }));
  };

  const handleDpPercentChange = (val: string) => {
    const pct = val === '' ? '' : Number(val);
    const totalDeal = (Number(financials.pricePerVigha) || 0) * (result?.inputInVigha || 0);
    const amt = pct !== '' ? totalDeal * (pct / 100) : '';
    
    setFinancials(prev => ({ 
        ...prev, 
        downPaymentPercent: pct, 
        downPaymentAmount: amt !== '' ? parseFloat(amt.toFixed(2)) : '' 
    }));
  };

  const handleDpAmountChange = (val: string) => {
    const amt = val === '' ? '' : Number(val);
    const totalDeal = (Number(financials.pricePerVigha) || 0) * (result?.inputInVigha || 0);
    let pct: number | '' = '';
    if (totalDeal > 0 && amt !== '') {
        pct = parseFloat(((amt / totalDeal) * 100).toFixed(2));
    }
    setFinancials(prev => ({ ...prev, downPaymentAmount: amt, downPaymentPercent: pct }));
  };

  const getNum = (val: number | string) => (val === '' ? 0 : Number(val));
  const calculatedDealPrice = getNum(financials.pricePerVigha) * (result?.inputInVigha || 0);
  const convertValue = (valInVigha: number, unit: UnitType) => valInVigha * CONVERSION_RATES[unit];

  // Dynamic Values based on Toggle
  const currentStampDuty = result ? (costSheetBasis === '100' ? result.stampDuty100 : result.stampDuty60) : 0;
  const currentLandedCost = result ? (costSheetBasis === '100' ? result.landedCost100 : result.landedCost60) : 0;
  const currentJantriDisplay = result ? (costSheetBasis === '100' ? result.totalJantriValue : result.fpJantriValue) : 0;

  // Recalculate unit costs for display based on currentLandedCost
  const displayCostPerSqMt = result && result.totalSqMt > 0 ? currentLandedCost / result.totalSqMt : 0;
  const displayCostPerVaar = result && result.inputInVigha > 0 ? currentLandedCost / (result.inputInVigha * CONVERSION_RATES.Vaar) : 0;
  const displayCostPerVigha = result && result.inputInVigha > 0 ? currentLandedCost / result.inputInVigha : 0;

  // Styles
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1";
  const inputClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-safety-500 focus:border-safety-500 block p-2.5 outline-none transition-all";
  const selectClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-safety-500 focus:border-safety-500 block p-2.5 outline-none transition-all";

  return (
    <div className="min-h-screen pb-12 bg-slate-50 text-slate-800 animate-in fade-in duration-500 font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={onBack} className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                <ArrowLeft size={20} />
             </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 text-slate-900">
                <Building2 className="text-safety-500 h-5 w-5" />
                Land Acquisition
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleClear} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-2 transition-colors">
              <RotateCcw size={16} /> <span className="hidden md:inline">Clear</span>
            </button>
            <button onClick={handleDownloadPDF} className="bg-safety-500 hover:bg-safety-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-md shadow-safety-200 transition-all">
              <Download size={16} /> PDF
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
                <input type="text" autoComplete="off" value={identity.tpScheme} onChange={e => setIdentity({...identity, tpScheme: e.target.value})} className={inputClass} placeholder="TP-1" />
              </div>
              <div>
                <label className={labelClass}>FP Number</label>
                <input type="text" autoComplete="off" value={identity.fpNumber} onChange={e => setIdentity({...identity, fpNumber: e.target.value})} className={inputClass} placeholder="FP-101" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Block / Survey</label>
                <input type="text" autoComplete="off" value={identity.blockSurveyNumber} onChange={e => setIdentity({...identity, blockSurveyNumber: e.target.value})} className={inputClass} placeholder="123 / 45" />
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
                  <input type="number" autoComplete="off" value={measurements.areaInput} onChange={e => setMeasurements({...measurements, areaInput: e.target.value === '' ? '' : Number(e.target.value)})} className={`${inputClass} text-lg font-bold text-safety-600`} placeholder="0.00" />
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

              <div className="grid grid-cols-1">
                <div>
                  <label className={labelClass}>Jantri Rate (₹/SqMt)</label>
                  <input type="number" autoComplete="off" value={measurements.jantriRate} onChange={e => setMeasurements({...measurements, jantriRate: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" />
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
                <label className={labelClass}>Price Per Vigha</label>
                <input 
                  type="number" 
                  autoComplete="off" 
                  value={financials.pricePerVigha} 
                  onChange={e => handlePricePerVighaChange(e.target.value)} 
                  className={`${inputClass} font-bold text-lg text-safety-600`} 
                  placeholder="Enter Rate" 
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
                        type="number" 
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
                        type="number" 
                        autoComplete="off" 
                        value={financials.downPaymentAmount} 
                        onChange={e => handleDpAmountChange(e.target.value)} 
                        className={`${inputClass} text-right pr-6 font-bold bg-slate-50`} 
                        placeholder=""
                    />
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">₹</span>
                  </div>
                </div>
              </div>

              <div>
                 <label className={labelClass}>Payment Timeline</label>
                 <div className="grid grid-cols-2 gap-4 mb-2">
                   <div>
                      <label className="text-[10px] text-slate-400 uppercase ml-1">Total Months</label>
                      <input type="number" value={financials.totalDurationMonths} onChange={e => setFinancials({...financials, totalDurationMonths: e.target.value === '' ? '' : parseInt(e.target.value)})} className={inputClass} placeholder="Months" />
                   </div>
                   <div>
                      <label className="text-[10px] text-slate-400 uppercase ml-1">Installments</label>
                      <input 
                        type="number" 
                        value={financials.numberOfInstallments} 
                        onChange={e => setFinancials({...financials, numberOfInstallments: e.target.value === '' ? '' : parseInt(e.target.value)})} 
                        className={inputClass} 
                        placeholder="Count" 
                      />
                   </div>
                 </div>
                 <div className="text-[10px] text-safety-600 mt-2 flex items-center gap-1 font-bold ml-1">
                    <Clock size={10} /> Schedule: 90 Day DP + Remaining over (Months - 3)
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
                <div><label className={labelClass}>Architect Fees</label><input type="number" autoComplete="off" value={overheads.architectFees} onChange={e => setOverheads({...overheads, architectFees: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
                <div><label className={labelClass}>Plan Pass Fees</label><input type="number" autoComplete="off" value={overheads.planPassFees} onChange={e => setOverheads({...overheads, planPassFees: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
                <div><label className={labelClass}>NA Expense</label><input type="number" autoComplete="off" value={overheads.naExpense} onChange={e => setOverheads({...overheads, naExpense: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
                <div><label className={labelClass}>NA Premium</label><input type="number" autoComplete="off" value={overheads.naPremium} onChange={e => setOverheads({...overheads, naPremium: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
                <div className="col-span-2"><label className={labelClass}>Development Cost</label><input type="number" autoComplete="off" value={overheads.developmentCost} onChange={e => setOverheads({...overheads, developmentCost: e.target.value === '' ? '' : Number(e.target.value)})} className={inputClass} placeholder="0.00" /></div>
              </div>
            </div>
          </Card>
        </div>

        {/* 5. Project Cost Sheet Summary */}
        <div className="md:col-span-12">
          <Card 
            title="5. Project Cost Sheet" 
            icon={<FileText size={20} />}
            action={
                <div className="flex bg-slate-100 rounded-lg p-1">
                   <button onClick={() => setCostSheetBasis('100')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${costSheetBasis === '100' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>100%</button>
                   <button onClick={() => setCostSheetBasis('60')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${costSheetBasis === '60' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}>60%</button>
                </div>
            }
          >
            {result ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Breakdown */}
                <div className="flex flex-col justify-center">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <div className="text-slate-500 font-medium">Total Deal Price</div>
                      <div className="text-right font-bold text-slate-900">{formatCurrency(calculatedDealPrice)}</div>
                    </div>
                    
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <div className="text-slate-500 font-medium">Stamp Duty & Reg ({costSheetBasis}%)</div>
                      <div className={`text-right font-bold ${costSheetBasis === '100' ? 'text-slate-900' : 'text-blue-600'}`}>{formatCurrency(currentStampDuty)}</div>
                    </div>

                    <div className="pl-4 border-l-2 border-safety-200 space-y-1 bg-orange-50/50 p-3 rounded-r-lg">
                      <div className="flex justify-between text-xs text-slate-600 mb-1"><span>Additional Expenses</span><span className="font-medium">{formatCurrency(result.totalAdditionalExpenses)}</span></div>
                      {getNum(overheads.architectFees) > 0 && <div className="flex justify-between text-xs text-slate-400 pl-2"><span>- Architect</span><span>{formatCurrency(Number(overheads.architectFees))}</span></div>}
                      {getNum(overheads.planPassFees) > 0 && <div className="flex justify-between text-xs text-slate-400 pl-2"><span>- Plan Pass</span><span>{formatCurrency(Number(overheads.planPassFees))}</span></div>}
                      {getNum(overheads.naExpense) > 0 && <div className="flex justify-between text-xs text-slate-400 pl-2"><span>- NA Exp</span><span>{formatCurrency(Number(overheads.naExpense))}</span></div>}
                      {getNum(overheads.naPremium) > 0 && <div className="flex justify-between text-xs text-slate-400 pl-2"><span>- NA Prem</span><span>{formatCurrency(Number(overheads.naPremium))}</span></div>}
                      {getNum(overheads.developmentCost) > 0 && <div className="flex justify-between text-xs text-slate-400 pl-2"><span>- Dev Cost</span><span>{formatCurrency(Number(overheads.developmentCost))}</span></div>}
                    </div>

                    {/* DARK THEME TOTAL COST BAR */}
                    <div className="flex justify-between items-center bg-slate-900 p-4 rounded-lg mt-4 shadow-lg shadow-slate-300 border border-slate-800 relative overflow-hidden">
                      <div className="absolute inset-0 bg-slate-900"></div>
                      <div className="text-white font-bold text-lg relative z-10">Total Project Cost</div>
                      <div className="text-right font-bold text-2xl text-slate-200 relative z-10">{formatCurrency(currentLandedCost)}</div>
                    </div>
                  </div>
                </div>
                
                {/* Right: Pie Chart */}
                <div className="flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-100 p-2 min-h-[300px]">
                   <div className="w-full h-full flex flex-col">
                      <div className="text-center text-[10px] font-bold text-slate-400 uppercase mb-2">Cost Distribution</div>
                      <SummaryChart landCost={calculatedDealPrice} stampDuty={currentStampDuty} development={result.totalAdditionalExpenses} />
                   </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8 italic">Enter details above to calculate cost sheet</div>
            )}
          </Card>
        </div>

        {/* 6. Unit Costs (Full Width) */}
        {result && (
          <div className="md:col-span-12">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {['Sq Mt', 'Vaar', 'Vigha'].map((u, i) => (
                   <div key={u} className="bg-white border border-slate-200 p-6 rounded-xl text-center shadow-sm flex flex-col justify-center">
                      <div className="text-xs text-slate-400 font-bold uppercase mb-2 tracking-wider">Cost / {u}</div>
                      <div className="text-2xl font-bold text-slate-800">{formatCurrency(i===0 ? displayCostPerSqMt : i===1 ? displayCostPerVaar : displayCostPerVigha)}</div>
                   </div>
                 ))}
             </div>
          </div>
        )}

        {/* 7. Payment Schedule */}
        <div className="md:col-span-12">
          <Card title="7. Payment Schedule" icon={<CalendarDays size={20} />}>
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
                
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
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
                          <td className="px-5 py-3 text-slate-500 font-medium">{item.date}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-700 font-mono">{formatCurrency(item.amount)}</td>
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

      {/* --- PDF TEMPLATE --- */}
      <div id="pdf-template" style={{ display: 'none', width: '700px', backgroundColor: '#fff', color: '#111', fontFamily: 'sans-serif', fontSize: '11px', lineHeight: '1.4' }}>
          
          {/* PAGE 1 */}
          <div className="page-1" style={{ padding: '40px', height: 'auto', minHeight: '950px' }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #ea580c', paddingBottom: '15px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
               <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#1f2937' }}>LAND ACQUISITION REPORT</h1>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>GDK NEXUS 2442 SYSTEM</p>
               </div>
               <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>{formatDate(new Date())}</div>
               </div>
            </div>

            {/* Identity */}
            <div style={{ marginBottom: '25px' }}>
               <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px', color: '#374151', textTransform: 'uppercase' }}>Land Identity</h3>
               <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', width: '25%', color: '#6b7280' }}>Village</td><td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold' }}>{identity.village || '-'}</td><td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', width: '25%', color: '#6b7280' }}>Block / Survey</td><td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6' }}>{identity.blockSurveyNumber || '-'}</td></tr>
                    <tr><td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>TP Scheme</td><td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6' }}>{identity.tpScheme || '-'}</td><td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>FP Number</td><td style={{ padding: '6px', borderBottom: '1px solid #f3f4f6' }}>{identity.fpNumber || '-'}</td></tr>
                  </tbody>
               </table>
            </div>

            {/* Measurements */}
            <div style={{ marginBottom: '25px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '6px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '12px', color: '#374151', textTransform: 'uppercase' }}>Land Area & Jantri</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                   <div><div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Input Area</div><div style={{ fontSize: '14px', fontWeight: 'bold' }}>{measurements.areaInput} {measurements.inputUnit}</div></div>
                   <div><div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>In Vigha</div><div style={{ fontSize: '14px', fontWeight: 'bold' }}>{result ? convertValue(result.inputInVigha, 'Vigha').toFixed(2) : '-'}</div></div>
                   <div><div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>FP Jantri</div><div style={{ fontSize: '14px', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(result?.fpJantriValue || 0)}</div></div>
                </div>
            </div>

            {result && (
              <>
                {/* Financials */}
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px', color: '#374151', textTransform: 'uppercase' }}>Project Cost Analysis ({costSheetBasis}%)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                   <tr style={{ backgroundColor: '#f3f4f6' }}>
                     <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Description</th>
                     <th style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                   </tr>
                   <tr><td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Land Deal Price</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>{formatCurrency(calculatedDealPrice)}</td></tr>
                   <tr><td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Stamp Duty & Registration</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(currentStampDuty)}</td></tr>
                   
                   {/* Detailed Breakdown */}
                   {getNum(overheads.architectFees) > 0 && <tr><td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Architect Fees</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(Number(overheads.architectFees))}</td></tr>}
                   {getNum(overheads.planPassFees) > 0 && <tr><td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Plan Pass Fees</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(Number(overheads.planPassFees))}</td></tr>}
                   {getNum(overheads.naExpense) > 0 && <tr><td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>NA Expense</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(Number(overheads.naExpense))}</td></tr>}
                   {getNum(overheads.naPremium) > 0 && <tr><td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>NA Premium</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(Number(overheads.naPremium))}</td></tr>}
                   {getNum(overheads.developmentCost) > 0 && <tr><td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Development Cost</td><td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>{formatCurrency(Number(overheads.developmentCost))}</td></tr>}

                   <tr style={{ backgroundColor: '#fff7ed' }}><td style={{ padding: '10px', fontWeight: 'bold', color: '#c2410c' }}>TOTAL LANDED COST</td><td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#c2410c', fontSize: '13px' }}>{formatCurrency(currentLandedCost)}</td></tr>
                </table>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                   <div style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', textAlign: 'center' }}><div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Cost / Sq Mt</div><div style={{ fontWeight: 'bold', fontSize: '14px' }}>{formatCurrency(displayCostPerSqMt)}</div></div>
                   <div style={{ flex: 1, padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', textAlign: 'center' }}><div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Cost / Vigha</div><div style={{ fontWeight: 'bold', fontSize: '14px' }}>{formatCurrency(displayCostPerVigha)}</div></div>
                </div>
              </>
            )}
          </div>

          {/* PAGE BREAK */}
          <div style={{ pageBreakBefore: 'always' }}></div>

          {/* PAGE 2 */}
          <div className="page-2" style={{ padding: '40px', height: 'auto' }}>
             <div style={{ borderBottom: '2px solid #ea580c', paddingBottom: '10px', marginBottom: '25px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#1f2937' }}>PAYMENT SCHEDULE</h1>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '10px' }}>Installment Breakdown</p>
             </div>

             {result && (
               <>
                 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                   <thead style={{ backgroundColor: '#f3f4f6' }}>
                     <tr>
                       <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>#</th>
                       <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Description</th>
                       <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Due Date</th>
                       <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #e5e7eb' }}>Amount</th>
                     </tr>
                   </thead>
                   <tbody>
                     {result.schedule.map((item, i) => (
                       <tr key={item.id}>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', width: '30px' }}>{i+1}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{item.description}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{item.date}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.amount)}</td>
                       </tr>
                     ))}
                     <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                       <td colSpan={3} style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>Total Payable to Land Owner</td>
                       <td style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{formatCurrency(result.grandTotalPayment)}</td>
                     </tr>
                   </tbody>
                 </table>

                 <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '6px', fontSize: '10px' }}>
                    <strong style={{ color: '#1e40af', display: 'block', marginBottom: '5px' }}>Important Notes:</strong>
                    <ul style={{ margin: 0, paddingLeft: '15px', color: '#1e3a8a' }}>
                       <li style={{ marginBottom: '3px' }}>The Govt. Jantri Value ({formatCurrency(currentJantriDisplay)}) is <strong>excluded</strong> from this schedule (Paid via Cheque at Registry).</li>
                       <li>Installments are calculated after deducting the initial Down Payment window (90 Days).</li>
                    </ul>
                 </div>
               </>
             )}
          </div>
      </div>
    </div>
  );
};