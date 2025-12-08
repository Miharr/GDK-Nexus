import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  IndianRupee, 
  HardHat, 
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Users,
  Calendar,
  Search,
  LayoutGrid
} from 'lucide-react';
import { Card } from './Card';
import { supabase } from '../supabaseClient';
import { 
  ProjectSavedState, 
  PlottingState, 
  PlottingDevExpense, 
  UnitType
} from '../types';
import { formatCurrency, formatInputNumber, parseInputNumber } from '../utils/formatters';

interface Props {
  onBack: () => void;
  onOpenMenu: () => void;
  projectData: ProjectSavedState;
  existingPlottingData?: PlottingState;
  projectId: number;
}

const CONVERSION_RATES = {
  Vigha: 1,
  SqMeter: 2377.73,
  Vaar: 2843.71,
  Guntha: 23.50,
  SqKm: 4.00
};

export const PlottingDashboard: React.FC<Props> = ({ onBack, onOpenMenu, projectData, existingPlottingData, projectId }) => {
  
  // --- STATE ---
  const [landRate, setLandRate] = useState<number | ''>(''); 
  const [devRate, setDevRate] = useState<number | ''>('');
  
  const [devExpenses, setDevExpenses] = useState<PlottingDevExpense[]>([
    { id: '1', description: 'Compound Wall', amount: '' },
    { id: '2', description: 'Internal Roads', amount: '' },
    { id: '3', description: 'Entry Gate', amount: '' },
  ]);

  const [plotSales, setPlotSales] = useState<any[]>([]);
  const [totalPlotsConfig, setTotalPlotsConfig] = useState<number>(30); // Default 30 plots
  const [searchQuery, setSearchQuery] = useState('');

  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [areaInVaar, setAreaInVaar] = useState<number>(0);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Calculate Base Area in Vaar
    if (projectData) {
        const m = projectData.measurements;
        let baseVal = 0;
        let baseUnit: UnitType = 'Vaar';

        if (m.plottedArea && Number(m.plottedArea) > 0) {
            baseVal = Number(m.plottedArea);
            baseUnit = m.plottedUnit || 'Vaar';
        } else {
            const inputVal = Number(m.areaInput) || 0;
            let valInVigha = 0;
            if (m.inputUnit === 'Vigha') valInVigha = inputVal;
            else valInVigha = inputVal / CONVERSION_RATES[m.inputUnit];
            
            const fpVigha = valInVigha * 0.60;
            baseVal = fpVigha;
            baseUnit = 'Vigha';
        }

        const calculatedVaar = baseVal * (CONVERSION_RATES.Vaar / CONVERSION_RATES[baseUnit]);
        setAreaInVaar(calculatedVaar);
    }

    // 2. Load Saved Data
    if (existingPlottingData) {
      setLandRate(existingPlottingData.landRate || '');
      setDevRate(existingPlottingData.devRate || '');
      setDevExpenses(existingPlottingData.developmentExpenses || []);
      setPlotSales(existingPlottingData.plotSales || []);
      // Load total plots config or default to 30
      if(existingPlottingData.totalPlots) setTotalPlotsConfig(existingPlottingData.totalPlots);
    }
  }, [existingPlottingData, projectData]);

  // --- WEIGHTED AVERAGE LAND RATE CALCULATION ---
  useEffect(() => {
      const totalLandValue = plotSales.reduce((sum, p) => {
          const pRate = Number(p.customLandRate) || 0;
          const pArea = Number(p.areaVaar) || 0;
          return sum + (pRate * pArea);
      }, 0);

      const totalPlotArea = plotSales.reduce((sum, p) => sum + (Number(p.areaVaar) || 0), 0);

      // Fix: Ensure we don't set NaN if area is 0
      if (totalPlotArea > 0) {
          const weightedAvg = totalLandValue / totalPlotArea;
          setLandRate(parseFloat(weightedAvg.toFixed(2)));
      } else {
          setLandRate(0);
      }
  }, [plotSales]);


  // --- CALCULATIONS ---
  const totalLandAmount = (Number(landRate) || 0) * areaInVaar; 
  const totalDevAmount = (Number(devRate) || 0) * areaInVaar;
  const grandTotalCost = totalLandAmount + totalDevAmount;

  const totalDevExpenseList = devExpenses.reduce((sum, item) => sum + (item.amount === '' ? 0 : item.amount), 0);

  const totalAllocatedVaar = plotSales.reduce((sum, p) => sum + (p.areaVaar || 0), 0);
  const remainingVaar = areaInVaar - totalAllocatedVaar;
  const isOverLimit = remainingVaar < 0;
  const utilizationPercent = areaInVaar > 0 ? (totalAllocatedVaar / areaInVaar) * 100 : 0;

  // Search Filter
  const filteredPlots = plotSales.filter(plot => {
    const q = searchQuery.toLowerCase();
    return (
      (plot.customerName?.toLowerCase().includes(q) || '') || 
      (plot.plotNumber?.toString().includes(q) || '') ||
      (plot.phoneNumber?.includes(q) || '')
    );
  });

  // --- HANDLERS ---
  const handleAddExpense = () => {
    setDevExpenses([...devExpenses, { id: crypto.randomUUID(), description: '', amount: '' }]);
  };

  const handleRemoveExpense = (id: string) => {
    setDevExpenses(devExpenses.filter(e => e.id !== id));
  };

  const handleExpenseChange = (id: string, field: 'description' | 'amount', value: any) => {
    setDevExpenses(devExpenses.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleAddPlot = () => {
    setPlotSales([...plotSales, {
      id: crypto.randomUUID(),
      plotNumber: '', 
      customerName: '',
      phoneNumber: '',
      bookingDate: new Date().toISOString().split('T')[0],
      dimLengthFt: '',
      dimWidthFt: '',
      areaVaar: 0,
      customLandRate: '' 
    }]);
    setSearchQuery('');
  };

  const handleRemovePlot = (id: string) => {
    const confirm = window.confirm("Delete this plot entry?");
    if(confirm) {
        setPlotSales(prev => prev.filter(p => p.id !== id));
    }
  };

  const handlePlotChange = (id: string, field: any, value: any) => {
    setPlotSales(prev => prev.map(plot => {
      if (plot.id !== id) return plot;

      const updatedPlot = { ...plot, [field]: value };

      if (field === 'dimLengthFt' || field === 'dimWidthFt') {
         const l = field === 'dimLengthFt' ? (Number(value) || 0) : (Number(plot.dimLengthFt) || 0);
         const w = field === 'dimWidthFt' ? (Number(value) || 0) : (Number(plot.dimWidthFt) || 0);
         
         const areaSqFt = l * w;
         const calculatedVaar = areaSqFt / 9;
         updatedPlot.areaVaar = parseFloat(calculatedVaar.toFixed(2));
      }

      return updatedPlot;
    }));
  };

  const handleSave = async () => {
    if (!projectId) return;

    const plottingData: PlottingState = {
      landRate,
      devRate,
      developmentExpenses: devExpenses,
      plotSales: plotSales,
      totalPlots: totalPlotsConfig, // Save grid config
      
      deductionPercent: existingPlottingData?.deductionPercent || 0,
      plotGroups: existingPlottingData?.plotGroups || [],
      plotsStatus: existingPlottingData?.plotsStatus || [],
      expectedSalesRate: existingPlottingData?.expectedSalesRate || '',
      salesRateUnit: existingPlottingData?.salesRateUnit || 'Vaar'
    };

    const updatedFullData: ProjectSavedState = {
        ...projectData,
        overheads: {
            ...projectData.overheads,
            developmentCost: totalDevExpenseList
        }
    };

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
            plotting_data: plottingData,
            full_data: updatedFullData
        }) 
        .eq('id', projectId);

      if (error) throw error;
      
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error("Save error", err);
      alert("Failed to save data");
    }
  };

  const labelClass = "block text-xs font-semibold text-slate-500 uppercase mb-1 ml-1";
  const inputClass = "w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-safety-500 focus:border-safety-500 block p-2.5 outline-none transition-all";

  return (
    <div className="min-h-screen pb-12 bg-slate-50 text-slate-800 animate-in fade-in duration-500 font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <button onClick={onBack} type="button" className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                <ArrowLeft size={20} />
             </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 text-slate-900">
                <IndianRupee className="text-safety-500 h-5 w-5" />
                Plotting Costs
              </h1>
              <div className="text-xs text-slate-400 font-mono">
                 Project: {projectData.identity.village}
              </div>
            </div>
          </div>
          <button onClick={handleSave} type="button" className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow hover:bg-slate-900 transition-all">
            <Save size={16} /> <span className="hidden md:inline">Save</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        
        {/* 1. Project Sales */}
        <div className="md:col-span-1">
          <Card title="Project Sales" icon={<IndianRupee size={20} />} className="h-full">
            <div className="space-y-5">
               <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase">Plotted Area</span>
                  <div className="text-right">
                     <span className="text-lg font-bold text-slate-900">{formatInputNumber(areaInVaar)}</span>
                     <span className="text-[10px] font-bold text-slate-400 block uppercase">Vaar</span>
                  </div>
               </div>

               <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                     <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Avg Land Rate</label>
                     <input 
                       type="text" 
                       readOnly
                       value={formatInputNumber(landRate)} 
                       className={`${inputClass} bg-slate-100 text-slate-600 font-bold`} 
                       placeholder="Calculated" 
                     />
                  </div>
                  <div className="col-span-7">
                     <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block text-right">Total Plot Sales</label>
                     <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-right font-mono font-bold text-slate-700 text-sm">
                        {formatCurrency(totalLandAmount)}
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                     <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Dev Rate</label>
                     <input 
                       type="text" 
                       inputMode="decimal"
                       value={formatInputNumber(devRate)} 
                       onChange={e => setDevRate(parseInputNumber(e.target.value))} 
                       className={inputClass} 
                       placeholder="₹ / Vaar" 
                     />
                  </div>
                  <div className="col-span-7">
                     <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block text-right">Total Dev Fees</label>
                     <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-right font-mono font-bold text-blue-600 text-sm">
                        {formatCurrency(totalDevAmount)}
                     </div>
                  </div>
               </div>

               <div className="mt-2 bg-slate-800 text-white p-4 rounded-xl shadow-lg shadow-slate-200">
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Sales Est.</span>
                     <span className="text-xl font-bold font-mono text-safety-500">{formatCurrency(grandTotalCost)}</span>
                  </div>
               </div>
            </div>
          </Card>
        </div>

       {/* 2. Development Expenses */}
        <div className="md:col-span-1">
           <Card title="Dev Expenses List" icon={<HardHat size={20} />} className="h-full">
              <div className="flex flex-col h-full">
                 <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                    {devExpenses.map((item, idx) => (
                       <div key={item.id} className="flex gap-2 items-center">
                          <input 
                            type="text" 
                            placeholder="Description" 
                            value={item.description} 
                            onChange={(e) => handleExpenseChange(item.id, 'description', e.target.value)} 
                            className={`${inputClass} flex-1 text-xs`} 
                          />
                          <input 
                            type="text"
                            inputMode="decimal" 
                            placeholder="Amount" 
                            value={formatInputNumber(item.amount)} 
                            onChange={(e) => handleExpenseChange(item.id, 'amount', parseInputNumber(e.target.value))} 
                            className={`${inputClass} w-24 text-right text-xs`} 
                          />
                          <button onClick={() => handleRemoveExpense(item.id)} className="text-slate-400 hover:text-red-500">
                             <Trash2 size={16} />
                          </button>
                       </div>
                    ))}
                 </div>
                 
                 <button onClick={handleAddExpense} className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-safety-600 border border-safety-200 rounded-lg py-2 hover:bg-safety-50 transition-colors">
                    <Plus size={14} /> Add Expense Item
                 </button>

                 <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Total List Sum</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalDevExpenseList)}</span>
                 </div>
              </div>
           </Card>
        </div>

        {/* 3. Plot Sales (Full Width) */}
        <div className="md:col-span-2">
           <Card title="Plot Sales" icon={<Users size={20} />}>
              <div className="space-y-4">
                 
                 {/* INVENTORY GRID (DYNAMIC) */}
                 <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={16} className="text-safety-500" />
                            <span className="text-xs font-bold text-slate-600 uppercase">Inventory Status Grid</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Plots:</span>
                            <input 
                                type="number" 
                                value={totalPlotsConfig} 
                                onChange={(e) => setTotalPlotsConfig(Number(e.target.value))} 
                                className="w-16 h-8 text-center text-sm font-bold border border-slate-300 rounded bg-white"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                        {Array.from({ length: totalPlotsConfig }).map((_, i) => {
                            const num = i + 1;
                            // Find matching plot by Manual Number (String comparison)
                            const matchedPlot = plotSales.find(p => String(p.plotNumber) === String(num));
                            
                            let statusColor = "bg-white border-2 border-slate-200 text-slate-300"; // Default Empty
                            if (matchedPlot) {
                                // Default to Booked (Orange)
                                statusColor = "bg-orange-100 border-2 border-orange-400 text-orange-700 font-bold";
                                
                                // Check if Fully Sold (Green)
                                const deal = matchedPlot.dealStructure;
                                if (deal && deal.schedule && deal.schedule.length > 0) {
                                    const isFullyPaid = deal.schedule.every((s: any) => s.isPaid);
                                    if (isFullyPaid) statusColor = "bg-emerald-100 border-2 border-emerald-500 text-emerald-700 font-bold";
                                }
                            }

                            return (
                                <div key={i} className={`${statusColor} rounded-md h-10 flex items-center justify-center text-xs transition-all shadow-sm`}>
                                    {num}
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex gap-4 mt-3 justify-end text-[10px] uppercase font-bold text-slate-400">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white border-2 border-slate-200 rounded"></div> Available</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border-2 border-orange-400 rounded"></div> Booked</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-100 border-2 border-emerald-500 rounded"></div> Sold</span>
                    </div>
                 </div>

                 {/* SEARCH BAR */}
                 <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400 group-focus-within:text-safety-500 transition-colors" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Search by Customer Name, Phone or Plot #..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-safety-500 focus:border-safety-500 outline-none transition-all"
                    />
                 </div>

                 <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-left border-collapse min-w-[900px]">
                       <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                          <tr>
                             <th className="px-3 py-3 w-16 text-center">Plot #</th>
                             <th className="px-3 py-3">Customer Info</th>
                             <th className="px-3 py-3 w-24 text-center">Date</th>
                             <th className="px-3 py-3 w-40 text-center">Dimensions (ft)</th>
                             <th className="px-3 py-3 w-24 text-right">Area (Vaar)</th>
                             <th className="px-3 py-3 w-32 text-right">Rate / Vaar</th>
                             <th className="px-3 py-3 w-36 text-right">Total Price</th>
                             <th className="px-3 py-3 w-10"></th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredPlots.length === 0 ? (
                             <tr>
                                <td colSpan={8} className="px-3 py-8 text-center text-slate-400 italic">
                                   {plotSales.length === 0 ? "No plots added yet." : "No matching plots found."}
                                </td>
                             </tr>
                          ) : (
                              filteredPlots.map((plot, idx) => (
                                 <tr key={plot.id} className="hover:bg-slate-50 transition-colors group">
                                    {/* Manual Plot Number Input */}
                                    <td className="px-3 py-2">
                                        <input 
                                          type="text" 
                                          placeholder="#"
                                          value={plot.plotNumber}
                                          onChange={(e) => handlePlotChange(plot.id, 'plotNumber', e.target.value)}
                                          className={`${inputClass} text-center font-bold`}
                                       />
                                    </td>
                                    
                                    <td className="px-3 py-2">
                                       <input 
                                          type="text" 
                                          placeholder="Customer Name" 
                                          value={plot.customerName}
                                          onChange={(e) => handlePlotChange(plot.id, 'customerName', e.target.value)}
                                          className={`${inputClass} mb-1`}
                                       />
                                       <input 
                                          type="text" 
                                          inputMode="tel"
                                          placeholder="Phone Number" 
                                          value={plot.phoneNumber}
                                          onChange={(e) => handlePlotChange(plot.id, 'phoneNumber', e.target.value)}
                                          className={`${inputClass} text-xs text-slate-500`}
                                       />
                                    </td>
                                    
                                    {/* FULL CLICKABLE Date Picker */}
                                    <td className="px-3 py-2">
                                       <div className="relative w-full h-9 group/date">
                                          <input 
                                            type="date" 
                                            required
                                            value={plot.bookingDate}
                                            onChange={(e) => handlePlotChange(plot.id, 'bookingDate', e.target.value)}
                                            onClick={(e) => {
                                                try { (e.target as HTMLInputElement).showPicker(); } catch(err) {}
                                            }}
                                            className="
                                                absolute inset-0 w-full h-full z-20 
                                                opacity-0 cursor-pointer
                                                [&::-webkit-calendar-picker-indicator]:absolute
                                                [&::-webkit-calendar-picker-indicator]:w-full
                                                [&::-webkit-calendar-picker-indicator]:h-full
                                                [&::-webkit-calendar-picker-indicator]:opacity-0
                                            "
                                          />
                                          <div className={`
                                              absolute inset-0 w-full h-full z-10 
                                              flex items-center justify-center gap-2 
                                              border rounded-lg transition-all pointer-events-none select-none
                                              ${plot.bookingDate 
                                                ? 'bg-white border-slate-300 text-slate-700 shadow-sm group-hover/date:border-safety-500' 
                                                : 'bg-slate-50 border-dashed border-slate-300 text-slate-400 group-hover/date:bg-white group-hover/date:border-safety-400'
                                              }
                                          `}>
                                             <Calendar size={14} className={plot.bookingDate ? 'text-safety-600' : ''} />
                                             <span className="text-xs font-bold pt-0.5">
                                           {plot.bookingDate 
                                             ? new Date(`${plot.bookingDate}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) 
                                             : 'Date'}
                                         </span>
                                          </div>
                                       </div>
                                    </td>

                                    <td className="px-3 py-2">
                                       <div className="flex items-center gap-2 justify-center">
                                          <input 
                                             type="number" 
                                             inputMode="decimal"
                                             placeholder="L" 
                                             value={plot.dimLengthFt}
                                             onChange={(e) => handlePlotChange(plot.id, 'dimLengthFt', e.target.value)}
                                             className={`${inputClass} w-14 text-center`}
                                          />
                                          <span className="text-slate-300">x</span>
                                          <input 
                                             type="number" 
                                             inputMode="decimal"
                                             placeholder="W" 
                                             value={plot.dimWidthFt}
                                             onChange={(e) => handlePlotChange(plot.id, 'dimWidthFt', e.target.value)}
                                             className={`${inputClass} w-14 text-center`}
                                          />
                                       </div>
                                    </td>
                                   <td className="px-3 py-2 text-right">
                                       <div className="font-bold text-slate-800 text-lg">{plot.areaVaar}</div>
                                       <div className="text-[9px] text-slate-400 uppercase font-bold">Vaar</div>
                                    </td>
                                    
                                    {/* Per-Plot Land Rate Input */}
                                    <td className="px-3 py-2">
                                        <input 
                                          type="text" 
                                          inputMode="decimal"
                                          placeholder="₹ Rate" 
                                          value={formatInputNumber(plot.customLandRate)}
                                          onChange={(e) => handlePlotChange(plot.id, 'customLandRate', parseInputNumber(e.target.value))}
                                          className={`${inputClass} text-right font-medium`}
                                       />
                                    </td>

                                    <td className="px-3 py-2 text-right">
                                       <div className="flex flex-col gap-1 text-xs">
                                          <div className="flex justify-between gap-2">
                                             <span className="text-slate-400">Land:</span>
                                             <span className="font-medium text-slate-700">
                                                {formatCurrency(plot.areaVaar * (Number(plot.customLandRate) || 0))}
                                             </span>
                                          </div>
                                          <div className="flex justify-between gap-2">
                                             <span className="text-slate-400">Dev:</span>
                                             <span className="font-medium text-blue-600">
                                                {formatCurrency(plot.areaVaar * (Number(devRate) || 0))}
                                             </span>
                                          </div>
                                          <div className="border-t border-slate-100 mt-1 pt-1 flex justify-between gap-2 font-bold text-safety-600">
                                             <span>Total:</span>
                                             <span>
                                                {formatCurrency(plot.areaVaar * ((Number(plot.customLandRate) || 0) + (Number(devRate) || 0)))}
                                             </span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                       <button onClick={() => handleRemovePlot(plot.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                          <Trash2 size={16} />
                                       </button>
                                    </td>
                                 </tr>
                              ))
                          )}
                       </tbody>
                    </table>
                 </div>
                 
                 <button onClick={handleAddPlot} className="w-full flex items-center justify-center gap-2 text-sm font-bold text-safety-600 border border-dashed border-safety-300 rounded-xl py-3 hover:bg-safety-50 transition-colors">
                    <Plus size={18} /> Add New Plot Sale
                 </button>
              </div>
           </Card>
        </div>

      </main>

      {/* Success Overlay */}
      {showSaveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 animate-in zoom-in duration-300">
            <CheckCircle size={32} strokeWidth={3} />
            <span className="font-bold text-lg">Saved Successfully</span>
          </div>
        </div>
      )}

    </div>
  );
};