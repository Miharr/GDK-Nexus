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
  addMonths,
  formatInputNumber,
  parseInputNumber
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
  });

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

    // 3. Jantri
    const jantriRate = getNum(measurements.jantriRate);
    const totalJantriValue = totalSqMt * jantriRate;
    const fpJantriValue = fpAreaSqMt * jantriRate;

    // 4. Deal Price
    const pricePerVigha = getNum(financials.pricePerVigha);
    const calculatedDealPrice = pricePerVigha * valInVigha;
    
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
    const totalAdditionalExpenses = 
      getNum(overheads.architectFees) + 
      getNum(overheads.planPassFees) + 
      getNum(overheads.naExpense) + 
      getNum(overheads.naPremium) + 
      getNum(overheads.developmentCost);

    const landedCost100 = calculatedDealPrice + stampDuty100 + totalAdditionalExpenses;
    const landedCost60 = calculatedDealPrice + stampDuty60 + totalAdditionalExpenses;
    const grandTotalPayment = schedule.reduce((sum, item) => sum + item.amount, 0);

    // 9. Metric Calculations (100% & 60%)
    const costPerSqMt100 = totalSqMt > 0 ? landedCost100 / totalSqMt : 0;
    const costPerVaar100 = totalVaar > 0 ? landedCost100 / totalVaar : 0;
    const costPerVigha100 = valInVigha > 0 ? landedCost100 / valInVigha : 0;

    const fpVaar = totalVaar * 0.60;
    const fpVigha = valInVigha * 0.60;
    
    const costPerSqMt60 = fpAreaSqMt > 0 ? landedCost60 / fpAreaSqMt : 0;
    const costPerVaar60 = fpVaar > 0 ? landedCost60 / fpVaar : 0;
    const costPerVigha60 = fpVigha > 0 ? landedCost60 / fpVigha : 0;

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
    setIdentity({ village: '', tpScheme: '', fpNumber: '', blockSurveyNumber: '' });
    setMeasurements({ areaInput: '', inputUnit: 'SqMeter', displayUnit: 'Vigha', jantriRate: '' });
    setFinancials({ pricePerVigha: '', totalDealPrice: 0, downPaymentPercent: '', downPaymentAmount: '', downPaymentDurationMonths: 3, totalDurationMonths: 24, numberOfInstallments: 4, purchaseDate: new Date().toISOString().split('T')[0] });
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

  // Reactive Handlers
  const handlePricePerVighaChange = (val: string) => {
    const rawPrice = parseInputNumber(val);
    
    // Recalculate Deal Price for immediate dependent updates
    let vighaArea = 0;
    const inputArea = Number(measurements.areaInput);
    if (measurements.inputUnit === 'Vigha') vighaArea = inputArea;
    else vighaArea = inputArea / CONVERSION_RATES[measurements.inputUnit];

    const newDealPrice = (rawPrice === '' ? 0 : rawPrice) * vighaArea;

    // Update DP Amount if PCT is set
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
    const totalDeal = (Number(financials.pricePerVigha) || 0) * (result?.inputInVigha || 0);
    const amt = pct !== '' ? totalDeal * (pct / 100) : '';
    
    setFinancials(prev => ({ 
        ...prev, 
        downPaymentPercent: pct, 
        downPaymentAmount: amt !== '' ? parseFloat(amt.toFixed(2)) : '' 
    }));
  };

  const handleDpAmountChange = (val: string) => {
    const amt = parseInputNumber(val);
    const totalDeal = (Number(financials.pricePerVigha) || 0) * (result?.inputInVigha || 0);
    let pct: number | '' = '';
    if (totalDeal > 0 && amt !== '') {
        pct = parseFloat(((amt / totalDeal) * 100).toFixed(2));
    }
    setFinancials(prev => ({ ...prev, downPaymentAmount: amt, downPaymentPercent: pct }));
  };

  const getNum = (val: number | string) => (val === '' ? 0 : Number(val));
  const calculatedDealPrice = getNum(financials.pricePerVigha) * (result?.inputInVigha || 0);
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
                  type="text" 
                  autoComplete="off" 
                  value={formatInputNumber(financials.pricePerVigha)} 
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
                        type="text" 
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

        {/* 6. Unit Costs */}
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

      {/* --- PDF TEMPLATE --- */}
      <div id="pdf-template" style={{ display: 'none', width: '700px', backgroundColor: '#fff', color: '#111', fontFamily: 'sans-serif', fontSize: '11px', lineHeight: '1.4' }}>
          
          {/* PAGE 1: DETAILS & COST */}
          <div className="page-1" style={{ padding: '40px', height: 'auto', minHeight: '950px' }}>
            
            {/* HEADER */}
            <div style={{ borderBottom: '2px solid #ea580c', paddingBottom: '15px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
               <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#1f2937' }}>LAND ACQUISITION REPORT</h1>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>GDK NEXUS 2442 SYSTEM</p>
               </div>
               <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>{formatDate(new Date())}</div>
               </div>
            </div>

            {/* PROMINENT IDENTITY (NEW) */}
            <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f3f4f6', borderLeft: '4px solid #f97316', borderRadius: '4px' }}>
               <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#1f2937' }}>
                  {identity.village || 'Village Name'} 
                  <span style={{ fontWeight: 'normal', fontSize: '12px', color: '#6b7280', marginLeft: '10px' }}>(TP: {identity.tpScheme || '-'})</span>
               </h2>
               <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#4b5563' }}>
                  <div><strong>FP Number:</strong> {identity.fpNumber || '-'}</div>
                  <div><strong>Block / Survey:</strong> {identity.blockSurveyNumber || '-'}</div>
               </div>
            </div>

            {/* SECTION A: LAND ANALYSIS (COMPARISON TABLE) */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px', color: '#374151', textTransform: 'uppercase' }}>Section A: Land Analysis</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                   <thead style={{ backgroundColor: '#f3f4f6' }}>
                      <tr>
                         <th style={{ textAlign: 'left', padding: '8px' }}>Metric</th>
                         <th style={{ textAlign: 'right', padding: '8px' }}>Total Land (100%)</th>
                         <th style={{ textAlign: 'right', padding: '8px' }}>FP Land (60%)</th>
                      </tr>
                   </thead>
                   <tbody>
                      <tr>
                         <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Area (Sq Mt)</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>{result?.totalSqMt.toFixed(2)}</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#2563eb' }}>{result?.fpAreaSqMt.toFixed(2)}</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Area (Vigha)</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>{result ? convertValue(result.inputInVigha, 'Vigha').toFixed(2) : '-'}</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#2563eb' }}>{result ? convertValue(result.fpInVigha, 'Vigha').toFixed(2) : '-'}</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Jantri Value</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>{formatCurrency(result?.totalJantriValue || 0)}</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(result?.fpJantriValue || 0)}</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Stamp Duty ({overheads.stampDutyPercent}%)</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>{formatCurrency(result?.stampDuty100 || 0)}</td>
                         <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(result?.stampDuty60 || 0)}</td>
                      </tr>
                   </tbody>
                </table>
            </div>

            {result && (
              <>
                {/* SECTION B: DEAL STRUCTURE */}
                <div style={{ marginBottom: '30px' }}>
                   <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px', color: '#374151', textTransform: 'uppercase' }}>Section B: Deal Structure</h3>
                   <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <tr>
                         <td style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>Price Per Vigha</td>
                         <td style={{ fontWeight: 'bold', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(Number(financials.pricePerVigha))}</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>Total Deal Price</td>
                         <td style={{ fontWeight: 'bold', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>{formatCurrency(calculatedDealPrice)}</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>Down Payment</td>
                         <td style={{ fontWeight: 'bold', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                            {formatCurrency(Number(financials.downPaymentAmount))} ({financials.downPaymentPercent}%)
                         </td>
                      </tr>
                      <tr>
                         <td style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>Payment Duration</td>
                         <td style={{ fontWeight: 'bold', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                            {financials.totalDurationMonths} Months (DP Window: {financials.downPaymentDurationMonths} Mo)
                         </td>
                      </tr>
                      <tr>
                         <td style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>Installments</td>
                         <td style={{ fontWeight: 'bold', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>
                            {financials.numberOfInstallments} Payments
                         </td>
                      </tr>
                   </table>
                </div>

                {/* SECTION C: COST METRICS COMPARISON */}
                <div style={{ marginBottom: '30px' }}>
                   <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px', color: '#374151', textTransform: 'uppercase' }}>Section C: Cost Metrics Comparison</h3>
                   <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead style={{ backgroundColor: '#f3f4f6' }}>
                         <tr>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Metric</th>
                            <th style={{ textAlign: 'right', padding: '8px' }}>On 100% Area</th>
                            <th style={{ textAlign: 'right', padding: '8px' }}>On 60% Area</th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Cost per Sq Mt</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>{formatCurrency(result.costPerSqMt100)}</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(result.costPerSqMt60)}</td>
                         </tr>
                         <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Cost per Vigha</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>{formatCurrency(result.costPerVigha100)}</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(result.costPerVigha60)}</td>
                         </tr>
                         <tr>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>Cost per Vaar</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold' }}>{formatCurrency(result.costPerVaar100)}</td>
                            <td style={{ textAlign: 'right', padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#2563eb' }}>{formatCurrency(result.costPerVaar60)}</td>
                         </tr>
                      </tbody>
                   </table>
                </div>

                {/* SECTION D (PART 1): EXPENSES */}
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '10px', color: '#374151', textTransform: 'uppercase' }}>Section D: Expense Breakdown</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '11px' }}>
                   {/* We only show Expenses that contribute to cost. Stamp Duty is dynamic based on context, but usually reported on 100% in breakdown unless specified. Let's show the 100% Stamp for the base cost sheet in PDF, or clarify it varies. The user asked for detailed breakdown. Let's list the 100% Stamp Duty as standard reference or explicitly state it. Since cost metrics compare both, let's show 100% here as base. */}
                   <tr><td style={{ padding: '6px 0' }}>Stamp Duty (100% Basis)</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(result.stampDuty100)}</td></tr>
                   {getNum(overheads.architectFees) > 0 && <tr><td style={{ padding: '6px 0' }}>Architect Fees</td><td style={{ textAlign: 'right' }}>{formatCurrency(Number(overheads.architectFees))}</td></tr>}
                   {getNum(overheads.planPassFees) > 0 && <tr><td style={{ padding: '6px 0' }}>Plan Pass Fees</td><td style={{ textAlign: 'right' }}>{formatCurrency(Number(overheads.planPassFees))}</td></tr>}
                   {getNum(overheads.naExpense) > 0 && <tr><td style={{ padding: '6px 0' }}>NA Expense</td><td style={{ textAlign: 'right' }}>{formatCurrency(Number(overheads.naExpense))}</td></tr>}
                   {getNum(overheads.naPremium) > 0 && <tr><td style={{ padding: '6px 0' }}>NA Premium</td><td style={{ textAlign: 'right' }}>{formatCurrency(Number(overheads.naPremium))}</td></tr>}
                   {getNum(overheads.developmentCost) > 0 && <tr><td style={{ padding: '6px 0' }}>Development Cost</td><td style={{ textAlign: 'right' }}>{formatCurrency(Number(overheads.developmentCost))}</td></tr>}
                   <tr style={{ backgroundColor: '#fff7ed', borderTop: '1px solid #fdba74' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold', color: '#c2410c' }}>TOTAL PROJECT COST (100% Basis)</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#c2410c' }}>{formatCurrency(result.landedCost100)}</td>
                   </tr>
                </table>
              </>
            )}
          </div>

          {/* PAGE BREAK */}
          <div style={{ pageBreakBefore: 'always' }}></div>

          {/* PAGE 2: SCHEDULE */}
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
                       <li style={{ marginBottom: '3px' }}>The Govt. Jantri Value ({formatCurrency(result.totalJantriValue)}) is <strong>excluded</strong> from this schedule (Paid via Cheque at Registry).</li>
                       <li>Installments are calculated after deducting the initial Down Payment window ({financials.downPaymentDurationMonths} Months).</li>
                    </ul>
                 </div>
               </>
             )}
          </div>
      </div>
    </div>
  );
};
