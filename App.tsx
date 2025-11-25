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
  CheckCircle2,
  Circle
} from 'lucide-react';
import { Card } from './components/Card';
import { SummaryChart } from './components/SummaryChart';
import { 
  LandIdentity, 
  Measurements, 
  Financials, 
  Overheads, 
  CalculationResult, 
  PaymentScheduleItem
} from './types';
import { 
  formatCurrency, 
  formatDate, 
  addDays, 
  addMonths 
} from './utils/formatters';

// Declare html2pdf for TypeScript
declare var html2pdf: any;

const App: React.FC = () => {
  // --- STATE INITIALIZATION ---
  
  // Define empty states explicitly to avoid reference issues
  const [identity, setIdentity] = useState<LandIdentity>({
    village: '',
    tpScheme: '',
    fpNumber: '',
    blockSurveyNumber: '',
  });

  const [measurements, setMeasurements] = useState<Measurements>({
    areaSqMt: '',
    jantriRate: '',
  });

  const [financials, setFinancials] = useState<Financials>({
    totalDealPrice: '', 
    downPaymentPercent: '', 
    downPaymentAmount: 0,
    numberOfInstallments: '', 
    purchaseDate: new Date().toISOString().split('T')[0],
  });

  const [overheads, setOverheads] = useState<Overheads>({
    stampDutyType: 'DealPrice',
    stampDutyPercent: '',
    stampDutyAmount: 0,
    architectFees: '',
    planPassFees: '',
    naExpense: '',
    naPremium: '',
  });

  const [result, setResult] = useState<CalculationResult | null>(null);

  // --- CALCULATIONS ---

  useEffect(() => {
    // Helper to safely get numbers from inputs that might be ''
    const getNum = (val: number | string) => (val === '' ? 0 : Number(val));

    // 1. Basic Area & Jantri
    const totalSqMt = getNum(measurements.areaSqMt);
    // Strict Conversion: 1 Vigha = 2377.73 Sq Mt
    const vighaEquivalent = totalSqMt > 0 ? totalSqMt / 2377.73 : 0;
    const totalJantriValue = totalSqMt * getNum(measurements.jantriRate);
    
    // 2. Deal Price
    const dealPrice = getNum(financials.totalDealPrice);

    // 3. Stamp Duty Logic (Radio Button Selection)
    const stampPercent = getNum(overheads.stampDutyPercent);
    let baseForStamp = 0;
    if (overheads.stampDutyType === 'DealPrice') {
      baseForStamp = dealPrice;
    } else {
      baseForStamp = totalJantriValue;
    }
    const calculatedStampDuty = baseForStamp * (stampPercent / 100);

    // 4. Down Payment Logic
    const dpPercent = getNum(financials.downPaymentPercent);
    const calculatedDownPayment = dealPrice * (dpPercent / 100);
    
    // 5. Installment Logic
    // Formula: (Deal Price - (Down Payment + Jantri Value)) / Number of Installments
    let installmentPool = dealPrice - calculatedDownPayment - totalJantriValue;
    
    const numInstallments = getNum(financials.numberOfInstallments);
    const installmentAmount = numInstallments > 0 
      ? installmentPool / numInstallments 
      : 0;

    // 6. Payment Schedule Generation
    const schedule: PaymentScheduleItem[] = [];
    const purchaseDateObj = new Date(financials.purchaseDate);

    // Row 1: Down Payment (Due on Purchase Date)
    if (dealPrice > 0 || calculatedDownPayment > 0) {
      schedule.push({
        id: 1,
        date: formatDate(purchaseDateObj),
        description: 'Down Payment (Token)',
        amount: calculatedDownPayment,
        type: 'Token'
      });
    }

    // Rows: Installments
    // 1st Installment is Purchase Date + 90 Days
    let currentDueDate = addDays(purchaseDateObj, 90);

    for (let i = 0; i < numInstallments; i++) {
      schedule.push({
        id: i + 2,
        date: formatDate(currentDueDate),
        description: `Installment ${i + 1}`,
        amount: installmentAmount,
        type: 'Installment'
      });
      // Subsequent installments are Monthly
      currentDueDate = addMonths(currentDueDate, 1);
    }

    // Row: Jantri (At the end)
    if (totalJantriValue > 0) {
      schedule.push({
        id: 999,
        date: formatDate(currentDueDate),
        description: 'Jantri Amount (Final Registry)',
        amount: totalJantriValue,
        type: 'Jantri'
      });
    }

    // 7. Totals
    const totalSchedulePayment = schedule.reduce((sum, item) => sum + item.amount, 0);

    const totalAdditionalExpenses = 
      getNum(overheads.architectFees) + 
      getNum(overheads.planPassFees) + 
      getNum(overheads.naExpense) + 
      getNum(overheads.naPremium);

    const landedCost = dealPrice + calculatedStampDuty + totalAdditionalExpenses;

    setResult({
      totalSqMt,
      vighaEquivalent,
      totalJantriValue,
      totalAdditionalExpenses,
      landedCost,
      schedule,
      grandTotalPayment: totalSchedulePayment,
      landCostPerSqMt: dealPrice / (totalSqMt || 1),
      finalProjectCostPerSqMt: landedCost / (totalSqMt || 1),
    });

  }, [measurements, financials, overheads.stampDutyPercent, overheads.stampDutyType, overheads.architectFees, overheads.planPassFees, overheads.naExpense, overheads.naPremium]); 

  // --- HANDLERS ---

  const handleClear = () => {
    // Hard reset all states to initial empty values immediately (No Confirmation)
    setIdentity({
      village: '',
      tpScheme: '',
      fpNumber: '',
      blockSurveyNumber: '',
    });
    setMeasurements({
      areaSqMt: '',
      jantriRate: '',
    });
    setFinancials({
      totalDealPrice: '',
      downPaymentPercent: '', 
      downPaymentAmount: 0,
      numberOfInstallments: '', 
      purchaseDate: new Date().toISOString().split('T')[0],
    });
    setOverheads({
      stampDutyType: 'DealPrice',
      stampDutyPercent: '',
      stampDutyAmount: 0,
      architectFees: '',
      planPassFees: '',
      naExpense: '',
      naPremium: '',
    });
    setResult(null);
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('pdf-template');
    if (!element) return;
    
    // Temporarily make it visible for capture
    element.style.display = 'block';

    const opt = {
      margin: [0.5, 0.5],
      filename: `LandDeal_${identity.village || 'Report'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
       // Hide again after save
       element.style.display = 'none';
    });
  };

  const handlePercentChange = (val: string) => {
    if (val === '') {
      setFinancials(prev => ({ ...prev, downPaymentPercent: '' }));
    } else {
      const num = parseFloat(val);
      setFinancials(prev => ({ ...prev, downPaymentPercent: isNaN(num) ? '' : num }));
    }
  };

  const inputClass = "w-full bg-white text-slate-900 border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400";
  
  // Helpers for Render
  const getNum = (val: number | string) => (val === '' ? 0 : Number(val));
  const dealPrice = getNum(financials.totalDealPrice);
  const totalJantri = getNum(measurements.areaSqMt) * getNum(measurements.jantriRate);
  
  const calculatedStampDuty = overheads.stampDutyType === 'DealPrice' 
    ? dealPrice * (getNum(overheads.stampDutyPercent) / 100)
    : totalJantri * (getNum(overheads.stampDutyPercent) / 100);

  return (
    <div className="min-h-screen pb-12 bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white pt-6 pb-6 md:pb-16 px-4 md:px-8 shadow-md relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h1 className="text-xl md:text-3xl font-bold flex items-center justify-center md:justify-start gap-3">
              <Building2 className="text-blue-400 h-6 w-6 md:h-8 md:w-8" />
              LandDeal Structurer
            </h1>
            <p className="text-slate-400 mt-2 text-xs md:text-sm">Viability & Payment Scheduler</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end">
            <button 
              onClick={handleClear}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 hover:text-red-400 px-4 py-2 rounded-lg transition-colors border border-slate-700 text-sm font-medium"
            >
              <RotateCcw size={16} />
              Clear
            </button>
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-colors text-white shadow-lg shadow-blue-900/50 text-sm font-medium"
            >
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 -mt-2 md:-mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-20">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Identity */}
          <Card title="1. Land Identity" icon={<FileText size={20} />}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Village Name</label>
                <input 
                  type="text" 
                  autoComplete="off"
                  value={identity.village}
                  onChange={e => setIdentity({...identity, village: e.target.value})}
                  className={inputClass}
                  placeholder="Enter Village Name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">TP Scheme</label>
                <input 
                  type="text" 
                  autoComplete="off"
                  value={identity.tpScheme}
                  onChange={e => setIdentity({...identity, tpScheme: e.target.value})}
                  className={inputClass}
                  placeholder="e.g. TP-1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">FP Number</label>
                <input 
                  type="text" 
                  autoComplete="off"
                  value={identity.fpNumber}
                  onChange={e => setIdentity({...identity, fpNumber: e.target.value})}
                  className={inputClass}
                  placeholder="FP-101"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Block / Survey Number</label>
                <input 
                  type="text" 
                  autoComplete="off"
                  value={identity.blockSurveyNumber}
                  onChange={e => setIdentity({...identity, blockSurveyNumber: e.target.value})}
                  className={inputClass}
                  placeholder="Block 123 / Survey 45"
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Measurements */}
          <Card title="2. Measurement & Jantri" icon={<Ruler size={20} />}>
            <div className="space-y-4">
              {/* Area Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Area Input (Sq Meters)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    autoComplete="off"
                    value={measurements.areaSqMt}
                    onChange={e => setMeasurements({...measurements, areaSqMt: e.target.value === '' ? '' : Number(e.target.value)})}
                    className={`${inputClass} text-lg font-semibold`}
                    placeholder="0.00"
                  />
                  <span className="text-sm font-medium text-slate-500">Sq.Mt</span>
                </div>
              </div>

              {/* Conversion Display */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                <div>
                  <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Equivalent Vigha</div>
                  <div className="text-[10px] text-blue-400">1 Vigha = 2377.73 Sq Mt</div>
                </div>
                <div className="text-2xl font-bold text-blue-800">
                  {result?.vighaEquivalent.toFixed(2)} <span className="text-sm font-normal text-blue-600">Vigha</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Jantri Rate (₹/SqMt)</label>
                <input 
                  type="number" 
                  autoComplete="off"
                  value={measurements.jantriRate}
                  onChange={e => setMeasurements({...measurements, jantriRate: e.target.value === '' ? '' : Number(e.target.value)})}
                  className={inputClass}
                  placeholder="0.00"
                />
                <div className="text-right text-xs text-slate-500 mt-1">Total Jantri: {formatCurrency(result?.totalJantriValue || 0)}</div>
              </div>
            </div>
          </Card>

          {/* Section 3: Financial Structure */}
          <Card title="3. Deal Structure" icon={<IndianRupee size={20} />}>
            <div className="space-y-5">
              
              {/* Deal Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Total Deal Price</label>
                <input 
                  type="number" 
                  autoComplete="off"
                  value={financials.totalDealPrice}
                  onChange={e => setFinancials({...financials, totalDealPrice: e.target.value === '' ? '' : Number(e.target.value)})}
                  className={`${inputClass} text-base font-bold`}
                  placeholder="0.00"
                />
              </div>

              {/* Stamp Duty Section with Radio Buttons */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Stamp Duty Configuration</label>
                
                {/* Radio Buttons */}
                <div className="flex gap-4 mb-3">
                  <button 
                    onClick={() => setOverheads({...overheads, stampDutyType: 'DealPrice'})}
                    className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${overheads.stampDutyType === 'DealPrice' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}
                  >
                    {overheads.stampDutyType === 'DealPrice' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                     Deal Price
                  </button>
                  <button 
                    onClick={() => setOverheads({...overheads, stampDutyType: 'Jantri'})}
                    className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${overheads.stampDutyType === 'Jantri' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}
                  >
                    {overheads.stampDutyType === 'Jantri' ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                     Jantri
                  </button>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="w-24">
                    <label className="text-[10px] text-slate-400 uppercase">Rate %</label>
                    <input 
                      type="number" 
                      step="0.1"
                      autoComplete="off"
                      value={overheads.stampDutyPercent}
                      onChange={e => setOverheads({...overheads, stampDutyPercent: e.target.value === '' ? '' : Number(e.target.value)})}
                      className={inputClass}
                      placeholder="4.9"
                    />
                  </div>
                  <div className="flex-1 text-right">
                    <label className="text-[10px] text-slate-400 uppercase block">Calculated Stamp Duty</label>
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(calculatedStampDuty)}</span>
                  </div>
                </div>
              </div>

              {/* Down Payment Section */}
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Token / Down Payment (%)</label>
                <div className="flex gap-2 mb-2">
                  {[10, 20, 30].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setFinancials({...financials, downPaymentPercent: pct})}
                      className={`flex-1 py-1 px-2 text-sm rounded border transition-colors ${financials.downPaymentPercent === pct ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                    >
                      {pct}%
                    </button>
                  ))}
                  <div className="relative flex-1">
                    <input 
                      type="number"
                      autoComplete="off"
                      value={financials.downPaymentPercent}
                      onChange={e => handlePercentChange(e.target.value)}
                      className="w-full h-full text-center border border-slate-300 rounded text-sm focus:border-blue-500 outline-none bg-white text-slate-900"
                      placeholder="Custom"
                    />
                    <span className="absolute right-1 top-1 text-xs text-slate-400 pointer-events-none">%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(getNum(financials.totalDealPrice) * (getNum(financials.downPaymentPercent) / 100))}</span>
                </div>
              </div>

              {/* Installments & Date */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">No. of Installments</label>
                    <input 
                      type="number" 
                      autoComplete="off"
                      value={financials.numberOfInstallments}
                      onChange={e => setFinancials({...financials, numberOfInstallments: e.target.value === '' ? '' : parseInt(e.target.value)})}
                      className={inputClass}
                      placeholder="e.g. 4"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Purchase Date</label>
                    <input 
                      type="date"
                      value={financials.purchaseDate}
                      onChange={e => setFinancials({...financials, purchaseDate: e.target.value})}
                      className={`${inputClass} [color-scheme:light]`} 
                    />
                 </div>
              </div>

            </div>
          </Card>

           {/* Section 4: Additional Expenses */}
           <Card title="4. Additional Expenses" icon={<Calculator size={20} />}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Architect Fees</label>
                <input 
                  type="number" 
                  autoComplete="off"
                  value={overheads.architectFees}
                  onChange={e => setOverheads({...overheads, architectFees: e.target.value === '' ? '' : Number(e.target.value)})}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Plan Pass Fees</label>
                <input 
                  type="number" 
                  autoComplete="off"
                  value={overheads.planPassFees}
                  onChange={e => setOverheads({...overheads, planPassFees: e.target.value === '' ? '' : Number(e.target.value)})}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">NA Expense</label>
                <input 
                  type="number" 
                  autoComplete="off"
                  value={overheads.naExpense}
                  onChange={e => setOverheads({...overheads, naExpense: e.target.value === '' ? '' : Number(e.target.value)})}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">NA Premium</label>
                <input 
                  type="number" 
                  autoComplete="off"
                  value={overheads.naPremium}
                  onChange={e => setOverheads({...overheads, naPremium: e.target.value === '' ? '' : Number(e.target.value)})}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: OUTPUTS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main "Invoice" Summary */}
          <Card title="Project Cost Sheet" icon={<FileText size={20} />} className="border-t-4 border-t-blue-500">
            {result && (
              <div className="space-y-6">
                
                {/* Cost Breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 border-b pb-1">Cost Summary</h4>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="text-slate-600">Total Deal Price</div>
                    <div className="text-right font-semibold text-slate-800">{formatCurrency(dealPrice)}</div>
                    
                    <div className="text-slate-600">
                      Stamp Duty & Reg 
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({overheads.stampDutyType === 'DealPrice' ? 'On Deal' : 'On Jantri'})
                      </span>
                    </div>
                    <div className="text-right font-medium text-slate-800">
                      {formatCurrency(calculatedStampDuty)}
                    </div>

                    <div className="text-slate-600">Additional Expenses</div>
                    <div className="text-right font-medium text-slate-800">{formatCurrency(result.totalAdditionalExpenses)}</div>

                    <div className="text-slate-800 font-semibold pt-2 border-t mt-2">Total Project Cost</div>
                    <div className="text-right font-semibold text-slate-800 pt-2 border-t mt-2">{formatCurrency(result.landedCost)}</div>
                  </div>
                </div>

                {/* Per Unit Costs */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 gap-4">
                   <div className="flex flex-col">
                      <span className="text-xs text-slate-500">Cost per Sq Mt</span>
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(result.finalProjectCostPerSqMt)}</span>
                   </div>
                   <div className="flex flex-col text-right">
                      <span className="text-xs text-slate-500">Cost per Vigha</span>
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(result.finalProjectCostPerSqMt * 2377.73)}
                      </span>
                   </div>
                </div>

                {/* Chart Section */}
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-semibold text-center text-slate-400 mb-2">Cost Distribution</h4>
                  <SummaryChart 
                    landCost={dealPrice}
                    stampDuty={calculatedStampDuty}
                    development={result.totalAdditionalExpenses} 
                  />
                </div>

              </div>
            )}
          </Card>

          {/* Payment Schedule Table */}
          <Card title="Payment Schedule" icon={<CalendarDays size={20} />}>
            {result && (
              <div className="overflow-x-auto custom-scrollbar">
                <div className="mb-4 flex gap-4 text-xs text-slate-500 bg-yellow-50 p-2 rounded border border-yellow-100">
                  <span className="flex items-center gap-1 font-medium text-yellow-700">
                     Note:
                  </span>
                  <span>Jantri amount deducted from Installments & Paid at End.</span>
                </div>
                
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-left">Description</th>
                      <th className="px-4 py-3 font-medium text-left">Due Date</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.schedule.map((item) => (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.type === 'Jantri' ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-700">
                           {item.description}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {item.date}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700 font-mono">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white">
                      <td className="px-4 py-3 font-semibold" colSpan={2}>Grand Total (Deal Price)</td>
                      <td className="px-4 py-3 text-right font-bold font-mono">
                        {formatCurrency(result.grandTotalPayment)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>

        </div>
      </main>

      {/* --- PDF TEMPLATE (HIDDEN) --- */}
      <div id="pdf-template" style={{ display: 'none', padding: '40px', fontFamily: 'Inter, sans-serif', backgroundColor: '#fff', color: '#111' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
             <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Land Deal Report</h1>
             <p style={{ margin: '5px 0 0', color: '#666' }}>Generated on {formatDate(new Date())}</p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', fontWeight: 'bold', width: '30%' }}>Village</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{identity.village || '-'}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', fontWeight: 'bold', width: '30%' }}>Survey / Block</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{identity.blockSurveyNumber || '-'}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>TP Scheme</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{identity.tpScheme || '-'}</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>FP Number</td>
                <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{identity.fpNumber || '-'}</td>
              </tr>
              <tr>
                 <td style={{ padding: '8px', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>Total Area</td>
                 <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{measurements.areaSqMt} Sq. Mt</td>
                 <td style={{ padding: '8px', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>In Vigha</td>
                 <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{result?.vighaEquivalent.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {result && (
            <>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px' }}>Project Cost Breakdown</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '14px' }}>
                <thead style={{ backgroundColor: '#f3f4f6' }}>
                  <tr>
                     <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Component</th>
                     <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                   <tr>
                     <td style={{ padding: '10px', border: '1px solid #ddd' }}>Total Deal Price</td>
                     <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(dealPrice)}</td>
                   </tr>
                   <tr>
                     <td style={{ padding: '10px', border: '1px solid #ddd' }}>Stamp Duty ({overheads.stampDutyType === 'DealPrice' ? 'On Deal' : 'On Jantri'})</td>
                     <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(calculatedStampDuty)}</td>
                   </tr>
                   <tr>
                     <td style={{ padding: '10px', border: '1px solid #ddd' }}>Additional Expenses (Arch, NA, etc.)</td>
                     <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(result.totalAdditionalExpenses)}</td>
                   </tr>
                   <tr style={{ backgroundColor: '#eef2ff', fontWeight: 'bold' }}>
                     <td style={{ padding: '10px', border: '1px solid #ddd' }}>TOTAL PROJECT COST</td>
                     <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(result.landedCost)}</td>
                   </tr>
                   <tr>
                     <td style={{ padding: '10px', border: '1px solid #ddd', color: '#666' }}>Effective Rate per Sq. Mt</td>
                     <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatCurrency(result.finalProjectCostPerSqMt)}</td>
                   </tr>
                </tbody>
              </table>

              <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '5px', marginBottom: '15px' }}>Payment Schedule</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                 <thead style={{ backgroundColor: '#f3f4f6' }}>
                   <tr>
                     <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Due Date</th>
                     <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Description</th>
                     <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #ddd' }}>Amount</th>
                   </tr>
                 </thead>
                 <tbody>
                   {result.schedule.map(item => (
                     <tr key={item.id}>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.date}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.description}</td>
                        <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(item.amount)}</td>
                     </tr>
                   ))}
                   <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
                     <td style={{ padding: '10px', border: '1px solid #ddd' }} colSpan={2}>Grand Total</td>
                     <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatCurrency(result.grandTotalPayment)}</td>
                   </tr>
                 </tbody>
              </table>
            </>
          )}

          <div style={{ marginTop: '50px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
            <p>Generated by LandDeal Structurer App</p>
          </div>
      </div>
    </div>
  );
};

export default App;