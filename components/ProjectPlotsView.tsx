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
  FileText // <--- FIXED: Added this import
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

// --- TYPES FOR DEAL ---
interface PaymentInstallment {
  id: number;
  label: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount: number | ''; 
  isPaid: boolean;
  notes?: string;
}

interface PlotDealState {
  dpAmount: number | '';
  dpType: 'percent' | 'value';
  dpDurationText: string;
  totalMonthsText: string;
  numInstallments: string; 
  schedule: PaymentInstallment[];
}

export const ProjectPlotsView: React.FC<Props> = ({ onBack, projectData, plottingData, projectId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPlotId, setExpandedPlotId] = useState<string | null>(null);
  
  // Local state to manage data so we see updates immediately without refreshing
  const [localPlottingData, setLocalPlottingData] = useState(plottingData);

  // Sync if props change
  useEffect(() => {
    setLocalPlottingData(plottingData);
  }, [plottingData]);

  // 1. Extract Data
  const data = localPlottingData || {}; 
  const plots = data.plotSales || [];
  const landRate = Number(data.landRate) || 0;
  const devRate = Number(data.devRate) || 0;

  // 2. Filter Logic
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

  // 3. SAVE HANDLER (The Engine)
  const handleSaveDeal = async (plotId: string, dealData: PlotDealState) => {
    // A. Update Local State first (Optimistic UI)
    const updatedPlots = plots.map((p: any) => {
        if (p.id === plotId) {
            return { ...p, dealStructure: dealData }; // Save deal data into the plot object
        }
        return p;
    });

    const newPlottingData = { ...data, plotSales: updatedPlots };
    setLocalPlottingData(newPlottingData);

    // B. Update Database
    try {
        const { error } = await supabase
            .from('projects')
            .update({ plotting_data: newPlottingData })
            .eq('id', projectId);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error("Failed to save deal:", err);
        alert("Failed to save to database. Please checks connection.");
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 animate-in fade-in duration-500 font-sans pb-12">
      
      {/* Header */}
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
        
        {/* Search Bar */}
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

        {/* Accordion Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
             {filteredPlots.length === 0 ? (
                <div className="p-8 text-center text-slate-400 italic">
                   {plots.length === 0 ? "No plots found." : "No matching results."}
                </div>
             ) : (
                <div className="divide-y divide-slate-100">
                   {/* Header Row */}
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
                        
                        // Check deal status
                        const deal = plot.dealStructure;
                        const hasActiveDeal = deal && deal.schedule && deal.schedule.length > 0;
                        const isDealClosed = hasActiveDeal && deal.schedule.every((item: any) => item.isPaid);

                        return (
                            <div key={plot.id} className="group transition-colors">
                                {/* MAIN ROW */}
                                <div 
                                  onClick={() => toggleExpand(plot.id)}
                                  className={`
                                    grid grid-cols-2 md:grid-cols-12 gap-4 p-4 items-center cursor-pointer select-none
                                    ${isExpanded ? 'bg-orange-50/50' : 'hover:bg-slate-50'}
                                  `}
                                >
                                    {/* Plot Number */}
                                    <div className="col-span-1 md:text-center font-bold text-slate-700">
                                        <span className="md:hidden text-xs text-slate-400 mr-2">Plot:</span>
                                        #{plot.plotNumber}
                                    </div>

                                    {/* Customer */}
                                    <div className="col-span-1 md:col-span-3">
                                        <div className="font-bold text-slate-800">{plot.customerName || 'Unknown'}</div>
                                        <div className="text-xs text-slate-500">{plot.phoneNumber || '-'}</div>
                                    </div>

                                    {/* Size: Visible on Mobile (Left) */}
                                    <div className="col-span-1 md:col-span-2 text-left md:text-center font-mono text-xs text-slate-600">
                                        <span className="md:hidden text-slate-400 font-sans mr-1">Size:</span>
                                        {formatInputNumber(area)} Vaar
                                    </div>

                                    {/* Value: Visible on Mobile (Right) */}
                                    <div className="col-span-1 md:col-span-2 text-right font-bold text-emerald-600 text-sm">
                                        {formatCurrency(totalValue)}
                                    </div>

                                    {/* Status Pill */}
                                    <div className="col-span-2 flex justify-end md:justify-center">
                                       <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${
                                           isExpanded ? 'bg-orange-100 text-orange-700' : 
                                           isDealClosed ? 'bg-emerald-100 text-emerald-700' :
                                           hasActiveDeal ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                       }`}>
                                          {isExpanded ? 'Managing' : isDealClosed ? 'Deal Closed' : hasActiveDeal ? 'Deal Active' : 'No Deal'}
                                       </span>
                                    </div>

                                    {/* Action Arrow */}
                                    <div className="hidden md:flex col-span-2 justify-end text-slate-400">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* EXPANDED DEAL MANAGER */}
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
    
    // Load initial deal if exists, else defaults
    const [deal, setDeal] = useState<PlotDealState>(initialDeal || {
        dpAmount: '',
        dpType: 'percent',
        dpDurationText: '',
        totalMonthsText: '',
        numInstallments: '',
        schedule: []
    });

    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(initialDeal ? new Date() : null);

    // Helper for input styles
    const inputBase = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-2.5 outline-none transition-all";

    const handleBuildTimeline = () => {
        const dpVal = deal.dpType === 'percent' 
            ? Math.round(totalValue * ((Number(deal.dpAmount)||0) / 100)) 
            : (Number(deal.dpAmount)||0);
        
        const balance = totalValue - dpVal;
        const nInst = parseFloat(deal.numInstallments) || 0;

        if (nInst <= 0) return;

        const instAmount = Math.round(balance / nInst); 
        const newSchedule: PaymentInstallment[] = [];

        // Add DP Row
        newSchedule.push({
            id: 1,
            label: 'Down Payment',
            dueDate: deal.dpDurationText || 'Immediate',
            expectedAmount: dpVal,
            paidAmount: '',
            isPaid: false
        });

        // Add Installment Rows
        const count = Math.ceil(nInst);
        let runningBalance = balance;

        for(let i = 0; i < count; i++) {
            let amount = instAmount;
            if (i === count - 1) amount = runningBalance;
            else runningBalance -= amount;

            newSchedule.push({
                id: i + 2,
                label: `Installment ${i + 1}`,
                dueDate: i === 0 ? 'After DP' : 'Next Cycle',
                expectedAmount: amount,
                paidAmount: '',
                isPaid: false
            });
        }
        setDeal({ ...deal, schedule: newSchedule });
    };

    const handlePaymentChange = (index: number, val: string) => {
        const numericVal = parseInputNumber(val);
        const newSchedule = [...deal.schedule];
        newSchedule[index].paidAmount = numericVal === 0 && val === '' ? '' : numericVal;
        setDeal({ ...deal, schedule: newSchedule });
    };

    const markAsPaid = (index: number) => {
        const newSchedule = [...deal.schedule];
        const current = newSchedule[index];
        
        current.isPaid = !current.isPaid;
        
        if (current.isPaid) {
            const actualPaid = current.paidAmount === '' ? current.expectedAmount : Number(current.paidAmount);
            current.paidAmount = actualPaid; 

            const diff = current.expectedAmount - actualPaid; 
            
            if (index + 1 < newSchedule.length && diff !== 0) {
                const nextRow = newSchedule[index + 1];
                nextRow.expectedAmount += diff;
            }
        } 
        setDeal({ ...deal, schedule: newSchedule });
    };

    // Trigger Parent Save
    const triggerSave = async () => {
        setIsSaving(true);
        const success = await onSave(plotId, deal);
        setIsSaving(false);
        if(success) setLastSaved(new Date());
    };

    // --- HTML2PDF GENERATOR ---
    const handleExportPDF = () => {
        const element = document.getElementById(`pdf-template-${plotId}`);
        if (!element) return;
        
        // Show element temporarily
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
            
            {/* --- TOP: INPUTS --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Down Payment</label>
                    <div className="flex">
                        <input 
                            type="number" 
                            inputMode="decimal" 
                            placeholder={deal.dpType === 'percent' ? "e.g. 20" : "Amount"}
                            value={deal.dpAmount}
                            onChange={(e) => setDeal({...deal, dpAmount: parseInputNumber(e.target.value)})}
                            className={`${inputBase} rounded-r-none border-r-0`}
                        />
                        <button 
                            onClick={() => setDeal({...deal, dpType: deal.dpType === 'percent' ? 'value' : 'percent'})}
                            className="bg-slate-100 border border-slate-300 border-l-0 rounded-r-lg px-3 text-xs font-bold text-slate-600 hover:bg-slate-200"
                        >
                            {deal.dpType === 'percent' ? '%' : '₹'}
                        </button>
                    </div>
                </div>

                <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">DP Duration</label>
                    <input 
                        type="text" 
                        placeholder="e.g. 1 Month"
                        value={deal.dpDurationText}
                        onChange={(e) => setDeal({...deal, dpDurationText: e.target.value})}
                        className={inputBase}
                    />
                </div>

                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Time</label>
                    <input 
                        type="text" 
                        placeholder="e.g. 11 Months"
                        value={deal.totalMonthsText}
                        onChange={(e) => setDeal({...deal, totalMonthsText: e.target.value})}
                        className={inputBase}
                    />
                </div>

                <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Installments</label>
                    <input 
                        type="number" 
                        inputMode="decimal"
                        placeholder="e.g. 2.5"
                        value={deal.numInstallments}
                        onChange={(e) => setDeal({...deal, numInstallments: e.target.value})}
                        className={inputBase}
                    />
                </div>
            </div>

            {/* --- ACTION: BUILD --- */}
            {deal.schedule.length === 0 && (
                <button 
                    onClick={handleBuildTimeline}
                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-orange-200 shadow-lg hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Calculator size={18} /> Build Payment Timeline
                </button>
            )}

            {/* --- BOTTOM: TIMELINE LIST --- */}
            {deal.schedule.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-slate-500">Payment Schedule</span>
                        <div className="flex items-center gap-3">
                            <button onClick={handleBuildTimeline} className="text-xs text-orange-600 font-bold flex items-center gap-1 hover:underline">
                                <RefreshCcw size={12} /> Reset
                            </button>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {deal.schedule.map((item, idx) => (
                            <div key={item.id} className={`p-4 flex flex-col md:flex-row gap-4 items-center ${item.isPaid ? 'bg-emerald-50/50' : ''}`}>
                                
                                {/* Info */}
                                <div className="flex-1 w-full md:w-auto">
                                    <div className="flex justify-between md:block">
                                        <div className="font-bold text-slate-800 text-sm">{item.label}</div>
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.dueDate}</div>
                                    </div>
                                </div>

                                {/* Expected */}
                                <div className="w-full md:w-32 flex justify-between md:block text-right">
                                    <span className="md:hidden text-xs font-bold text-slate-400">Due:</span>
                                    <div className="font-bold text-slate-600">{formatCurrency(item.expectedAmount)}</div>
                                </div>

                                {/* Paid Input */}
                                <div className="w-full md:w-40 relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">₹</span>
                                    <input 
                                        type="number"
                                        inputMode="decimal"
                                        placeholder="Enter Paid"
                                        disabled={item.isPaid}
                                        value={item.paidAmount}
                                        onChange={(e) => handlePaymentChange(idx, e.target.value)}
                                        className={`w-full pl-6 pr-3 py-2 text-sm font-bold rounded-lg border outline-none transition-all ${
                                            item.isPaid 
                                            ? 'bg-transparent border-transparent text-emerald-700' 
                                            : 'bg-white border-slate-300 focus:ring-2 focus:ring-emerald-500'
                                        }`}
                                    />
                                </div>

                                {/* Status Checkbox */}
                                <button 
                                    onClick={() => markAsPaid(idx)}
                                    className={`
                                        w-full md:w-auto px-4 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all
                                        ${item.isPaid 
                                            ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-md' 
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                        }
                                    `}
                                >
                                    {item.isPaid ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded border-2 border-slate-400" />}
                                    {item.isPaid ? 'PAID' : 'Mark Paid'}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-[10px] text-slate-400">
                            <AlertCircle size={10} className="inline mr-1" />
                            Differences in payment will automatically adjust the next installment.
                        </p>

                        {/* BUTTONS ROW */}
                        <div className="flex gap-3">
                            {/* PDF Export Button */}
                            <button 
                                onClick={handleExportPDF}
                                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <FileText size={16} className="text-red-500" /> 
                                <span className="hidden md:inline">Print PDF</span>
                            </button>

                            {/* Save Button */}
                            <button 
                                onClick={triggerSave}
                                disabled={isSaving}
                                className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-black transition-all flex items-center gap-2 disabled:opacity-70"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSaving ? 'Saving...' : 'Save Record'}
                            </button>
                        </div>
                    </div>

                    {/* --- HIDDEN PDF TEMPLATE --- */}
                    <div id={`pdf-template-${plotId}`} style={{ display: 'none', width: '700px', backgroundColor: '#fff', color: '#000000', fontFamily: 'sans-serif', fontSize: '11px', lineHeight: '1.5' }}>
                        <div style={{ padding: '40px' }}>
                            
                            {/* HEADER */}
                            <div style={{ borderBottom: '2px solid #ea580c', paddingBottom: '15px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0, color: '#000000' }}>PLOT SALE AGREEMENT</h1>
                                    <p style={{ margin: '4px 0 0', color: '#333333', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{projectIdentity.village || 'Project Name'}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000000' }}>{new Date().toLocaleDateString()}</div>
                                    <div style={{ fontSize: '9px', color: '#333333', marginTop: '4px' }}>Plot #{plotData.plotNumber}</div>
                                </div>
                            </div>

                            {/* SECTION A: CUSTOMER DETAILS */}
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #9ca3af', paddingBottom: '5px', marginBottom: '10px', color: '#000000', textTransform: 'uppercase' }}>A. Customer & Plot Details</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', width: '25%', fontWeight: 'bold', color: '#374151' }}>Customer Name</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', width: '25%' }}>{plotData.customerName || '-'}</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', width: '25%', fontWeight: 'bold', color: '#374151' }}>Plot Number</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', width: '25%', fontWeight: 'bold', fontSize: '12px' }}>#{plotData.plotNumber}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#374151' }}>Phone Number</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{plotData.phoneNumber || '-'}</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#374151' }}>Plot Area</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{formatInputNumber(plotData.areaVaar)} Vaar</td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#374151' }}>Booking Date</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{plotData.bookingDate}</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#374151' }}>Dimensions</td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{plotData.dimLengthFt} x {plotData.dimWidthFt} ft</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* SECTION B: FINANCIAL SUMMARY */}
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #9ca3af', paddingBottom: '5px', marginBottom: '10px', color: '#000000', textTransform: 'uppercase' }}>B. Deal Financials</h3>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '6px' }}>
                                    <div style={{ flex: '1 1 40%' }}>
                                        <div style={{ fontSize: '9px', color: '#333333' }}>Total Plot Value</div>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000' }}>{formatCurrency(totalValue)}</div>
                                    </div>
                                    <div style={{ flex: '1 1 40%' }}>
                                        <div style={{ fontSize: '9px', color: '#333333' }}>Down Payment</div>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000' }}>{formatCurrency(Number(deal.dpAmount))} <span style={{fontSize: '10px', fontWeight: 'normal'}}>({deal.dpType === 'percent' ? `${deal.dpAmount}%` : 'Fixed'})</span></div>
                                    </div>
                                    <div style={{ flex: '1 1 40%' }}>
                                        <div style={{ fontSize: '9px', color: '#333333' }}>Installments</div>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000' }}>{deal.numInstallments}</div>
                                    </div>
                                    <div style={{ flex: '1 1 40%' }}>
                                        <div style={{ fontSize: '9px', color: '#333333' }}>Total Duration</div>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000' }}>{deal.totalMonthsText}</div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION C: PAYMENT SCHEDULE */}
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 'bold', borderBottom: '1px solid #9ca3af', paddingBottom: '5px', marginBottom: '10px', color: '#000000', textTransform: 'uppercase' }}>C. Payment Schedule</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                                    <thead style={{ backgroundColor: '#f3f4f6' }}>
                                        <tr>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #9ca3af', color: '#000000' }}>Installment</th>
                                            <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #9ca3af', color: '#000000' }}>Due Date</th>
                                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #9ca3af', color: '#000000' }}>Expected Amount</th>
                                            <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #9ca3af', color: '#000000' }}>Paid Amount</th>
                                            <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #9ca3af', color: '#000000' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deal.schedule.map((item, i) => (
                                            <tr key={item.id}>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{item.label}</td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{item.dueDate}</td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>{formatCurrency(item.expectedAmount)}</td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', fontWeight: 'bold' }}>
                                                    {item.isPaid ? formatCurrency(Number(item.paidAmount)) : '-'}
                                                </td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                                                    <span style={{ 
                                                        color: item.isPaid ? '#15803d' : '#c2410c', 
                                                        fontWeight: 'bold',
                                                        padding: '2px 6px',
                                                        backgroundColor: item.isPaid ? '#dcfce7' : '#ffedd5',
                                                        borderRadius: '4px'
                                                    }}>
                                                        {item.isPaid ? 'PAID' : 'PENDING'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr style={{ backgroundColor: '#fff7ed', borderTop: '2px solid #ea580c' }}>
                                            <td colSpan={2} style={{ padding: '10px', fontWeight: 'bold', color: '#c2410c' }}>TOTAL</td>
                                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#c2410c' }}>{formatCurrency(totalValue)}</td>
                                            <td colSpan={2}></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style={{ marginTop: '40px', borderTop: '1px solid #e5e7eb', paddingTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ height: '40px' }}></div>
                                    <div style={{ borderTop: '1px solid #000', width: '150px', margin: '0 auto' }}></div>
                                    <div style={{ fontSize: '10px', marginTop: '5px' }}>Customer Signature</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ height: '40px' }}></div>
                                    <div style={{ borderTop: '1px solid #000', width: '150px', margin: '0 auto' }}></div>
                                    <div style={{ fontSize: '10px', marginTop: '5px' }}>Authorized Signatory</div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};