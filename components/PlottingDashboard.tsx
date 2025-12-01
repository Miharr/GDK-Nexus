

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Save, 
  LayoutGrid, 
  TrendingUp, 
  HardHat, 
  PieChart as PieChartIcon,
  Plus,
  Trash2,
  CheckCircle,
  Settings2
} from 'lucide-react';
import { Card } from './Card';
import { supabase } from '../supabaseClient';
import { 
  ProjectSavedState, 
  PlottingState, 
  PlottingDevExpense, 
  PlotStatus,
  UnitType,
  PlotGroup
} from '../types';
import { formatCurrency, formatInputNumber, parseInputNumber } from '../utils/formatters';

interface Props {
  onBack: () => void;
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

export const PlottingDashboard: React.FC<Props> = ({ onBack, projectData, existingPlottingData, projectId }) => {
  
  // --- STATE ---
  const [deductionPercent, setDeductionPercent] = useState<number | ''>(40);
  const [devExpenses, setDevExpenses] = useState<PlottingDevExpense[]>([
    { id: '1', description: 'Compound Wall', amount: '' },
    { id: '2', description: 'Internal Roads', amount: '' },
    { id: '3', description: 'Entry Gate', amount: '' },
  ]);
  
  // New Inventory State
  const [plotGroups, setPlotGroups] = useState<PlotGroup[]>([
    { id: '1', count: 10, area: 100, unit: 'SqMeter' }
  ]);
  
  const [plotsStatus, setPlotsStatus] = useState<PlotStatus[]>([]);
  const [expectedSalesRate, setExpectedSalesRate] = useState<number | ''>('');
  const [salesRateUnit, setSalesRateUnit] = useState<UnitType>('SqMeter');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (existingPlottingData) {
      setDeductionPercent(existingPlottingData.deductionPercent);
      setDevExpenses(existingPlottingData.developmentExpenses || []);
      setPlotsStatus(existingPlottingData.plotsStatus || []);
      setExpectedSalesRate(existingPlottingData.expectedSalesRate);
      setSalesRateUnit(existingPlottingData.salesRateUnit || 'SqMeter');
      
      // Load groups if exist, else default
      if (existingPlottingData.plotGroups && existingPlottingData.plotGroups.length > 0) {
        setPlotGroups(existingPlottingData.plotGroups);
      } else if (existingPlottingData.totalPlots) {
        // Fallback for old data: Create one group with the total plots
        setPlotGroups([{ 
            id: 'legacy', 
            count: existingPlottingData.totalPlots, 
            area: 100, // Placeholder area
            unit: 'SqMeter' 
        }]);
      }
    }
  }, [existingPlottingData]);

  // Sync Plots Status Array size with Total Calculated Plots
  const totalPlotsCalculated = useMemo(() => {
    return plotGroups.reduce((sum, g) => sum + (g.count === '' ? 0 : g.count), 0);
  }, [plotGroups]);

  useEffect(() => {
    const count = totalPlotsCalculated;
    setPlotsStatus(prev => {
      if (prev.length === count) return prev;
      if (prev.length > count) return prev.slice(0, count);
      // Add new plots as available
      return [...prev, ...Array(count - prev.length).fill('available')];
    });
  }, [totalPlotsCalculated]);

  // --- CALCULATIONS ---

  // 1. Reconstruct Base Land Metrics from Module 1 Data
  const baseMetrics = useMemo(() => {
    const { measurements, financials, overheads, costSheetBasis } = projectData;
    
    // Area
    const inputVal = measurements.areaInput === '' ? 0 : Number(measurements.areaInput);
    let valInVigha = 0;
    if (measurements.inputUnit === 'Vigha') valInVigha = inputVal;
    else valInVigha = inputVal / CONVERSION_RATES[measurements.inputUnit];
    
    const totalSqMt = valInVigha * CONVERSION_RATES.SqMeter;
    
    // Jantri
    const jantriRate = measurements.jantriRate === '' ? 0 : Number(measurements.jantriRate);
    const totalJantriValue = totalSqMt * jantriRate;
    const fpJantriValue = (totalSqMt * 0.60) * jantriRate;

    // Financials
    const pricePerVigha = financials.pricePerVigha === '' ? 0 : Number(financials.pricePerVigha);
    const dealPrice = pricePerVigha * valInVigha;

    // Expenses
    const stampPercent = overheads.stampDutyPercent === '' ? 0 : Number(overheads.stampDutyPercent);
    
    // Stamp Duty
    let stampDuty = 0;
    if (costSheetBasis === '60') {
       stampDuty = fpJantriValue * (stampPercent / 100);
    } else {
       stampDuty = totalJantriValue * (stampPercent / 100);
    }
    
    const additionalExpExcludingDev = 
      (overheads.architectFees === '' ? 0 : Number(overheads.architectFees)) +
      (overheads.planPassFees === '' ? 0 : Number(overheads.planPassFees)) +
      (overheads.naExpense === '' ? 0 : Number(overheads.naExpense)) +
      (overheads.naPremium === '' ? 0 : Number(overheads.naPremium));

    // For display here, we only use acquisition costs. The Dev cost is added later in "Total Project Cost"
    const landedCostWithoutDev = dealPrice + stampDuty + additionalExpExcludingDev;

    return { 
        totalSqMt, 
        landedCostWithoutDev, 
        valInVigha, 
        dealPrice, 
        stampDuty, 
        additionalExpExcludingDev, 
        jantriRate,
        costSheetBasis 
    };
  }, [projectData]);

  // 2. Plotting Calculations
  const dedPct = deductionPercent === '' ? 0 : deductionPercent;
  const netSaleableSqMt = baseMetrics.totalSqMt * (1 - dedPct / 100);
  
  const totalDevExpense = devExpenses.reduce((sum, item) => sum + (item.amount === '' ? 0 : item.amount), 0);
  
  // Total Project Cost = (Acquisition + Stamp + Other Overheads) + (Plotting Dev Expenses)
  const totalProjectCost = baseMetrics.landedCostWithoutDev + totalDevExpense;

  // Unit Costs
  // Raw Land Cost = (Acquisition Only) / Total Area
  const rawLandCostPerSqMt = baseMetrics.totalSqMt > 0 ? baseMetrics.landedCostWithoutDev / baseMetrics.totalSqMt : 0;
  
  // Loaded Land Cost = (Acquisition Only) / Saleable Area
  const loadedLandCostPerSqMt = netSaleableSqMt > 0 ? baseMetrics.landedCostWithoutDev / netSaleableSqMt : 0;
  
  // Finished Cost = (Total Project Cost) / Saleable Area
  const finishedCostPerSqMt = netSaleableSqMt > 0 ? totalProjectCost / netSaleableSqMt : 0;

  // Conversion for Display
  const getRateInUnit = (ratePerSqMt: number, unit: UnitType) => {
    return ratePerSqMt * (CONVERSION_RATES.SqMeter / CONVERSION_RATES[unit]);
  };

  const finishedCostDisplay = getRateInUnit(finishedCostPerSqMt, salesRateUnit);

  // Profit
  const saleRate = expectedSalesRate === '' ? 0 : expectedSalesRate;
  const netSaleableInVigha = baseMetrics.valInVigha * (1 - dedPct/100);
  const netSaleableInSalesUnit = netSaleableInVigha * CONVERSION_RATES[salesRateUnit];
  
  const projectedRevenue = netSaleableInSalesUnit * saleRate;
  const netProfit = projectedRevenue - totalProjectCost;
  const roi = totalProjectCost > 0 ? (netProfit / totalProjectCost) * 100 : 0;

  // --- FLATTEN PLOTS FOR GRID RENDERING ---
  const flattenedPlots = useMemo(() => {
    const plots: { index: number, areaSqMt: number, displayArea: number, unit: UnitType }[] = [];
    let currentIndex = 0;

    plotGroups.forEach(group => {
      const count = group.count === '' ? 0 : group.count;
      const area = group.area === '' ? 0 : group.area;
      // Convert to SqMt for uniform sizing logic
      const areaInSqMt = area * (CONVERSION_RATES.SqMeter / CONVERSION_RATES[group.unit]);
      
      for (let i = 0; i < count; i++) {
        plots.push({
          index: currentIndex,
          areaSqMt: areaInSqMt,
          displayArea: area,
          unit: group.unit
        });
        currentIndex++;
      }
    });
    return plots;
  }, [plotGroups]);

  // Calculate Grid Sizing Metrics
  const { minArea, maxArea } = useMemo(() => {
      if (flattenedPlots.length === 0) return { minArea: 100, maxArea: 100 };
      const areas = flattenedPlots.map(p => p.areaSqMt);
      return { 
          minArea: Math.min(...areas), 
          maxArea: Math.max(...areas) 
      };
  }, [flattenedPlots]);


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

  // Group Handlers
  const handleAddGroup = () => {
    setPlotGroups([...plotGroups, { id: crypto.randomUUID(), count: 0, area: 0, unit: 'SqMeter' }]);
  };

  const handleRemoveGroup = (id: string) => {
    setPlotGroups(plotGroups.filter(g => g.id !== id));
  };

  const handleGroupChange = (id: string, field: keyof PlotGroup, value: any) => {
    setPlotGroups(plotGroups.map(g => g.id === id ? { ...g, [field]: value } : g));
  };


  const cyclePlotStatus = (index: number) => {
    const statuses: PlotStatus[] = ['available', 'booked', 'sold'];
    const current = plotsStatus[index] || 'available';
    const next = statuses[(statuses.indexOf(current) + 1) % statuses.length];
    
    const newStatus = [...plotsStatus];
    newStatus[index] = next;
    setPlotsStatus(newStatus);
  };

  const handleSave = async () => {
    if (!projectId) return;

    // 1. Calculate the new total for Development Cost from the list
    const calculatedDevCost = devExpenses.reduce((sum, item) => sum + (item.amount === '' ? 0 : item.amount), 0);

    // 2. Prepare Plotting Data
    const plottingData: PlottingState = {
      deductionPercent,
      developmentExpenses: devExpenses,
      totalPlots: totalPlotsCalculated,
      plotGroups, // Save the groups configuration
      plotsStatus,
      expectedSalesRate,
      salesRateUnit
    };

    // 3. Update Module 1 Data (full_data)
    const updatedFullData: ProjectSavedState = {
       ...projectData,
       overheads: {
          ...projectData.overheads,
          developmentCost: calculatedDevCost 
       }
    };

    // 4. Recalculate Total
    const newTotalLandCost = baseMetrics.landedCostWithoutDev + calculatedDevCost;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
            plotting_data: plottingData,
            full_data: updatedFullData, 
            total_land_cost: newTotalLandCost
        }) 
        .eq('id', projectId);

      if (error) throw error;
      
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error("Save error", err);
      alert("Failed to save plotting data");
    }
  };

  // --- RENDER HELPERS ---
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
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 text-slate-900">
                <LayoutGrid className="text-safety-500 h-5 w-5" />
                Plotting & Inventory
              </h1>
              <div className="text-xs text-slate-400 font-mono">
                 Project: {projectData.identity.village} - {projectData.identity.fpNumber}
              </div>
            </div>
          </div>
          <button onClick={handleSave} type="button" className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow hover:bg-slate-900 transition-all">
            <Save size={16} /> <span className="hidden md:inline">Save & Sync</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">
        
        {/* 1. Base Info */}
        <div className="md:col-span-4">
          <Card title="Source Land" icon={<PieChartIcon size={20} />} className="h-full">
            <div className="flex flex-col gap-4">
               <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 relative">
                  <div className="text-xs text-slate-400 font-bold uppercase mb-1">Base Land Cost</div>
                  <div className="text-xl font-bold text-slate-900">{formatCurrency(baseMetrics.landedCostWithoutDev)}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Excludes Development</div>
                  {baseMetrics.costSheetBasis === '60' && (
                     <div className="absolute top-4 right-4 text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded">60% Basis</div>
                  )}
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-400 font-bold uppercase mb-1">Total Area</div>
                      <div className="text-lg font-bold text-slate-800">{baseMetrics.totalSqMt.toFixed(0)}</div>
                      <div className="text-[10px] text-slate-400">Sq. Meters</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div className="text-xs text-slate-400 font-bold uppercase mb-1">In Vigha</div>
                      <div className="text-lg font-bold text-slate-800">{baseMetrics.valInVigha.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400">Vigha</div>
                  </div>
               </div>
            </div>
          </Card>
        </div>

        {/* 2. Kapat Calculator */}
        <div className="md:col-span-4">
           <Card title="Deductions (Kapat)" icon={<PieChartIcon size={20} />} className="h-full">
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className={labelClass}>Deduction % (Road/Common)</label>
                       <span className="text-safety-600 font-bold">{deductionPercent}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="60" 
                      value={deductionPercent} 
                      onChange={e => setDeductionPercent(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-safety-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                       <span>0%</span><span>20%</span><span>40%</span><span>60%</span>
                    </div>
                 </div>

                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="text-xs text-blue-400 font-bold uppercase mb-1">Net Saleable Area</div>
                    <div className="text-2xl font-bold text-blue-700">{netSaleableSqMt.toFixed(0)} <span className="text-sm font-medium">SqMt</span></div>
                    <div className="text-xs text-blue-500 mt-1">Efficiency: {deductionPercent !== '' ? 100 - deductionPercent : 100}%</div>
                 </div>
              </div>
           </Card>
        </div>

        {/* 3. Dev Expenses */}
        <div className="md:col-span-4">
           <Card title="Development Costs" icon={<HardHat size={20} />} className="h-full">
              <div className="flex flex-col h-full">
                 <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
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
                            value={item.amount}
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
                    <Plus size={14} /> Add Expense
                 </button>

                 <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Total Dev Cost</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalDevExpense)}</span>
                 </div>
              </div>
           </Card>
        </div>

        {/* 4. Unit Costing */}
        <div className="md:col-span-12">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card A: Raw */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Raw Land Cost</div>
                 <div className="text-2xl font-bold text-slate-700">{formatCurrency(getRateInUnit(rawLandCostPerSqMt, salesRateUnit))}</div>
                 <div className="text-[10px] text-slate-400 mt-1">Per {salesRateUnit} on Total Area</div>
              </div>

              {/* Card B: Loaded */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-1 h-full bg-safety-300"></div>
                 <div className="text-xs font-bold text-safety-500 uppercase tracking-wider mb-2">Loaded Land Cost</div>
                 <div className="text-2xl font-bold text-slate-800">{formatCurrency(getRateInUnit(loadedLandCostPerSqMt, salesRateUnit))}</div>
                 <div className="text-[10px] text-slate-400 mt-1">Base Cost / Saleable Area</div>
                 <div className="absolute top-4 right-4 text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                    +{deductionPercent}% Load
                 </div>
              </div>

              {/* Card C: Finished */}
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                 <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Finished Cost (Break Even)</div>
                 <div className="text-3xl font-bold text-white">{formatCurrency(finishedCostDisplay)}</div>
                 <div className="text-[10px] text-slate-400 mt-1">Includes Land + Development</div>
              </div>
           </div>
        </div>

        {/* 5. Profit Projector */}
        <div className="md:col-span-4">
           <Card title="Profit Projector" icon={<TrendingUp size={20} />} className="h-full">
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-1">
                       <label className={labelClass}>Expected Sales Rate</label>
                       <select 
                          value={salesRateUnit} 
                          onChange={(e) => setSalesRateUnit(e.target.value as UnitType)}
                          className="text-[10px] font-bold bg-slate-100 border-none rounded px-2 py-0.5 outline-none"
                       >
                          <option value="SqMeter">Per SqMt</option>
                          <option value="Vaar">Per Vaar</option>
                          <option value="Vigha">Per Vigha</option>
                       </select>
                    </div>
                    <div className="relative">
                       <input 
                         type="text"
                         inputMode="decimal"
                         value={formatInputNumber(expectedSalesRate)}
                         onChange={(e) => setExpectedSalesRate(parseInputNumber(e.target.value))}
                         className={`${inputClass} pl-8 text-lg font-bold text-emerald-600`}
                         placeholder="0.00"
                       />
                       <span className="absolute left-3 top-3 text-slate-400 font-bold">₹</span>
                    </div>
                 </div>

                 {/* REFACTORED: Stacked Layout for Profit/ROI */}
                 <div className="flex flex-col gap-5 pt-4 border-t border-slate-100 mt-2">
                    <div>
                       <div className="text-xs text-slate-400 font-bold uppercase mb-1">Net Profit</div>
                       <div className={`text-2xl font-bold tracking-tight ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'} break-words leading-tight`}>
                          {formatCurrency(netProfit)}
                       </div>
                    </div>
                    <div>
                       <div className="text-xs text-slate-400 font-bold uppercase mb-1">Return on Investment (ROI)</div>
                       <div className={`text-xl font-bold ${roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {roi.toFixed(2)}%
                       </div>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 leading-relaxed mt-2">
                    At a rate of <strong>{formatCurrency(saleRate)}</strong> per {salesRateUnit}, the project yields a revenue of {formatCurrency(projectedRevenue)}.
                 </div>
              </div>
           </Card>
        </div>

        {/* 6. Inventory Grid & Configuration */}
        <div className="md:col-span-8">
           <Card title="Inventory Management" icon={<LayoutGrid size={20} />} className="h-full">
              <div className="flex flex-col md:flex-row gap-6 h-full">
                 
                 {/* Left: Configuration List */}
                 <div className="w-full md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                    <div className="flex items-center gap-2 mb-3 text-slate-600">
                        <Settings2 size={16} />
                        <h4 className="text-xs font-bold uppercase">Plot Configuration</h4>
                    </div>
                    
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[250px] custom-scrollbar">
                        {plotGroups.map((group) => (
                           <div key={group.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                               <div className="flex justify-between items-center mb-2">
                                   <span className="font-bold text-slate-500">Group</span>
                                   <button onClick={() => handleRemoveGroup(group.id)} className="text-slate-400 hover:text-red-500">
                                       <Trash2 size={14} />
                                   </button>
                               </div>
                               <div className="grid grid-cols-2 gap-2 mb-2">
                                  <div>
    <label className="text-[10px] text-slate-400 uppercase">Count</label>
    <input 
        type="number" 
        inputMode="numeric" /* integers typically for count */
        min="0"
        value={group.count}
        /* Logic: If empty, set 0. Otherwise parse Int. */
        onChange={(e) => handleGroupChange(group.id, 'count', e.target.value === '' ? 0 : parseInt(e.target.value))}
        onFocus={(e) => e.target.select()} /* UX Bonus: Selects all text on click so user can type over 0 immediately */
        className="w-full p-1 text-xs border rounded outline-none focus:border-safety-500 bg-white text-slate-700"
    />
</div>
                                  <div>
                                      <label className="text-[10px] text-slate-400 uppercase">Area</label>
    <input 
        type="number"
        inputMode="decimal" /* Triggers decimal keyboard on mobile */
        step="any"          /* Allows decimals (prevents 'integer only' errors) */
        min="0"
        value={group.area}
        /* Logic: If empty, set 0. Otherwise parse Float. */
        onChange={(e) => handleGroupChange(group.id, 'area', e.target.value === '' ? 0 : parseFloat(e.target.value))}
        onFocus={(e) => e.target.select()} 
        className="w-full p-1 text-xs border rounded outline-none focus:border-safety-500 bg-white text-slate-700"
    />
                                  </div>
                               </div>
                               <select 
                                 value={group.unit}
                                 onChange={(e) => handleGroupChange(group.id, 'unit', e.target.value)}
                                 className="w-full text-[10px] p-1 border rounded bg-white outline-none"
                               >
                                  <option value="SqMeter">Sq Meters</option>
                                  <option value="Vaar">Vaar</option>
                                  <option value="Vigha">Vigha</option>
                               </select>
                           </div>
                        ))}
                    </div>

                    <button onClick={handleAddGroup} className="mt-3 w-full py-2 text-xs font-bold text-safety-600 border border-dashed border-safety-300 rounded hover:bg-safety-50 transition-colors flex items-center justify-center gap-1">
                        <Plus size={14} /> Add Group
                    </button>
                 </div>

                 {/* Right: Visualization Grid */}
                 <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-end mb-4">
                       <div>
                          <label className={labelClass}>Total Plots</label>
                          <div className="text-2xl font-bold text-slate-800">{totalPlotsCalculated}</div>
                       </div>
                       <div className="flex gap-3 text-[10px] font-bold pb-1">
                          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-slate-100 border border-slate-300 rounded"></div> Avail</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded"></div> Booked</div>
                          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded"></div> Sold</div>
                       </div>
                    </div>

                    <div className="bg-slate-100 p-4 rounded-xl flex-1 min-h-[300px] overflow-y-auto custom-scrollbar border border-slate-200 inner-shadow">
                       {/* Flex Wrap Container for Variable Sizes */}
                       <div className="flex flex-wrap gap-3 content-start">
                          {flattenedPlots.map((plot) => {
                             const status = plotsStatus[plot.index] || 'available';
                             
                             // Style Logic
                             let bgClass = "bg-white hover:bg-slate-50 border-slate-300 text-slate-600";
                             if (status === 'booked') bgClass = "bg-emerald-500 border-emerald-600 text-white shadow-emerald-200";
                             if (status === 'sold') bgClass = "bg-red-500 border-red-600 text-white shadow-red-200";

                             // Dynamic Size Logic
                             // Base size ~60px. Max size ~100px.
                             // Ratio: (ThisArea - MinArea) / (MaxArea - MinArea)
                             const minSize = 60;
                             const maxSize = 110;
                             let sizePx = minSize;
                             
                             if (maxArea > minArea) {
                                 const ratio = (plot.areaSqMt - minArea) / (maxArea - minArea);
                                 sizePx = minSize + (ratio * (maxSize - minSize));
                             }

                             return (
                                <button
                                   key={plot.index}
                                   onClick={() => cyclePlotStatus(plot.index)}
                                   style={{ width: `${sizePx}px`, height: `${sizePx}px` }}
                                   className={`rounded-xl border shadow-sm flex flex-col items-center justify-center transition-all active:scale-95 ${bgClass} relative overflow-hidden`}
                                   title={`Plot ${plot.index + 1}: ${plot.displayArea} ${plot.unit}`}
                                >
                                   <span className="font-bold text-sm z-10">{plot.index + 1}</span>
                                   <span className="text-[9px] opacity-70 z-10 leading-none mt-0.5">{plot.displayArea}</span>
                                   {/* Subtle Pattern for larger plots */}
                                   {sizePx > 80 && <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black to-transparent" />}
                                </button>
                             );
                          })}
                       </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between text-xs font-bold text-slate-400">
                       <span className="text-emerald-600">Booked: {plotsStatus.filter(s => s === 'booked').length}</span>
                       <span className="text-red-500">Sold: {plotsStatus.filter(s => s === 'sold').length}</span>
                    </div>
                 </div>
              </div>
           </Card>
        </div>

      </main>

      {/* Success Overlay */}
      {showSaveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2 animate-in zoom-in duration-300">
            <CheckCircle size={32} strokeWidth={3} />
            <span className="font-bold text-lg">Inventory & Costs Updated</span>
          </div>
        </div>
      )}

    </div>
  );
};