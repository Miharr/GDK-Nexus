import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2, Hexagon, User, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';

interface AuthProps {
  forceRecovery?: boolean;
  onPasswordUpdated?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ forceRecovery, onPasswordUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(forceRecovery || false);
  const [showPassword, setShowPassword] = useState(false);
const [status, setStatus] = useState<{ message: string; type: 'error' | 'success' } | null>(null);  
  // Form States
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 1. Password Strength Logic
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length > 5) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0 to 4
  };

  const strength = getPasswordStrength(isUpdatingPassword ? newPassword : password);
  const strengthColors = ['bg-slate-200', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];

  useEffect(() => {
    if (forceRecovery) setIsUpdatingPassword(true);
    if (window.location.hash.includes('error=access_denied')) {
      setErrorMessage("Link expired. Please request a new one.");
      window.location.hash = '';
      setIsResetMode(true);
    }
  }, [forceRecovery]);

  // 2. Auth Logic
  const handleAuth = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setStatus(null);

  if (isSignUp) {
    if (password !== confirmPassword) {
      setStatus({ message: "Passwords do not match", type: 'error' });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: { data: { display_name: username } }
    });

    if (error) {
      setStatus({ message: error.message, type: 'error' });
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      // 🛡️ THE TRICK: If identities is empty, the email is already taken
      setStatus({ 
        message: "This email is already in use. Please sign in instead.", 
        type: 'error' 
      });
    } else {
      // New user successfully triggered the confirmation email
      setStatus({ 
        message: "Account created! Please check your email to confirm your account.", 
        type: 'success' 
      });
    }
  } else {
    // Sign In logic
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus({ message: "Invalid login credentials. Ensure your email/password are entered correct", type: 'error' });
    }
  }
  setLoading(false);
};

  const handleResetPassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setStatus(null); // Clear previous status

  const { error } = await supabase.auth.resetPasswordForEmail(email, { 
    redirectTo: window.location.origin 
  });

  if (error) {
    setStatus({ message: error.message, type: 'error' });
  } else {
    // Show a green success message
    setStatus({ message: "Reset link sent! Please check your inbox.", type: 'success' });
  }
  
  setLoading(false);
};

 const handleUpdatePassword = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setStatus(null);

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    setStatus({ message: error.message, type: 'error' });
  } else {
    // Show a green success message
    setStatus({ message: "Password updated successfully! Redirecting...", type: 'success' });
    
    if (onPasswordUpdated) {
      setTimeout(() => {
        onPasswordUpdated();
      }, 1500);
    }
  }
  
  setLoading(false);
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 transition-all duration-500">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] shadow-[6px_6px_12px_#cbd5e1] flex items-center justify-center mb-4">
            <Hexagon className="text-safety-500" size={32} strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-800 text-center">
             GDK NEXUS <span className="text-safety-500 font-mono text-xl align-top">2442</span>
          </h1>
        </div>

        <form onSubmit={isUpdatingPassword ? handleUpdatePassword : isResetMode ? handleResetPassword : handleAuth} className="space-y-4">
          
          {/* Email Field (Always visible except password update) */}
          {!isUpdatingPassword && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-sm" placeholder="name@email.com" required />
              </div>
            </div>
          )}

          {/* Username Field (Only on Sign Up) */}
          {isSignUp && !isResetMode && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-slate-300" size={18} />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-sm" placeholder="Username" required />
              </div>
            </div>
          )}

          {/* Password Field */}
          {!isResetMode && (
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {isUpdatingPassword ? "New Password" : "Password"}
                </label>
                {!isSignUp && !isUpdatingPassword && (
                  <button type="button" onClick={() => setIsResetMode(true)} className="text-[10px] font-bold text-safety-500 hover:underline uppercase">Forgot?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={isUpdatingPassword ? newPassword : password} 
                  onChange={(e) => isUpdatingPassword ? setNewPassword(e.target.value) : setPassword(e.target.value)} 
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-sm" 
                  placeholder="••••••••" 
                  required 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Bar */}
              {(isSignUp || isUpdatingPassword) && (password.length > 0 || newPassword.length > 0) && (
                <div className="mt-2 px-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black uppercase text-slate-400">Strength</span>
                    <span className={`text-[9px] font-black uppercase ${strength > 2 ? 'text-green-500' : 'text-orange-400'}`}>{strengthLabels[strength]}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${strengthColors[strength]}`} style={{ width: `${(strength / 4) * 100}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Confirm Password (Only on Sign Up) */}
          {isSignUp && !isResetMode && (
            <div className="space-y-1 animate-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Re-enter Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-300" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border rounded-2xl outline-none transition-all font-bold text-sm ${confirmPassword && (password === confirmPassword ? 'border-green-200' : 'border-red-200')}`} 
                  placeholder="••••••••" 
                  required 
                />
              </div>
            </div>
          )}

          {/* Status Message Display (Handles both Success and Error) */}
{status && (
  <div className={`p-3 border rounded-xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${
    status.type === 'success' 
      ? 'bg-green-50 border-green-100' 
      : 'bg-red-50 border-red-100'
  }`}>
    {status.type === 'success' ? (
      <CheckCircle2 className="text-green-500 shrink-0" size={16} />
    ) : (
      <XCircle className="text-red-500 shrink-0" size={16} />
    )}
    <p className={`text-[11px] font-bold leading-tight ${
      status.type === 'success' ? 'text-green-700' : 'text-red-600'
    }`}>
      {status.message}
    </p>
  </div>
)}

          {/* Action Button */}
          <button 
            disabled={loading || (isSignUp && (strength < 2 || password !== confirmPassword))} 
            type="submit" 
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs tracking-widest shadow-xl active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              isUpdatingPassword ? "UPDATE PASSWORD" : isResetMode ? "SEND RESET LINK" : isSignUp ? "CREATE ACCOUNT" : "SIGN IN"
            )}
          </button>

          {/* Mode Switchers */}
          {!isUpdatingPassword && (
            <div className="pt-4 flex flex-col gap-3 items-center">
              <button 
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setIsResetMode(false);
                  setErrorMessage(null);
                }} 
                className="text-xs font-bold text-slate-500 hover:text-safety-500 transition-colors uppercase tracking-widest"
              >
                {isSignUp ? "Already have an account? Sign In" : "New user? Create account"}
              </button>
              
              {isResetMode && (
                <button type="button" onClick={() => setIsResetMode(false)} className="text-[10px] font-bold text-slate-300 uppercase underline">Back to Login</button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};