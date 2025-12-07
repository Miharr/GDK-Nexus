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
  MessageSquare,
  PlusCircle,
  User,
  Trash2
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

// --- TYPES ---
interface PaymentInstallment {
  id: number;
  label: string;
  dueDate: string;
  expectedAmount: number;
  
  // Payment State
  paidAmount: number | ''; 
  isPaid: boolean;
  paymentDate?: string;
  
  // Audit Details
  paymentMode?: 'CASH' | 'BANK';
  bankName?: string;
  refNumber?: string; 
  remarks?: string;
  
  // Flags
  isInterim?: boolean; 
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

  // Agent
  agentName?: string;
  agentPhone?: string;
  agentCommission?: string;
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

// Sort helper: Keeps dates in order
const sortScheduleByDate = (schedule: PaymentInstallment[]) => {
    return [...schedule].sort((a, b) => {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB;
    });
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
                        // Crash Proof Checks
                        const hasActiveDeal = deal && Array.isArray(deal.schedule) && deal.schedule.length > 0;
                        const isDealClosed = hasActiveDeal && deal.schedule?.every((item: any) => item.isPaid);

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
    
    // Initial State Safety Merge
    const [deal, setDeal] = useState<PlotDealState>({
        startDate: initialDeal?.startDate || getLocalToday(),
        dpAmount: initialDeal?.dpAmount || '',
        dpType: initialDeal?.dpType || 'percent',
        dpDurationVal: initialDeal?.dpDurationVal || '', 
        dpDurationUnit: initialDeal?.dpDurationUnit || 'Months',
        totalDurationVal: initialDeal?.totalDurationVal || '', 
        totalDurationUnit: initialDeal?.totalDurationUnit || 'Months',
        numInstallments: initialDeal?.numInstallments || '',
        agentName: initialDeal?.agentName || '', 
        agentPhone: initialDeal?.agentPhone || '', 
        agentCommission: initialDeal?.agentCommission || '',
        schedule: Array.isArray(initialDeal?.schedule) ? initialDeal!.schedule : []
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

        const newSchedule: PaymentInstallment[] = [];

        // 1. SPOT DEAL (No DP, No Installs)
        if (dpVal === 0 && nInst === 0) {
             newSchedule.push({
                id: 1, 
                label: 'Full Payment', 
                dueDate: start.toISOString().split('T')[0], 
                expectedAmount: totalValue, 
                paidAmount: '', 
                isPaid: false
            });
            setDeal({ ...deal, schedule: newSchedule });
            return;
        }

        // 2. STANDARD DEAL - Row 1: Down Payment
        newSchedule.push({
            id: 1, label: 'Down Payment', dueDate: dpDate.toISOString().split('T')[0],
            expectedAmount: dpVal, paidAmount: '', isPaid: false
        });

        // Row 2+: Installments
        if (nInst > 0) {
            const timeSpan = endDate.getTime() - dpDate.getTime();
            const intervalMs = Math.max(0, timeSpan) / Math.ceil(nInst);
            const instAmount = Math.round(balance / nInst); 

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
        }
        setDeal({ ...deal, schedule: newSchedule });
    };

    const handleAddInterim = () => {
        const newRow: PaymentInstallment = {
            id: Date.now(),
            label: 'Interim Payment',
            dueDate: getLocalToday(),
            expectedAmount: 0, 
            paidAmount: '',
            isPaid: false,
            isInterim: true
        };
        const newSchedule = [...deal.schedule, newRow];
        const sorted = sortScheduleByDate(newSchedule);
        setDeal({ ...deal, schedule: sorted });
    };

    const handleRemoveInterim = (id: number) => {
        const newSchedule = deal.schedule.filter(s => s.id !== id);
        setDeal({ ...deal, schedule: newSchedule });
    }

    const updateScheduleRow = (index: number, field: keyof PaymentInstallment, val: any) => {
        const newSchedule = [...deal.schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: val };
        setDeal({ ...deal, schedule: newSchedule });
    };

    const handleDateChange = (index: number, val: string) => {
        const newSchedule = [...deal.schedule];
        newSchedule[index] = { ...newSchedule[index], dueDate: val };
        // Auto-sort when date changes
        const sorted = sortScheduleByDate(newSchedule);
        setDeal({ ...deal, schedule: sorted });
    };

    // --- SMART LOGIC: SPLIT & SPILLOVER ---
    const confirmPayment = (index: number) => {
        let newSchedule = [...deal.schedule];
        const current = newSchedule[index];
        
        // 1. Update Current Row
        const actualPaid = current.paidAmount === '' ? current.expectedAmount : Number(current.paidAmount);
        const originalExpected = current.expectedAmount;
        
        current.isPaid = true;
        current.paidAmount = actualPaid; 
        current.paymentDate = current.paymentDate || getLocalToday(); // Use existing or today

        const diff = originalExpected - actualPaid; 

        // 2. Logic Branching
        if (diff > 0) {
            // Case A: Partial Payment (SPLIT)
            // Current becomes the paid portion
            current.expectedAmount = actualPaid; 
            
            // Create Balance Row
            const balRow: PaymentInstallment = {
                ...current,
                id: Date.now(),
                label: `${current.label} (Bal)`,
                expectedAmount: diff,
                paidAmount: '',
                isPaid: false,
                isInterim: false,
                paymentDate: undefined,
                paymentMode: undefined,
                bankName: undefined,
                refNumber: undefined,
                remarks: undefined
            };
            // Insert after current
            newSchedule.splice(index + 1, 0, balRow);

        } else if (diff < 0) {
            // Case B: Overpayment / Interim (SPILLOVER)
            // Current expected matches paid so it looks clean
            current.expectedAmount = actualPaid; 
            
            let excess = Math.abs(diff); // Amount to deduct from future
            
            for (let i = index + 1; i < newSchedule.length; i++) {
                if (newSchedule[i].isPaid) continue; // Skip already paid rows
                
                if (newSchedule[i].expectedAmount >= excess) {
                    newSchedule[i].expectedAmount -= excess;
                    excess = 0;
                    break;
                } else {
                    // This row is smaller than excess, wipe it out and carry over
                    excess -= newSchedule[i].expectedAmount;
                    newSchedule[i].expectedAmount = 0; 
                }
            }
        }

        // 3. Final Sort & Save
        // We don't sort here to keep the Split row immediately after the parent
        setDeal({ ...deal, schedule: newSchedule });
        setActivePaymentRow(null);
    };

    const undoPayment = (index: number) => {
        const newSchedule = [...deal.schedule];
        newSchedule[index].isPaid = false;
        // Ideally we revert splits/spillovers but that's complex history tracking.
        // Simple undo just unchecks. User can manually edit amounts if needed.
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

    // --- RUNNING BALANCE CALCULATION FOR UI ---
    let runningBalanceUI = totalValue;

    // Calculate Footer Totals
    const totalPaid = deal.schedule.reduce((sum, item) => sum + (item.isPaid ? Number(item.paidAmount) : 0), 0);
    const balanceDue = totalValue - totalPaid;

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

            {/* AGENT SECTION */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2"><User size={14} className="text-slate-400" /><span className="text-xs font-bold text-slate-500 uppercase">Agent / Commission Details</span></div>
                <div className="grid grid-cols-3 gap-3">
                    <input type="text" placeholder="Agent Name" value={deal.agentName || ''} onChange={(e) => setDeal({...deal, agentName: e.target.value})} className={inputBase} />
                    <input type="text" inputMode="tel" placeholder="Phone" value={deal.agentPhone || ''} onChange={(e) => setDeal({...deal, agentPhone: e.target.value})} className={inputBase} />
                    <div className="relative"><input type="text" inputMode="decimal" placeholder="Commission" value={formatIndianInput(deal.agentCommission || '')} onChange={(e) => setDeal({...deal, agentCommission: parseInputNumber(e.target.value)})} className={`${inputBase} pl-6`} /><span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">₹</span></div>
                </div>
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
                        {(deal.schedule || []).map((item, idx) => {
                            const isEditing = activePaymentRow === idx;
                            const isPaid = item.isPaid;
                            
                            // Calc Balance for this row
                            if (item.isPaid) {
                                runningBalanceUI -= Number(item.paidAmount);
                            }

                            return (
                                <div key={item.id} className={`transition-all ${isPaid ? 'bg-emerald-50/50' : ''}`}>
                                    {/* Main Row Content */}
                                    <div className="p-4 flex flex-col md:flex-row gap-4 items-center">
                                        <div className="w-full md:w-32">
                                            <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                {item.isInterim && <PlusCircle size={12} className="text-blue-500" />}
                                                {item.label}
                                                {item.isInterim && !isPaid && (
                                                    <button onClick={() => handleRemoveInterim(item.id)} className="text-red-400 hover:text-red-600 ml-2"><Trash2 size={12}/></button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Date (Shows Due + Paid if applicable) */}
                                        <div className="flex-1 w-full md:w-auto flex flex-col justify-center">
                                            <div className={`relative w-full md:w-40 h-[36px] group ${isPaid ? 'opacity-70' : ''}`}>
                                                <input 
                                                    type="date" 
                                                    value={item.dueDate} 
                                                    disabled={isPaid} // Lock due date if paid
                                                    onChange={(e) => handleDateChange(idx, e.target.value)} 
                                                    onClick={(e) => {try{(e.target as HTMLInputElement).showPicker()}catch(err){}}} 
                                                    className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" 
                                                />
                                                <div className="w-full h-full border rounded-lg flex items-center px-3 gap-2 transition-all bg-white border-slate-200">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-700">{displayDate(item.dueDate)}</span>
                                                </div>
                                            </div>
                                            {isPaid && (
                                                <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1 pl-1">
                                                    <CheckCircle2 size={10}/> Pd: {displayDate(item.paymentDate || '')}
                                                </div>
                                            )}
                                        </div>

                                       {/* Amounts + Running Balance */}
                                       <div className="w-full md:w-48 flex justify-between md:block text-right">
                                            <span className="md:hidden text-xs font-bold text-slate-400">Due:</span>
                                            <div className="font-bold text-slate-600">{formatCurrency(item.expectedAmount)}</div>
                                            {item.isPaid && (
                                                <div className="text-[10px] font-bold text-emerald-600 mt-1">
                                                    Pd: {formatCurrency(Number(item.paidAmount))}
                                                </div>
                                            )}
                                            {/* BALANCE DISPLAY */}
                                            {isPaid && (
                                                <div className="text-[10px] font-mono text-slate-400 mt-1 border-t border-slate-200 pt-1">
                                                    Bal: {formatCurrency(runningBalanceUI)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <button 
                                            onClick={() => isPaid ? undoPayment(idx) : setActivePaymentRow(isEditing ? null : idx)}
                                            className={`w-full md:w-auto px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${isPaid ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-900 text-white shadow-lg hover:bg-black'}`}
                                        >
                                            {isPaid ? 'Paid (Undo)' : 'Record Payment'}
                                        </button>
                                    </div>

                                   {/* INLINE PAYMENT FORM */}
                                    {isEditing && !isPaid && (
                                        <div className="bg-slate-50 border-t border-slate-200 p-4 grid gap-4 animate-in slide-in-from-top-2">
                                            {/* GRID ADJUSTMENT FOR INTERIM (Hide Date Picker) */}
                                            <div className={`grid grid-cols-1 ${!item.isInterim ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                                                
                                                {/* 1. Payment Date Picker (Only for Regular) */}
                                                {!item.isInterim && (
                                                    <div>
                                                        <label className={labelClass}>Payment Date</label>
                                                        <div className="relative w-full h-[42px] group">
                                                            <input 
                                                                type="date" 
                                                                value={item.paymentDate || getLocalToday()} 
                                                                onChange={(e) => updateScheduleRow(idx, 'paymentDate', e.target.value)} 
                                                                onClick={(e) => {try{(e.target as HTMLInputElement).showPicker()}catch(err){}}} 
                                                                className="absolute inset-0 w-full h-full z-20 opacity-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0" 
                                                            />
                                                            <div className="w-full h-full bg-white border border-slate-300 rounded-lg flex items-center px-3 gap-2 transition-all">
                                                                <Calendar size={16} className="text-slate-400" />
                                                                <span className="text-sm font-bold text-slate-800">{displayDate(item.paymentDate || getLocalToday())}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 2. Amount */}
                                                <div>
                                                    <label className={labelClass}>Amount Received</label>
                                                    <div className="relative h-[42px]">
                                                        <input type="text" inputMode="decimal" value={formatIndianInput(item.paidAmount)} onChange={(e) => updateScheduleRow(idx, 'paidAmount', parseInputNumber(e.target.value))} className={`${inputBase} h-full pl-6 font-bold`} placeholder="Enter Amount" />
                                                        <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">₹</span>
                                                    </div>
                                                </div>

                                                {/* 3. Mode */}
                                                <div>
                                                    <label className={labelClass}>Payment Mode</label>
                                                    <div className="flex bg-white border border-slate-300 rounded-lg p-1 h-[42px]">
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

                    {/* LIVE TOTALS FOOTER */}
                    <div className="bg-slate-50 border-t border-slate-200 p-4">
                        <button onClick={handleAddInterim} className="w-full mb-4 border border-dashed border-slate-300 rounded-lg py-2 text-xs font-bold text-slate-500 hover:bg-white hover:text-orange-600 transition-all flex items-center justify-center gap-2"><PlusCircle size={14}/> Add Interim Payment</button>
                        
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white rounded p-2 border border-slate-200"><div className="text-[10px] text-slate-400 uppercase font-bold">Total Deal</div><div className="text-sm font-bold text-slate-800">{formatCurrency(totalValue)}</div></div>
                            <div className="bg-emerald-50 rounded p-2 border border-emerald-100"><div className="text-[10px] text-emerald-600 uppercase font-bold">Total Paid</div><div className="text-sm font-bold text-emerald-700">{formatCurrency(totalPaid)}</div></div>
                            <div className="bg-orange-50 rounded p-2 border border-orange-100"><div className="text-[10px] text-orange-600 uppercase font-bold">Balance Due</div><div className="text-sm font-bold text-orange-700">{formatCurrency(balanceDue)}</div></div>
                        </div>
                    </div>

                    <div className="p-4 bg-white border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex gap-3">
                            <button onClick={handleExportPDF} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"><FileText size={16} className="text-red-500" /> <span className="hidden md:inline">Print PDF</span></button>
                            <button onClick={triggerSave} disabled={isSaving} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-black transition-all flex items-center gap-2 disabled:opacity-70">{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{isSaving ? 'Saving...' : 'Save Record'}</button>
                        </div>
                    </div>

                    {/* --- PDF TEMPLATE (PROFESSIONAL DESIGN) --- */}
                    <div id={`pdf-template-${plotId}`} style={{ display: 'none', width: '750px', backgroundColor: '#ffffff', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: '#1f2937' }}>
                        
                        {/* BORDER CONTAINER */}
                        <div style={{ padding: '40px', position: 'relative' }}>
                            
                            {/* 1. HEADER */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #f97316', paddingBottom: '20px', marginBottom: '30px' }}>
                                <div>
                                    <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 5px 0', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plot Sale Agreement</h1>
                                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>AGREEMENT REF: {new Date().getFullYear()}-{plotData.plotNumber}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f97316', textTransform: 'uppercase' }}>{projectIdentity.village || 'Project Name'}</div>
                                    <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px' }}>Date: {displayDate(new Date().toISOString())}</div>
                                </div>
                            </div>

                            {/* 2. PARTY DETAILS (GRID LAYOUT) */}
                            <div style={{ display: 'flex', gap: '30px', marginBottom: '30px' }}>
                                {/* CUSTOMER BOX */}
                                <div style={{ flex: 1, backgroundColor: '#f9fafb', padding: '15px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 'bold', letterSpacing: '1px' }}>Buyer Details</h3>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', marginBottom: '2px' }}>{plotData.customerName || 'N/A'}</div>
                                    <div style={{ fontSize: '12px', color: '#4b5563' }}>Phone: {plotData.phoneNumber || '-'}</div>
                                </div>

                                {/* PROPERTY BOX */}
                                <div style={{ flex: 1, backgroundColor: '#f9fafb', padding: '15px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '11px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 'bold', letterSpacing: '1px' }}>Property Details</h3>
                                    <table style={{ width: '100%', fontSize: '12px' }}>
                                        <tbody>
                                            <tr>
                                                <td style={{ paddingBottom: '4px', color: '#6b7280' }}>Plot Number:</td>
                                                <td style={{ paddingBottom: '4px', fontWeight: 'bold', textAlign: 'right' }}>#{plotData.plotNumber}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ paddingBottom: '4px', color: '#6b7280' }}>Area:</td>
                                                <td style={{ paddingBottom: '4px', fontWeight: 'bold', textAlign: 'right' }}>{formatInputNumber(plotData.areaVaar)} Vaar</td>
                                            </tr>
                                            <tr>
                                                <td style={{ color: '#6b7280' }}>Dimensions:</td>
                                                <td style={{ fontWeight: 'bold', textAlign: 'right' }}>{plotData.dimLengthFt} x {plotData.dimWidthFt} ft</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* 3. FINANCIAL TERMS (UPDATED: NO DP) */}
                            <div style={{ marginBottom: '30px' }}>
                                <div style={{ padding: '8px 0', borderBottom: '2px solid #e5e7eb', marginBottom: '15px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#374151' }}>Financial Terms</div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #e5e7eb' }}>
                                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b7280' }}>Total Deal Value</div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', marginTop: '4px' }}>{formatCurrency(totalValue)}</div>
                                    </div>
                                    {/* Removed Down Payment Box */}
                                    <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid #e5e7eb' }}>
                                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b7280' }}>Total Paid</div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#059669', marginTop: '4px' }}>{formatCurrency(totalPaid)}</div>
                                    </div>
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b7280' }}>Balance Due</div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626', marginTop: '4px' }}>{formatCurrency(balanceDue)}</div>
                                    </div>
                                </div>

                                {/* Agent Row */}
                                {(deal.agentName || deal.agentPhone) && (
                                    <div style={{ backgroundColor: '#fff7ed', padding: '8px 12px', borderRadius: '4px', fontSize: '10px', color: '#9a3412', display: 'flex', gap: '20px' }}>
                                        <span><strong>Agent:</strong> {deal.agentName || 'N/A'}</span>
                                        <span><strong>Contact:</strong> {deal.agentPhone || 'N/A'}</span>
                                        {deal.agentCommission && <span><strong>Commission:</strong> {formatCurrency(Number(deal.agentCommission))}</span>}
                                    </div>
                                )}
                            </div>

                            {/* 4. PAYMENT SCHEDULE TABLE (WITH BALANCE) */}
                            <div>
                                <div style={{ padding: '8px 0', borderBottom: '2px solid #e5e7eb', marginBottom: '10px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#374151' }}>Payment Schedule</div>
                                
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#374151', color: '#ffffff' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '500', borderRadius: '4px 0 0 4px' }}>Description</th>
                                           <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '500' }}>Due Date</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '500' }}>Amount (Due / Paid)</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '500' }}>Balance</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '500', width: '30%', borderRadius: '0 4px 4px 0' }}>Ref / Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            let pdfBalance = totalValue;
                                            return deal.schedule.map((item, idx) => {
                                                if (item.isPaid) pdfBalance -= Number(item.paidAmount);
                                                
                                                return (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                                                        <td style={{ padding: '10px 12px', color: '#111827' }}>{item.label}</td>
                                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                                            <div>{displayDate(item.dueDate)}</div>
                                                            {item.isPaid && item.paymentDate && (
                                                                <div style={{ fontSize: '9px', color: '#059669', fontWeight: 'bold', marginTop: '2px' }}>
                                                                    Pd: {displayDate(item.paymentDate)}
                                                                </div>
                                                            )}
                                                        </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 'bold', color: '#111827' }}>
                                                            <div>{formatCurrency(item.expectedAmount)}</div>
                                                            {item.isPaid && (
                                                                <div style={{ fontSize: '9px', color: '#059669', marginTop: '2px' }}>
                                                                    Pd: {formatCurrency(Number(item.paidAmount))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontFamily: 'monospace' }}>
                                                            {item.isPaid ? formatCurrency(pdfBalance) : '-'}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', fontSize: '10px', color: '#4b5563' }}>
                                                            {item.isPaid ? (
                                                                <div style={{ lineHeight: '1.4' }}>
                                                                    <div style={{ fontWeight: 'bold' }}>{item.paymentMode || 'CASH'}</div>
                                                                    {item.paymentMode === 'BANK' && <div>{item.bankName} #{item.refNumber}</div>}
                                                                    {item.remarks && <div style={{ fontStyle: 'italic', color: '#6b7280' }}>"{item.remarks}"</div>}
                                                                </div>
                                                            ) : (
                                                                <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Pending</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid #374151' }}>
                                            <td colSpan={2} style={{ padding: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                                                <div>{formatCurrency(totalValue)}</div>
                                                <div style={{ fontSize: '10px', color: '#059669', marginTop: '2px' }}>Pd: {formatCurrency(totalPaid)}</div>
                                            </td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* 5. FOOTER / SIGNATURES */}
                            <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pageBreakInside: 'avoid' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ borderTop: '1px solid #111827', width: '180px', margin: '0 auto 8px' }}></div>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Customer Signature</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ borderTop: '1px solid #111827', width: '180px', margin: '0 auto 8px' }}></div>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Authorized Signatory</div>
                                    <div style={{ fontSize: '9px', color: '#6b7280' }}>For {projectIdentity.village || 'Company'}</div>
                                </div>
                            </div>

                        </div>
                    
                    </div>
                </div>
            )}
        </div>
    );
};
