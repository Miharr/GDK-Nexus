import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2, Hexagon } from 'lucide-react';

interface AuthProps {
  forceRecovery?: boolean;
  onPasswordUpdated?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ forceRecovery, onPasswordUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(forceRecovery || false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // 1. Sync with the instruction from App.tsx
    if (forceRecovery) {
      setIsUpdatingPassword(true);
    }

    // 2. Catch the "Expired Link" error immediately
    if (window.location.hash.includes('error=access_denied')) {
      alert("This reset link has expired or has already been used. Please request a new one.");
      window.location.hash = ''; // Clear the error from the URL
      setIsResetMode(true); // Put them back on the "Send Link" screen
    }

    // 3. Fallback: If App.tsx missed it, check the URL for recovery type
    if (window.location.hash.includes('type=recovery')) {
      setIsUpdatingPassword(true);
    }
  }, [forceRecovery]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) alert(error.message);
    else if (isSignUp) alert("Check your email for a confirmation link!");
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return alert("Please enter your email first.");
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    
    if (error) alert(error.message);
    else alert("Password reset link sent! Check your email.");
    
    setLoading(false);
    setIsResetMode(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("Password must be at least 6 characters.");
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      alert(error.message);
    } else {
      alert("Password updated successfully!");
      setIsUpdatingPassword(false);
      // Clean up URL and tell App.tsx to unlock the dashboard
      window.location.hash = ''; 
      if (onPasswordUpdated) onPasswordUpdated(); 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff] flex items-center justify-center border border-white/50 mb-4">
            <Hexagon className="text-safety-500" size={32} strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-800 text-center leading-tight">
             GDK NEXUS <span className="text-safety-500 font-mono text-xl align-top">2442</span>
          </h1>
        </div>

        {/* Form Logic Switcher */}
        {isUpdatingPassword ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
               <p className="text-[10px] font-black text-blue-600 uppercase text-center tracking-widest leading-relaxed">
                 Account Recovery Mode:<br/>Set your new password below
               </p>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 tracking-widest">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" 
                  placeholder="Min. 6 characters" 
                  required 
                />
              </div>
            </div>
            <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : "UPDATE & SIGN IN"}
            </button>
          </form>
        ) : (
          <form onSubmit={isResetMode ? handleResetPassword : handleAuth} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 mb-1 tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" placeholder="name@email.com" required />
              </div>
            </div>

            {!isResetMode && (
              <div>
                <div className="flex justify-between items-center ml-1 mb-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                  <button type="button" onClick={() => setIsResetMode(true)} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-tighter transition-colors">Forgot?</button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm" placeholder="••••••••" required={!isResetMode} />
                </div>
              </div>
            )}

            <button disabled={loading} type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : (isResetMode ? "SEND RESET LINK" : isSignUp ? "CREATE ACCOUNT" : "SIGN IN")}
            </button>
            
            {isResetMode && (
              <button type="button" onClick={() => setIsResetMode(false)} className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest mt-2 transition-colors">Back to Sign In</button>
            )}
          </form>
        )}

        {/* Bottom Toggle */}
        {!isUpdatingPassword && (
          <button onClick={() => setIsSignUp(!isSignUp)} className="w-full mt-8 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-tighter">
            {isSignUp ? "Already have an account? Sign In" : "New user? Create an account"}
          </button>
        )}
      </div>
    </div>
  );
};