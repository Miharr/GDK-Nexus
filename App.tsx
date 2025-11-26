import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, 
  LayoutGrid, 
  HardHat, 
  Hexagon, 
  ArrowRight,
  Construction
} from 'lucide-react';
import { Loader } from './components/Loader';
import { LandDealStructurer } from './components/LandDealStructurer';

type ViewState = 'dashboard' | 'loading' | 'land-structurer' | 'plotting' | 'construction';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [targetView, setTargetView] = useState<ViewState>('dashboard');

  const handleModuleSelect = (view: ViewState) => {
    setTargetView(view);
    setCurrentView('loading');
    
    // Simulate system loading time
    setTimeout(() => {
      setCurrentView(view);
    }, 1800);
  };

  const handleBackToDash = () => {
    setCurrentView('dashboard');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white font-sans selection:bg-safety-500/30 overflow-hidden relative">
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-80"></div>
         <div className="absolute w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 mix-blend-overlay"></div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* --- VIEW: LOADING --- */}
        {currentView === 'loading' && (
          <motion.div
            key="loader"
            className="absolute inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.5 }}
          >
            <Loader />
          </motion.div>
        )}

        {/* --- VIEW: DASHBOARD --- */}
        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            className="relative z-10 flex flex-col h-screen p-6 md:p-12 overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: "blur(5px)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <header className="flex justify-between items-center mb-16 md:mb-24">
              <div className="flex items-center gap-3 group cursor-default">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:border-safety-500/50 transition-colors">
                  <Hexagon className="text-safety-500 fill-safety-500/10" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                    GDK NEXUS <span className="text-safety-500 font-mono text-2xl align-top">2442</span>
                  </h1>
                  <p className="text-xs text-slate-500 font-mono tracking-[0.3em] uppercase">Enterprise Command System</p>
                </div>
              </div>
              <div className="hidden md:block text-right">
                <div className="text-xs text-slate-500 font-mono">SYSTEM STATUS</div>
                <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  ONLINE
                </div>
              </div>
            </header>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto w-full flex-1 items-center">
              
              {/* Card 1: Land Acquisition */}
              <GlassCard 
                title="Land Acquisition"
                subtitle="Deal Structuring & Jantri"
                icon={<Landmark size={32} />}
                delay={0.1}
                onClick={() => handleModuleSelect('land-structurer')}
              />

              {/* Card 2: Plotting */}
              <GlassCard 
                title="Plotting & Inventory"
                subtitle="Costing & Yield Analysis"
                icon={<LayoutGrid size={32} />}
                delay={0.2}
                onClick={() => handleModuleSelect('plotting')}
              />

              {/* Card 3: Construction */}
              <GlassCard 
                title="Construction Estimator"
                subtitle="BoQ & Material Planning"
                icon={<HardHat size={32} />}
                delay={0.3}
                onClick={() => handleModuleSelect('construction')}
              />

            </div>

            {/* Footer */}
            <footer className="mt-12 text-center text-slate-600 text-xs font-mono">
              SECURE CONNECTION // ENCRYPTED V.4.2.0
            </footer>
          </motion.div>
        )}

        {/* --- VIEW: MODULE 1 (LAND STRUCTURER) --- */}
        {currentView === 'land-structurer' && (
          <motion.div
            key="module-1"
            className="absolute inset-0 z-10 bg-slate-950 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LandDealStructurer onBack={handleBackToDash} />
          </motion.div>
        )}

        {/* --- VIEW: PLACEHOLDERS --- */}
        {(currentView === 'plotting' || currentView === 'construction') && (
          <motion.div
            key="placeholder"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-slate-900/50 p-12 rounded-2xl border border-white/10 backdrop-blur-xl text-center max-w-md mx-4">
              <div className="bg-safety-500/10 p-4 rounded-full w-fit mx-auto mb-6">
                <Construction className="text-safety-500" size={48} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Module Offline</h2>
              <p className="text-slate-400 mb-8">
                This sector of the Nexus is currently under development. Access restricted.
              </p>
              <button 
                onClick={handleBackToDash}
                className="px-6 py-2 bg-white text-slate-950 font-bold rounded hover:bg-slate-200 transition-colors"
              >
                Return to Command
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

// --- Sub-Component: Glass Card ---

interface GlassCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  delay: number;
  onClick: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ title, subtitle, icon, delay, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      className="group relative flex flex-col h-64 w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur-xl transition-all duration-500 hover:border-safety-500/50 hover:bg-white/10"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow Effect */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-safety-500/20 blur-[60px] transition-all duration-500 group-hover:bg-safety-500/30" />

      {/* Icon */}
      <div className="mb-auto">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 text-slate-300 transition-colors group-hover:bg-safety-500 group-hover:text-white">
          {icon}
        </div>
      </div>

      {/* Text */}
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-white group-hover:text-safety-400 transition-colors">{title}</h3>
        <p className="mt-1 text-sm text-slate-400 group-hover:text-slate-300">{subtitle}</p>
      </div>

      {/* Action Arrow */}
      <div className="absolute bottom-8 right-8 translate-x-10 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        <ArrowRight className="text-safety-500" />
      </div>
    </motion.button>
  );
};

export default App;