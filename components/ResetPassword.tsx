import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Loader2, Hexagon, ArrowLeft } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

export const ResetPassword: React.FC<Props> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("Password must be at least 6 characters.");
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      alert(error.message);
    } else {
      alert("Password updated! You can now use the app.");
      onComplete(); // This tells App.tsx to show the Dashboard
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    window.location.hash = '';
    window.location.reload(); // Refresh to go back to clean Login page
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff] flex items-center justify-center border border-white/50 mb-4">
            <Hexagon className="text-safety-500" size={32} strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-800">Set New Password</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Security Recovery</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 tracking-widest">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />
              <input 
                type="password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" 
                placeholder="Minimum 6 characters" 
                autoFocus
                required 
              />
            </div>
          </div>

          <div className="space-y-3">
            <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : "UPDATE PASSWORD"}
            </button>
            
            <button type="button" onClick={handleCancel} className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors py-2">
              <ArrowLeft size={14} /> Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};