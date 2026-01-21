import React, { useState, useEffect } from 'react';
import { ResetPassword } from './components/ResetPassword';import { motion, AnimatePresence } from 'framer-motion';
import { Auth } from './components/Auth'; 

import { 
  Landmark, 
  LayoutGrid, 
  Hexagon, 
  ArrowRight,
  History,
  FolderOpen
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
  const [session, setSession] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  useEffect(() => {
    // 1. Check current session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    // 2. Listen for auth changes and specific PASSWORD_RECOVERY events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      // If Supabase tells us this is a recovery session, we lock it in
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }
      
      setInitializing(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handler for Signing Out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentView('dashboard');
    setIsRecovering(false);
  };   

  // State to hold data loaded from history
  const [loadedProjectData, setLoadedProjectData] = useState<ProjectSavedState | undefined>(undefined);
  const [loadedPlottingData, setLoadedPlottingData] = useState<PlottingState | undefined>(undefined);
  const [loadedProjectId, setLoadedProjectId] = useState<number | undefined>(undefined);

  const handleModuleSelect = async (view: ViewState) => {
    setCurrentView('loading');
    if (view === 'land-structurer') {
      setLoadedProjectData(undefined);
      setLoadedProjectId(undefined);
      setLoadedPlottingData(undefined);
    }
    setTimeout(() => {
      setCurrentView(view);
    }, 2000);
  };

  const handleBackToDash = () => {
    setCurrentView('dashboard');
  };

  const handleBackToHistory = () => {
    setCurrentView('history');
  };

  const handleLoadProject = (data: ProjectSavedState, id: number) => {
    setLoadedProjectData(data);
    setLoadedProjectId(id);
    setLoadedPlottingData(undefined);
    setCurrentView('loading');
    setTimeout(() => {
      setCurrentView('land-structurer');
    }, 300);
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
        if (!error && dbData && dbData.plotting_data) {
          setLoadedPlottingData(dbData.plotting_data);
        } else {
          setLoadedPlottingData(undefined);
        }
    } catch (err) {
        console.error("Error fetching plotting data:", err);
        setLoadedPlottingData(undefined);
    }
    setTimeout(() => {
      setCurrentView('plotting');
    }, 300);
  };

  const handleOpenPlotRegistry = (project: ProjectRow) => {
    if (!project.full_data) {
        alert("Project data missing.");
        return;
    }
    setLoadedProjectData(project.full_data);
    setLoadedProjectId(project.id);
    setLoadedPlottingData(project.plotting_data); 
    setCurrentView('loading');
    setTimeout(() => {
        setCurrentView('plot-registry');
    }, 300);
  };

  // --- GATEKEEPER LOGIC ---

  // 1. Check the URL bar IMMEDIATELY for the recovery tag
  // We check BOTH the hash (#) and the search (?) just in case
  const isUrlRecovery = window.location.hash.includes('type=recovery') || 
                        window.location.search.includes('type=recovery');

  // 2. While checking the session, show the loader
  if (initializing) {
    return (
      <div className="h-screen bg-[#F1F5F9] flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // 3. THE SECURITY GATE: 
  // If we see 'recovery' in the URL OR if Supabase tells us it's recovery mode
  // We FORCE the ResetPassword page and stop everything else.
  if (isRecovering || isUrlRecovery) {
    return <ResetPassword onComplete={() => {
      setIsRecovering(false);
      window.location.hash = ''; // Clean the URL
      window.location.search = '';
    }} />;
  }

  // 4. If not logged in at all, show the standard Login/Auth page
  if (!session) {
    return <Auth />;
  }

  // 5. Only if 1, 3, and 4 are false do we show the Dashboard
  return (

    <div className="min-h-screen w-full bg-[#F1F5F9] text-slate-800 font-sans overflow-hidden relative">
      <AnimatePresence mode="wait">
        
        {currentView === 'loading' && (
          <motion.div
            key="loader"
            className="absolute inset-0 z-50 bg-[#F1F5F9]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
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
            exit={{ opacity: 0,}}
            transition={{ duration: 0 }}
          >
            <header className="flex justify-between items-center mb-16 md:mb-24">
              <div className="flex items-center gap-4 group cursor-default">
                <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] shadow-[6px_6px_12px_#cbd5e1,-6px_-6px_12px_#ffffff] flex items-center justify-center border border-white/50">
                  <Hexagon className="text-safety-500" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-800">
                    GDK NEXUS <span className="text-safety-500 font-mono text-2xl align-top">2442</span>
                  </h1>
                  <p className="text-xs text-slate-400 font-mono tracking-[0.3em] uppercase">Enterprise Command System</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-2">
                <div className="hidden md:block">
                  <div className="text-xs text-slate-400 font-mono">SYSTEM STATUS</div>
                  <div className="flex items-center gap-2 text-safety-500 text-sm font-bold justify-end">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safety-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-safety-500"></span>
                    </span>
                    ONLINE
                  </div>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-red-500 transition-all shadow-sm active:scale-95 uppercase tracking-widest"
                >
                  Sign Out
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto w-full flex-1 items-center content-center">
              <NeuCard 
                title="New Land Acquisition"
                subtitle="Create Deal & Jantri Sheet"
                icon={<Landmark size={32} />}
                delay={0.1}
                onClick={() => handleModuleSelect('land-structurer')}
              />
              <NeuCard 
                title="Project Archives"
                subtitle="Manage Costs, Plots & Deals"
                icon={<FolderOpen size={32} />}
                delay={0.2}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
         >
           <ProjectHistory 
             onBack={handleBackToDash} 
             onLoadProject={(data, id) => handleLoadProject(data, id)}
             onEditPlotting={(data, id) => handleLoadPlottingProject(data, id)} 
             onOpenPlotting={(project) => handleOpenPlotRegistry(project)} 
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

interface NeuCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  delay: number;
  onClick: () => void;
}

const NeuCard: React.FC<NeuCardProps> = ({ title, subtitle, icon, delay, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      className="group relative flex flex-col h-72 w-full overflow-hidden p-10 text-left transition-all duration-300 bg-[#F1F5F9] rounded-[2rem] border border-white/60 shadow-[9px_9px_18px_#cbd5e1,-9px_-9px_18px_#ffffff] hover:shadow-[12px_12px_24px_#cbd5e1,-12px_-12px_24px_#ffffff] active:shadow-[inset_6px_6px_12px_#cbd5e1,inset_-6px_-6px_12px_#ffffff]"
      initial={{ opacity: 0}}
      animate={{ opacity: 1}}
      transition={{ duration: 0}}
    >
      <div className="mb-auto relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] border border-white flex items-center justify-center text-slate-400 group-hover:text-safety-500 transition-colors shadow-[4px_4px_8px_#cbd5e1,-4px_-4px_8px_#ffffff]">
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <h3 className="text-2xl font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{title}</h3>
        <p className="mt-2 text-base text-slate-400 group-hover:text-slate-500 transition-colors">{subtitle}</p>
      </div>
      <div className="absolute bottom-10 right-10 translate-x-4 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 z-10">
        <ArrowRight className="text-safety-500 w-8 h-8" />
      </div>
    </motion.button>
  );
};

export default App;