import React, { useState, useEffect, useRef } from 'react';
import { ResetPassword } from './components/ResetPassword';
import { motion, AnimatePresence } from 'framer-motion';
import { Auth } from './components/Auth'; 

import { 
  Landmark, 
  Hexagon, 
  ArrowRight,
  FolderOpen,
  LogOut
} from 'lucide-react';
import { Loader } from './components/Loader';
import { LandDealStructurer } from './components/LandDealStructurer';
import { ProjectHistory } from './components/ProjectHistory';
import { PlottingDashboard } from './components/PlottingDashboard';
import { ProjectPlotsView } from './components/ProjectPlotsView'; 
import { ProjectSavedState, PlottingState, ProjectRow } from './types';
import { supabase } from './supabaseClient';

type ViewState = 'dashboard' | 'loading' | 'land-structurer' | 'plotting-list' | 'plotting' | 'history' | 'plot-registry';

const App: React.FC = () => {
  // --- AUTH STATES ---
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  // --- DATA STATES ---
  const [loadedProjectData, setLoadedProjectData] = useState<ProjectSavedState | undefined>(undefined);
  const [loadedPlottingData, setLoadedPlottingData] = useState<PlottingState | undefined>(undefined);
  const [loadedProjectId, setLoadedProjectId] = useState<number | undefined>(undefined);

  // --- REFS FOR TIMERS ---
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Check current session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }
      setInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 🛡️ LAYER 1: THE PANIC TIMER (Emergency Reset) ---
  useEffect(() => {
    let panicTimer: NodeJS.Timeout;
    if (currentView === 'loading') {
      panicTimer = setTimeout(() => {
        console.warn("Loader deadlock detected. Safety reset triggered.");
        setCurrentView('dashboard');
      }, 4000); 
    }
    return () => clearTimeout(panicTimer);
  }, [currentView]);

  // --- HANDLERS ---
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentView('dashboard');
    setIsRecovering(false);
  };   

  // 🛡️ LAYER 2: DOUBLE-CLICK PROTECTION & TIMER MANAGEMENT
  const startLoadingTransition = (targetView: ViewState, delay = 2000) => {
    if (currentView === 'loading') return; 
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    
    setCurrentView('loading');
    loadingTimerRef.current = setTimeout(() => {
      setCurrentView(targetView);
    }, delay);
  };

  const handleModuleSelect = (view: ViewState) => {
    if (view === 'land-structurer') {
      setLoadedProjectData(undefined);
      setLoadedProjectId(undefined);
      setLoadedPlottingData(undefined);
    }
    startLoadingTransition(view);
  };

  const handleBackToDash = () => setCurrentView('dashboard');
  const handleBackToHistory = () => setCurrentView('history');

  const handleLoadProject = (data: ProjectSavedState, id: number) => {
    setLoadedProjectData(data);
    setLoadedProjectId(id);
    setLoadedPlottingData(undefined);
    startLoadingTransition('land-structurer', 300);
  };

  const handleLoadPlottingProject = async (data: ProjectSavedState, id: number) => {
    setLoadedProjectData(data);
    setLoadedProjectId(id);
    setCurrentView('loading');
    try {
        const { data: dbData, error } = await supabase
          .from('projects')
          .select('plotting_data')
          .eq('id', id)
          .single();
        if (!error && dbData?.plotting_data) {
          setLoadedPlottingData(dbData.plotting_data);
        } else {
          setLoadedPlottingData(undefined);
        }
    } catch (err) {
        console.error("Error fetching plotting data:", err);
        setLoadedPlottingData(undefined);
    }
    startLoadingTransition('plotting', 300);
  };

  const handleOpenPlotRegistry = (project: ProjectRow) => {
    if (!project.full_data) {
        alert("Project data missing.");
        return;
    }
    setLoadedProjectData(project.full_data);
    setLoadedProjectId(project.id);
    setLoadedPlottingData(project.plotting_data); 
    startLoadingTransition('plot-registry', 300);
  };

  // --- GATEKEEPER LOGIC ---
  const isUrlRecovery = window.location.hash.includes('type=recovery') || 
                        window.location.search.includes('type=recovery');

  if (initializing) {
    return (
      <div className="h-screen bg-[#F1F5F9] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (isRecovering || isUrlRecovery) {
    return <ResetPassword onComplete={() => {
      setIsRecovering(false);
      window.location.hash = ''; 
      window.location.search = '';
    }} />;
  }

  if (!session) return <Auth />;

  // Extract username from metadata
  const userName = session?.user?.user_metadata?.display_name || 'Partner';

  return (
    <div className="min-h-screen w-full bg-[#F1F5F9] text-slate-800 font-sans overflow-hidden relative">
      <AnimatePresence mode="popLayout">
        
        {currentView === 'loading' && (
          <motion.div
            key="loader"
            className="absolute inset-0 z-50 bg-[#F1F5F9] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Loader />
          </motion.div>
        )}

        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            className="relative z-10 flex flex-col h-screen p-6 md:p-12 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1}}
            exit={{ opacity: 0}}
            transition={{ duration: 0.2 }}
          >
            <header className="flex justify-between items-start mb-16 md:mb-24">
              <div className="flex items-center gap-4 group cursor-default">
                <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff] flex items-center justify-center border border-white/50 transition-transform group-hover:scale-105 duration-300">
                  <Hexagon className="text-safety-500" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-800">
                    GDK NEXUS <span className="text-safety-500 font-mono text-2xl align-top">2442</span>
                  </h1>
                  <p className="text-xs text-slate-400 font-mono tracking-[0.3em] uppercase">Enterprise Command System</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Verified Session</p>
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 justify-end">
                    Hey, <span className="text-safety-500">{userName}</span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  </h2>
                </div>
                
                <button 
                  onClick={handleSignOut}
                  className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm active:scale-95 uppercase tracking-widest"
                >
                  <LogOut size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                  Sign Out
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto w-full flex-1 items-center content-center">
              <NeuCard 
                title="New Land Acquisition"
                subtitle="Create Deal & Jantri Sheet"
                icon={<Landmark size={32} />}
                onClick={() => handleModuleSelect('land-structurer')}
              />
              <NeuCard 
                title="Project Archives"
                subtitle="Manage Costs, Plots & Deals"
                icon={<FolderOpen size={32} />}
                onClick={() => handleModuleSelect('history')}
              />
            </div>

            <footer className="mt-12 text-center text-slate-400 text-xs font-mono">
              SECURE CONNECTION // ENCRYPTED V.4.2.0
            </footer>
          </motion.div>
        )}

        {currentView === 'land-structurer' && (
          <motion.div
            key="module-1"
            className="absolute inset-0 z-10 bg-[#F1F5F9] overflow-y-auto"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <LandDealStructurer 
              onBack={loadedProjectId ? handleBackToHistory : handleBackToDash} 
              initialData={loadedProjectData}
              initialId={loadedProjectId}
            />
          </motion.div>
        )}
        
        {currentView === 'plotting' && loadedProjectData && loadedProjectId && (
          <motion.div
            key="module-2"
            className="absolute inset-0 z-10 bg-[#F1F5F9] overflow-y-auto"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
             <PlottingDashboard 
               onBack={handleBackToHistory}
               projectData={loadedProjectData}
               existingPlottingData={loadedPlottingData}
               projectId={loadedProjectId}
             />
          </motion.div>
        )}

        {currentView === 'history' && (
           <motion.div
           key="module-history"
           className="absolute inset-0 z-10 bg-[#F1F5F9] overflow-y-auto"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -20 }}
         >
           <ProjectHistory 
             onBack={handleBackToDash} 
             onLoadProject={handleLoadProject}
             onEditPlotting={handleLoadPlottingProject} 
             onOpenPlotting={handleOpenPlotRegistry} 
           />
         </motion.div>
        )}

        {currentView === 'plot-registry' && loadedProjectData && (
            <motion.div
            key="module-registry"
            className="absolute inset-0 z-10 bg-[#F1F5F9] overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            >
                <ProjectPlotsView 
                    onBack={handleBackToHistory}
                    projectData={loadedProjectData}
                    plottingData={loadedPlottingData}
                    projectId={loadedProjectId!} 
                />
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// NeuCard Helper
const NeuCard: React.FC<{ title: string, subtitle: string, icon: React.ReactNode, onClick: () => void }> = ({ title, subtitle, icon, onClick }) => (
  <motion.button
    onClick={onClick}
    className="group relative flex flex-col h-72 w-full p-10 text-left bg-[#F1F5F9] rounded-[2rem] border border-white/60 shadow-[9px_9px_18px_#cbd5e1,-9px_-9px_18px_#ffffff] hover:shadow-[12px_12px_24px_#cbd5e1,-12px_-12px_24px_#ffffff] active:shadow-[inset_6px_6px_12px_#cbd5e1,inset_-6px_-6px_12px_#ffffff] transition-all"
  >
    <div className="mb-auto">
      <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] border border-white flex items-center justify-center text-slate-400 group-hover:text-safety-500 transition-colors shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff]">
        {icon}
      </div>
    </div>
    <div>
      <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
      <p className="mt-2 text-base text-slate-400">{subtitle}</p>
    </div>
    <div className="absolute bottom-10 right-10 translate-x-4 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
      <ArrowRight className="text-safety-500 w-8 h-8" />
    </div>
  </motion.button>
);

export default App;