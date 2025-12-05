import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Calendar,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Calculator,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCcw,
  Loader2,
  FileText,
  Landmark, 
  Banknote, 
  MessageSquare 
} from 'lucide-react';
import { ProjectSavedState } from '../types';
import { formatCurrency, formatInputNumber, parseInputNumber } from '../utils/formatters';
import { supabase } from '../supabaseClient';

// Declare html2pdf for TypeScript
declare var html2pdf: any;

interface Props {
  onBack: () => void;
  projectData: ProjectSavedState;
  plottingData: any;
  projectId: number;
}

// --- UPDATED TYPES FOR DEAL & AUDIT ---
interface PaymentInstallment {
  id: number;
  label: string;
  dueDate: string;
  expectedAmount: number;
  
  // Payment State
  paidAmount: number | ''; 
  isPaid: boolean;
  paymentDate?: string; // Date payment was actually made
  
  // Audit Details
  paymentMode?: 'CASH' | 'BANK';
  bankName?: string;
  refNumber?: string; // Cheque or Transaction ID
  remarks?: string;
}

interface PlotDealState {
  startDate: string;
  dpAmount: number | '';
  dpType: 'percent' | 'value';
  
  dpDurationVal: string; 
  dpDurationUnit: 'Days' | 'Months';
  
  totalDurationVal: string;
  totalDurationUnit: 'Days' | 'Months';
  
  numInstallments: string; 
  schedule: PaymentInstallment[];
}

// Helpers
const getLocalToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const displayDate = (dateStr: string) => {
    if(!dateStr) return '-';
    try {
        const safeDate = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
        const dateObj = new Date(safeDate);
        if (isNaN(dateObj.getTime())) return '-'; 
        return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return '-'; }
};

const formatIndianInput = (val: number | string) => {
    if (val === '' || val === undefined) return '';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const ProjectPlotsView: React.FC<Props> = ({ onBack, projectData, plottingData, projectId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPlotId, setExpandedPlotId] = useState<string | null>(null);
  const [localPlottingData, setLocalPlottingData] = useState(plottingData);

  useEffect(() => {
    setLocalPlottingData(plottingData);
  }, [plottingData]);

  const data = localPlottingData || {}; 
  const plots = data.plotSales || [];
  const landRate = Number(data.landRate) || 0;
  const devRate = Number(data.devRate) || 0;

  const filteredPlots = plots.filter((plot: any) => {
    const q = searchTerm.toLowerCase();
    return (
      (plot.customerName?.toLowerCase().includes(q) || '') ||
      (plot.plotNumber?.toString().includes(q) || '') ||
      (plot.phoneNumber?.includes(q) || '')
    );
  });

  const toggleExpand = (id: string) => {
    setExpandedPlotId(expandedPlotId === id ? null : id);
  };

  const handleSaveDeal = async (plotId: string, dealData: PlotDealState) => {
    const updatedPlots = plots.map((p: any) => {
        if (p.id === plotId) {
            return { ...p, dealStructure: dealData };
        }
        return p;
    });

    const newPlottingData = { ...data, plotSales: updatedPlots };
    setLocalPlottingData(newPlottingData);

    try {
        const { error } = await supabase
            .from('projects')
            .update({ plotting_data: newPlottingData })
            .eq('id', projectId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error("Failed to save deal:", err);
        alert("Failed to save to database. Please check connection.");
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 animate-in fade-in duration-500 font-sans pb-12">
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <button onClick={onBack} type="button" className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                <ArrowLeft size={20} />
             </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 text-slate-900">
                <LayoutGrid className="text-orange-500 h-5 w-5" />
                Plot Registry
              </h1>
              <div className="text-xs text-slate-400 font-mono">
                 Project: {projectData.identity.village}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="mb-6 relative group max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input 
                type="text" 
                placeholder="Search Customer, Plot #..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm"
            />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
             {filteredPlots.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">
                   {plots.length === 0 ? "No plots found." : "No matching results."}
                </div>
             ) : (
                <div className="divide-y divide-slate-100">
                   <div className="hidden md:grid grid-cols-12 bg-slate-50 text-slate-500 font-bold uppercase text-[10px] py-3 px-4 border-b border-slate-200">
                      <div className="col-span-1 text-center">Plot #</div>
                      <div className="col-span-3">Customer</div>
                      <div className="col-span-2 text-center">Size</div>
                      <div className="col-span-2 text-right">Value</div>
                      <div className="col-span-2 text-center">Status</div>
                      <div className="col-span-2 text-right">Action</div>
                   </div>

                   {filteredPlots.map((plot: any) => {
                        const area = Number(plot.areaVaar) || 0;
                        const totalValue = area * (landRate + devRate);
                        const isExpanded = expandedPlotId === plot.id;
                        
                        const deal = plot.dealStructure;
                        const hasActiveDeal = deal && deal.schedule && deal.schedule.length > 0;
                        const isDealClosed = hasActiveDeal && deal.schedule.every((item: any) => item.isPaid);

                        return (
                            <div key={plot.id} className="group transition-colors">
                                <div 
                                  onClick={() => toggleExpand(plot.id)}
                                  className={`
                                    grid grid-cols-2 md:grid-cols-12 gap-4 p-4 items-center cursor-pointer select-none
                                    ${isExpanded ? 'bg-orange-50/50' : 'hover:bg-slate-50'}
                                  `}
                                >
                                    <div className="col-span-1 md:text-center font-bold text-slate-700">
                                        <span className="md:hidden text-xs text-slate-400 mr-2">Plot:</span>
                                        #{plot.plotNumber}
                                    </div>
                                    <div className="col-span-1 md:col-span-3">
                                        <div className="font-bold text-slate-800">{plot.customerName || 'Unknown'}</div>
                                        <div className="text-xs text-slate-500">{plot.phoneNumber || '-'}</div>
                                    </div>
                                    <div className="col-span-1 md:col-span-2 text-left md:text-center font-mono text-xs text-slate-600">
                                        <span className="md:hidden text-slate-400 font-sans mr-1">Size:</span>
                                        {formatInputNumber(area)} Vaar
                                    </div>
                                    <div className="col-span-1 md:col-span-2 text-right font-bold text-emerald-600 text-sm">
                                        {formatCurrency(totalValue)}
                                    </div>
                                    <div className="col-span-2 flex justify-end md:justify-center">
                                       <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${
                                           isExpanded ? 'bg-orange-100 text-orange-700' : 
                                           isDealClosed ? 'bg-emerald-100 text-emerald-700' :
                                           hasActiveDeal ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                       }`}>
                                          {isExpanded ? 'Managing' : isDealClosed ? 'Deal Closed' : hasActiveDeal ? 'Deal Active' : 'No Deal'}
                                       </span>
                                    </div>
                                    <div className="hidden md:flex col-span-2 justify-end text-slate-400">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-200 bg-slate-50/50 p-4 md:p-6 animate-in slide-in-from-top-2 duration-200">
                                        <PlotDealManager 
                                            totalValue={totalValue} 
                                            plotId={plot.id}
                                            plotData={plot} 
                                            projectIdentity={projectData.identity}
                                            initialDeal={plot.dealStructure} 
                                            onSave={handleSaveDeal} 
                                        />
                                    </div>
                                )}
                            </div>
                        );
                   })}
                </div>
             )}
        </div>
      </main>
    </div>
  );
};

// --- SUB-COMPONENT: DEAL MANAGER ---
interface ManagerProps {
    totalValue: number;
    plotId: string;
    plotData: any;
    projectIdentity: any;
    initialDeal?: PlotDealState;
    onSave: (id: string, data: PlotDealState) => Promise<boolean>;
}

const PlotDealManager: React.FC<ManagerProps> = ({ totalValue, plotId, plotData, projectIdentity, initialDeal, onSave }) => {
    
    const [deal, setDeal] = useState<PlotDealState>(initialDeal || {
        startDate: getLocalToday(),
        dpAmount: '',
        dpType: 'percent',
        dpDurationVal: '', dpDurationUnit: 'Months',
        totalDurationVal: '', totalDurationUnit: 'Months',
        numInstallments: '',
        schedule: []
    });

    const [activePaymentRow, setActivePaymentRow] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const inputBase = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-2.5 outline-none transition-all";
    const labelClass = "block text-xs font-bold text-slate-500 uppercase mb-1";

    const handleBuildTimeline = () => {
        const dpVal = deal.dpType === 'percent' 
            ? Math.round(totalValue * ((Number(deal.dpAmount)||0) / 100)) 
            : (Number(deal.dpAmount)||0);
        
        const balance = totalValue - dpVal;
        const nInst = parseFloat(deal.numInstallments) || 0;

        if (nInst <= 0) return;

        // Date Logic
        const safeStartStr = deal.startDate.includes('T') ? deal.startDate : `${deal.startDate}T12:00:00`;
        const start = new Date(safeStartStr);
        
        const dpNum = parseFloat(deal.dpDurationVal) || 0;
        const dpDate = new Date(start); 
        if (deal.dpDurationUnit === 'Days') dpDate.setDate(dpDate.getDate() + dpNum);
        else dpDate.setMonth(dpDate.getMonth() + dpNum);

        const totalNum = parseFloat(deal.totalDurationVal) || 0;
        const endDate = new Date(start); 
        if (deal.totalDurationUnit === 'Days') endDate.setDate(endDate.getDate() + totalNum);
        else endDate.setMonth(endDate.getMonth() + totalNum);

        const timeSpan = endDate.getTime() - dpDate.getTime();
        const intervalMs = nInst > 0 ? Math.max(0, timeSpan) / Math.ceil(nInst) : 0;
        const instAmount = nInst > 0 ? Math.round(balance / nInst) : 0; 
        const newSchedule: PaymentInstallment[] = [];

        newSchedule.push({
            id: 1, label: 'Down Payment', dueDate: dpDate.toISOString().split('T')[0],
            expectedAmount: dpVal, paidAmount: '', isPaid: false
        });

        const count = Math.ceil(nInst);
        let runningBalance = balance;

        for(let i = 0; i < count; i++) {
            let amount = instAmount;
            if (i === count - 1) amount = runningBalance;
            else runningBalance -= amount;
            
            const instDate = new Date(dpDate.getTime() + ((i + 1) * intervalMs));
            newSchedule.push({
                id: i + 2, label: `Installment ${i + 1}`, dueDate: instDate.toISOString().split('T')[0],
                expectedAmount: amount, paidAmount: '', isPaid: false
            });
        }
        setDeal({ ...deal, schedule: newSchedule });
    };

    // Update fields inside a schedule row
    const updateScheduleRow = (index: number, field: keyof PaymentInstallment, val: any) => {
        const newSchedule = [...deal.schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: val };
        setDeal({ ...deal, schedule: newSchedule });
    };

    // Handle manual date picker change
    const handleDateChange = (index: number, val: string) => {
        const newSchedule = [...deal.schedule];
        newSchedule[index] = { ...newSchedule[index], dueDate: val };
        setDeal({ ...deal, schedule: newSchedule });
    };

    const confirmPayment = (index: number) => {
        const newSchedule = [...deal.schedule];
        const current = newSchedule[index];
        
        // 1. Mark Paid
        current.isPaid = true;
        // If they didn't type an amount, assume full payment
        const actualPaid = current.paidAmount === '' ? current.expectedAmount : Number(current.paidAmount);
        current.paidAmount = actualPaid; 
        current.paymentDate = getLocalToday(); // Record today's date

        // 2. Adjust Next Installment
        const diff = current.expectedAmount - actualPaid; 
        if (index + 1 < newSchedule.length && diff !== 0) {
            newSchedule[index + 1].expectedAmount += diff;
        }

        setDeal({ ...deal, schedule: newSchedule });
        setActivePaymentRow(null); // Close the drawer
    };

    const undoPayment = (index: number) => {
        const newSchedule = [...deal.schedule];
        newSchedule[index].isPaid = false;
        // Ideally we revert the math adjustment, but that requires complex history tracking.
        // For now, simpler to just uncheck. User can manually fix next row amounts if needed.
        setDeal({ ...deal, schedule: newSchedule });
    };

    const triggerSave = async () => {
        setIsSaving(true);
        await onSave(plotId, deal);
        setIsSaving(false);
    };

    const handleExportPDF = () => {
        const element = document.getElementById(`pdf-template-${plotId}`);
        if (!element) return;
        element.style.display = 'block';
        
        const customerName = plotData.customerName ? plotData.customerName.replace(/\s+/g, '_') : 'Customer';
        const plotNum = plotData.plotNumber || 'Plot';

        const opt = {
          margin: [0.3, 0.3, 0.3, 0.3],
          filename: `Deal_${plotNum}_${customerName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).save().then(() => {
           element.style.display = 'none'; 
        });
    };

    return (
        <div className="space-y-6">
            
            {/* INPUTS SECTION */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div className="col-span-2 md:col-span-1">
                    <label className={labelClass}>Deal Date</label>
                    <div className="relative w-full h-[42px] group">
                        <input type="date" value={deal.startDate} onChange={(e) => setDeal({...deal, startDate: e.target.value})} onClick={(e) => {try{(e.target as HTMLInputElement).showPicker()}catch(err){}}} className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" />
                        <div className="w-full h-full bg-white border border-slate-300 rounded-lg flex items-center px-3 gap-2 transition-all"><Calendar size={16} className="text-orange-500" /><span className="text-sm font-bold text-slate-800">{displayDate(deal.startDate)}</span></div>
                    </div>
                </div>
                <div className="col-span-2 md:col-span-1">
                    <div className="flex justify-between items-center mb-1"><label className={labelClass}>Down Payment</label><div className="flex bg-slate-100 rounded p-0.5"><button onClick={() => setDeal({...deal, dpType: 'percent'})} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${deal.dpType === 'percent' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>%</button><button onClick={() => setDeal({...deal, dpType: 'value'})} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${deal.dpType === 'value' ? 'bg-white shadow text-slate-900' : 'text-slate-400'}`}>₹</button></div></div>
                    <div className="relative h-[42px]"><input type="text" inputMode="decimal" placeholder={deal.dpType === 'percent' ? "e.g. 20" : "Amount"} value={deal.dpType === 'value' ? formatIndianInput(deal.dpAmount) : deal.dpAmount} onChange={(e) => {const raw = parseInputNumber(e.target.value); setDeal({...deal, dpAmount: raw === 0 && e.target.value === '' ? '' : raw});}} className={`${inputBase} h-full font-bold ${deal.dpType === 'value' ? 'pl-7' : ''}`} />{deal.dpType === 'value' && (<span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">₹</span>)}{deal.dpType === 'percent' && (<span className="absolute right-3 top-2.5 text-slate-400 font-bold text-sm">%</span>)}</div>
                </div>
                <div className="col-span-1"><label className={labelClass}>DP Window</label><div className="flex h-[42px]"><input type="number" inputMode="decimal" placeholder="0" value={deal.dpDurationVal} onChange={(e) => setDeal({...deal, dpDurationVal: e.target.value})} className={`${inputBase} h-full rounded-r-none border-r-0 text-center px-1 min-w-0`} /><select value={deal.dpDurationUnit} onChange={(e) => setDeal({...deal, dpDurationUnit: e.target.value as any})} className="bg-slate-100 border border-slate-300 border-l-0 rounded-r-lg px-2 text-xs font-bold text-slate-600 outline-none h-full"><option value="Months">Mth</option><option value="Days">Day</option></select></div></div>
                <div className="col-span-1"><label className={labelClass}>Total Time</label><div className="flex h-[42px]"><input type="number" inputMode="decimal" placeholder="0" value={deal.totalDurationVal} onChange={(e) => setDeal({...deal, totalDurationVal: e.target.value})} className={`${inputBase} h-full rounded-r-none border-r-0 text-center px-1 min-w-0`} /><select value={deal.totalDurationUnit} onChange={(e) => setDeal({...deal, totalDurationUnit: e.target.value as any})} className="bg-slate-100 border border-slate-300 border-l-0 rounded-r-lg px-2 text-xs font-bold text-slate-600 outline-none h-full"><option value="Months">Mth</option><option value="Days">Day</option></select></div></div>
                <div className="col-span-2 md:col-span-1"><label className={labelClass}>Installments</label><input type="number" inputMode="decimal" placeholder="e.g. 2.5" value={deal.numInstallments} onChange={(e) => setDeal({...deal, numInstallments: e.target.value})} className={`${inputBase} h-[42px]`} /></div>
            </div>

            {deal.schedule.length === 0 && (
                <button onClick={handleBuildTimeline} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-orange-200 shadow-lg hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"><Calculator size={18} /> Build Payment Timeline</button>
            )}

            {/* SCHEDULE LIST */}
            {deal.schedule.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-slate-500">Payment Schedule</span>
                        <div className="flex items-center gap-3"><button onClick={handleBuildTimeline} className="text-xs text-orange-600 font-bold flex items-center gap-1 hover:underline"><RefreshCcw size={12} /> Reset</button></div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {deal.schedule.map((item, idx) => {
                            const isEditing = activePaymentRow === idx;
                            const isPaid = item.isPaid;

                            return (
                                <div key={item.id} className={`transition-all ${isPaid ? 'bg-emerald-50/50' : ''}`}>
                                    {/* Main Row Content */}
                                    <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                                        <div className="w-full md:w-32"><div className="font-bold text-slate-800 text-sm">{item.label}</div></div>
                                        
                                        {/* Date (Editable only if not paid) */}
                                        <div className="flex-1 w-full md:w-auto">
                                            {isPaid ? (
                                                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 size={12}/> Paid on {displayDate(item.paymentDate || '')}</div>
                                            ) : (
                                                <div className="relative w-full md:w-40 h-[36px] group"><input type="date" value={item.dueDate} onChange={(e) => handleDateChange(idx, e.target.value)} onClick={(e) => {try{(e.target as HTMLInputElement).showPicker()}catch(err){}}} className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" /><div className="w-full h-full border rounded-lg flex items-center px-3 gap-2 transition-all bg-white border-slate-200"><Calendar size={14} className="text-slate-400" /><span className="text-xs font-bold text-slate-700">{displayDate(item.dueDate)}</span></div></div>
                                            )}
                                        </div>

                                        <div className="w-full md:w-32 flex justify-between md:block text-right">
                                            <span className="md:hidden text-xs font-bold text-slate-400">Due:</span>
                                            <div className="font-bold text-slate-600">{formatCurrency(item.expectedAmount)}</div>
                                        </div>

                                        {/* Action Button */}
                                        <button 
                                            onClick={() => isPaid ? undoPayment(idx) : setActivePaymentRow(isEditing ? null : idx)}
                                            className={`w-full md:w-auto px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${isPaid ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-900 text-white shadow-lg hover:bg-black'}`}
                                        >
                                            {isPaid ? 'Paid (Undo)' : 'Record Payment'}
                                        </button>
                                    </div>

                                    {/* INLINE PAYMENT FORM (Visible when 'Record Payment' clicked) */}
                                    {isEditing && !isPaid && (
                                        <div className="bg-slate-50 border-t border-slate-200 p-4 grid gap-4 animate-in slide-in-from-top-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelClass}>Amount Received</label>
                                                    <div className="relative"><input type="text" inputMode="decimal" value={formatIndianInput(item.paidAmount)} onChange={(e) => updateScheduleRow(idx, 'paidAmount', parseInputNumber(e.target.value))} className={`${inputBase} pl-6 font-bold`} placeholder="Enter Amount" /><span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">₹</span></div>
                                                </div>
                                                <div>
                                                    <label className={labelClass}>Payment Mode</label>
                                                    <div className="flex bg-white border border-slate-300 rounded-lg p-1">
                                                        <button onClick={() => updateScheduleRow(idx, 'paymentMode', 'CASH')} className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 ${item.paymentMode === 'CASH' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'}`}><Banknote size={14}/> Cash</button>
                                                        <button onClick={() => updateScheduleRow(idx, 'paymentMode', 'BANK')} className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1 ${item.paymentMode === 'BANK' ? 'bg-blue-500 text-white shadow' : 'text-slate-500'}`}><Landmark size={14}/> Bank</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {item.paymentMode === 'BANK' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><label className={labelClass}>Bank Name</label><input type="text" placeholder="e.g. HDFC" value={item.bankName || ''} onChange={(e) => updateScheduleRow(idx, 'bankName', e.target.value)} className={inputBase} /></div>
                                                    <div><label className={labelClass}>Cheque / Ref No.</label><input type="text" placeholder="123456" value={item.refNumber || ''} onChange={(e) => updateScheduleRow(idx, 'refNumber', e.target.value)} className={inputBase} /></div>
                                                </div>
                                            )}

                                            <div>
                                                <label className={labelClass}>Remarks</label>
                                                <div className="relative"><input type="text" placeholder="Optional notes..." value={item.remarks || ''} onChange={(e) => updateScheduleRow(idx, 'remarks', e.target.value)} className={`${inputBase} pl-8`} /><MessageSquare size={14} className="absolute left-3 top-3 text-slate-400" /></div>
                                            </div>

                                            <div className="flex justify-end gap-3 pt-2">
                                                <button onClick={() => setActivePaymentRow(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg">Cancel</button>
                                                <button onClick={() => confirmPayment(idx)} className="px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-lg flex items-center gap-2"><CheckCircle2 size={16}/> Confirm Payment</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-[10px] text-slate-400"><AlertCircle size={10} className="inline mr-1" /> Payment differences adjust next installment.</p>
                        <div className="flex gap-3">
                            <button onClick={handleExportPDF} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"><FileText size={16} className="text-red-500" /> <span className="hidden md:inline">Print PDF</span></button>
                            <button onClick={triggerSave} disabled={isSaving} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-black transition-all flex items-center gap-2 disabled:opacity-70">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isSaving ? 'Saving...' : 'Save Record'}</button>
                        </div>
                    </div>

                    {/* --- PDF TEMPLATE (UPDATED HEADER & TOTALS) --- */}
                    <div id={`pdf-template-${plotId}`} style={{ display: 'none', width: '700px', backgroundColor: '#fff', color: '#000000', fontFamily: 'sans-serif', fontSize: '11px', lineHeight: '1.5' }}>
                        <div style={{ padding: '40px' }}>
                            {/* HEADER */}
                            <div style={{ borderBottom: '2px solid #ea580c', paddingBottom: '15px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#000000' }}>PLOT SALE AGREEMENT</h1>
                                    <div style={{ marginTop: '8px' }}>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{plotData.customerName || 'Customer Name'}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{plotData.phoneNumber || '-'}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px' }}>{projectIdentity.village || 'Project Name'}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ea580c', margin: '5px 0' }}>#{plotData.plotNumber}</div>
                                    <div style={{ fontSize: '11px', color: '#000000' }}>{displayDate(new Date().toISOString())}</div>
                                </div>
                            </div>

                            {/* DEAL SUMMARY (Now with Pending Amount) */}
                            {(() => {
                                const totalPaid = deal.schedule.reduce((sum, item) => sum + (item.isPaid ? Number(item.paidAmount) : 0), 0);
                                const pending = totalValue - totalPaid;
                                
                                return (
                                <div style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #9ca3af', paddingBottom: '5px', marginBottom: '10px', color: '#000000', textTransform: 'uppercase' }}>Financial Summary</h3>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1, backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '6px' }}>
                                            <div style={{ fontSize: '10px', color: '#475569' }}>Total Deal Value</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>{formatCurrency(totalValue)}</div>
                                        </div>
                                        <div style={{ flex: 1, backgroundColor: '#ecfdf5', padding: '15px', borderRadius: '6px' }}>
                                            <div style={{ fontSize: '10px', color: '#065f46' }}>Total Received</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669' }}>{formatCurrency(totalPaid)}</div>
                                        </div>
                                        <div style={{ flex: 1, backgroundColor: '#fff7ed', padding: '15px', borderRadius: '6px' }}>
                                            <div style={{ fontSize: '10px', color: '#9a3412' }}>Balance Due</div>
                                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ea580c' }}>{formatCurrency(pending)}</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '10px', fontSize: '11px', display: 'flex', gap: '20px' }}>
                                        <span><strong>Area:</strong> {formatInputNumber(plotData.areaVaar)} Vaar</span>
                                        <span><strong>Duration:</strong> {deal.totalDurationVal} {deal.totalDurationUnit}</span>
                                        <span><strong>Installments:</strong> {deal.numInstallments}</span>
                                    </div>
                                </div>
                                )
                            })()}

                            {/* SCHEDULE TABLE */}
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #9ca3af', paddingBottom: '5px', marginBottom: '10px', color: '#000000', textTransform: 'uppercase' }}>Payment Schedule & History</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                                    <thead style={{ backgroundColor: '#f1f5f9' }}>
                                        <tr>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #9ca3af' }}>Installment</th>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #9ca3af' }}>Due Date</th>
                                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #9ca3af' }}>Expected</th>
                                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #9ca3af' }}>Paid</th>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #9ca3af', paddingLeft: '15px' }}>Details / Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deal.schedule.map((item) => (
                                            <tr key={item.id}>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{item.label}</td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>{displayDate(item.dueDate)}</td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{formatCurrency(item.expectedAmount)}</td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 'bold' }}>{item.isPaid ? formatCurrency(Number(item.paidAmount)) : '-'}</td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', paddingLeft: '15px', color: '#475569' }}>
                                                    {item.isPaid ? (
                                                        <>
                                                            <div><strong>{item.paymentMode || 'CASH'}</strong> {item.paymentDate ? `(${displayDate(item.paymentDate)})` : ''}</div>
                                                            {item.paymentMode === 'BANK' && <div>{item.bankName} - {item.refNumber}</div>}
                                                            {item.remarks && <div style={{fontStyle:'italic'}}>"{item.remarks}"</div>}
                                                        </>
                                                    ) : (
                                                        <span style={{color:'#cbd5e1'}}>Pending</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style={{ marginTop: '50px', borderTop: '1px solid #e5e7eb', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ textAlign: 'center', width: '150px' }}><div style={{ height: '40px' }}></div><div style={{ borderTop: '1px solid #000' }}></div><div style={{ fontSize: '10px', marginTop: '5px' }}>Customer Signature</div></div>
                                <div style={{ textAlign: 'center', width: '150px' }}><div style={{ height: '40px' }}></div><div style={{ borderTop: '1px solid #000' }}></div><div style={{ fontSize: '10px', marginTop: '5px' }}>Authorized Signatory</div></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};