
import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Trash2, 
  FolderOpen, 
  History, 
  Calendar,
  MapPin,
  IndianRupee,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { ProjectRow, ProjectSavedState } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface Props {
  onBack: () => void;
  onLoadProject: (data: ProjectSavedState, id: number) => void;
  mode?: 'manage' | 'select'; // 'manage' = History (Open/Delete), 'select' = Plotting (Load only)
}

export const ProjectHistory: React.FC<Props> = ({ onBack, onLoadProject, mode = 'manage' }) => {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    if (!supabase) {
      setError('Database connection invalid. Check Supabase URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError('Failed to load project history. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    //if (!window.confirm("Are you sure you want to delete this project permanently?")) return;

    const previousProjects = [...projects];
    setProjects(prev => prev.filter(p => p.id !== id));

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Delete failed:', err);
      setProjects(previousProjects); 
      alert(`Delete failed: ${err.message}`);
    }
  };

 const handleLoad = (project: ProjectRow) => {
    if (!project.full_data) {
      alert('Project data is corrupted or missing.');
      return;
    }
    onLoadProject(project.full_data, project.id);
  };

  const filteredProjects = projects.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (p.project_name?.toLowerCase().includes(searchLower) || '') ||
      (p.village_name?.toLowerCase().includes(searchLower) || '')
    );
  });

  const isSelectMode = mode === 'select';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 animate-in fade-in duration-500 font-sans pb-12">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 md:px-8 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={onBack} type="button" className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold flex items-center gap-2 text-slate-900">
                {isSelectMode ? (
                   <CheckCircle2 className="text-emerald-500 h-6 w-6" />
                ) : (
                   <History className="text-safety-500 h-5 w-5" />
                )}
                {isSelectMode ? 'Select Base Project' : 'Project Archives'}
              </h1>
              {isSelectMode && (
                <p className="text-xs text-slate-400">Choose a Land Acquisition project to proceed with Plotting</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 mt-8">
        
        {/* Search Bar */}
        <div className="mb-8">
          <div className="neu-flat relative flex items-center px-4 py-3">
            <Search className="text-slate-400 mr-3" size={20} />
            <input 
              type="text" 
              placeholder="Search by Project Name or Village..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-700 font-medium placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">
             <div className="animate-spin w-8 h-8 border-2 border-safety-500 border-t-transparent rounded-full mx-auto mb-4"></div>
             Loading...
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500 flex flex-col items-center gap-2">
            <AlertCircle size={32} />
            {error}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            No projects found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project, index) => (
              <div key={project.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-all hover:shadow-md">
                
                {/* Project Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-slate-800">{project.project_name || 'Untitled Project'}</h3>
                    <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded font-mono">#{index + 1}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 mt-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-safety-500" />
                      {project.village_name || 'Unknown Village'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-safety-500" />
                      {formatDate(new Date(project.created_at))}
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <IndianRupee size={14} className="text-safety-500" />
                      {formatCurrency(project.total_land_cost || 0)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto pt-4 md:pt-0 border-t md:border-0 border-slate-100">
                  <button 
                    onClick={() => handleLoad(project)}
                    type="button"
                    className={`${isSelectMode ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200 shadow-lg' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all`}
                  >
                    {isSelectMode ? <CheckCircle2 size={18} /> : <FolderOpen size={16} />}
                    {isSelectMode ? 'Load & Proceed' : 'Open'}
                  </button>
                  
                  {!isSelectMode && (
                    <button 
                        onClick={() => handleDelete(project.id)}
                        type="button"
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                        <Trash2 size={16} /> Delete
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
