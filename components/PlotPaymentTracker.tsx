import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Circle, 
  IndianRupee 
} from 'lucide-react';
import { PlotSaleItem, PlotPaymentEntry } from '../types';
import { formatCurrency, formatInputNumber, parseInputNumber, formatDate } from '../utils/formatters';

interface Props {
  plot: PlotSaleItem;
  onClose: () => void;
  onSave: (updatedPlot: PlotSaleItem) => void;
}

export const PlotPaymentTracker: React.FC<Props> = ({ plot, onClose, onSave }) => {
  const [schedule, setSchedule] = useState<PlotPaymentEntry[]>(plot.paymentSchedule || []);
  const [salePrice, setSalePrice] = useState<number>(plot.salePrice || 0);

  // Auto-calculate Total Received
  const totalReceived = schedule.reduce((sum, item) => sum + (item.isPaid ? (Number(item.amount) || 0) : 0), 0);
  const totalScheduled = schedule.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remaining = salePrice - totalReceived;

  const handleAddPayment = () => {
    setSchedule([...schedule, {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: `Installment ${schedule.length + 1}`,
      isPaid: false
    }]);
  };

  const handleUpdatePayment = (id: string, field: keyof PlotPaymentEntry, val: any) => {
    setSchedule(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const handleDeletePayment = (id: string) => {
    setSchedule(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveExit = () => {
    onSave({
      ...plot,
      salePrice,
      paymentSchedule: schedule,
      totalReceived
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Plot #{plot.plotNumber} - {plot.customerName}</h3>
            <p className="text-xs text-slate-500">{plot.areaVaar} Vaar</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 shadow-sm"><X size={20}/></button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* 1. Deal Summary */}
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-6">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-emerald-700 uppercase">Final Sale Price</span>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={formatInputNumber(salePrice)} 
                  onChange={(e) => setSalePrice(parseInputNumber(e.target.value) as number)}
                  className="bg-white border border-emerald-200 text-emerald-800 text-right font-bold rounded px-2 py-1 w-32 outline-none focus:ring-2 focus:ring-emerald-500"
                />
             </div>
             <div className="flex justify-between text-xs text-emerald-600 mt-2 pt-2 border-t border-emerald-200/50">
                <span>Received: {formatCurrency(totalReceived)}</span>
                <span className="font-bold">Due: {formatCurrency(remaining)}</span>
             </div>
             {/* Progress Bar */}
             <div className="w-full bg-emerald-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${salePrice > 0 ? (totalReceived/salePrice)*100 : 0}%` }}></div>
             </div>
          </div>

          {/* 2. Schedule */}
          <div className="space-y-3">
             <div className="flex justify-between items-center">
               <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Calendar size={16}/> Payment Schedule</h4>
               <button onClick={handleAddPayment} className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-bold text-slate-600 transition-colors">
                 <Plus size={14}/> Add
               </button>
             </div>

             <div className="space-y-3">
               {schedule.map((item) => (
                 <div key={item.id} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${item.isPaid ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                    
                    {/* Top Row: Checkbox + Description + Amount */}
                    <div className="flex items-center gap-3">
                       <button 
                         onClick={() => handleUpdatePayment(item.id, 'isPaid', !item.isPaid)}
                         className={`transition-colors ${item.isPaid ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                       >
                          {item.isPaid ? <CheckCircle size={22} className="fill-emerald-100" /> : <Circle size={22} />}
                       </button>
                       
                       <input 
                         type="text" 
                         value={item.description}
                         onChange={(e) => handleUpdatePayment(item.id, 'description', e.target.value)}
                         className="flex-1 text-sm font-medium text-slate-700 outline-none bg-transparent"
                         placeholder="Description"
                       />

                       <input 
                         type="text"
                         inputMode="decimal"
                         value={formatInputNumber(item.amount)}
                         onChange={(e) => handleUpdatePayment(item.id, 'amount', parseInputNumber(e.target.value))}
                         className={`w-24 text-right font-bold outline-none bg-transparent ${item.isPaid ? 'text-emerald-600' : 'text-slate-800'}`}
                         placeholder="₹"
                       />
                    </div>

                    {/* Bottom Row: Date + Delete */}
                    <div className="flex justify-between items-center pl-9">
                       <input 
                         type="date"
                         value={item.date}
                         onChange={(e) => handleUpdatePayment(item.id, 'date', e.target.value)}
                         className="text-xs text-slate-400 bg-transparent outline-none font-medium"
                       />
                       <button onClick={() => handleDeletePayment(item.id)} className="text-slate-300 hover:text-red-400">
                          <Trash2 size={14} />
                       </button>
                    </div>
                 </div>
               ))}
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
           <button onClick={handleSaveExit} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-95 transition-transform">
              Save Changes
           </button>
        </div>

      </div>
    </div>
  );
};