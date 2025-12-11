
import React, { useState, useEffect } from 'react';
import { LeadResearchService } from 'src/core/intelligence/lead-research';
import { ResearchResult } from 'types';
import { WebPreviewCard } from './chat/Attachments';
import { AdminChatPanel } from './admin/chat/AdminChatPanel';
import { cn } from 'src/lib/utils';
import { useTheme } from '../context/ThemeContext';

interface AdminDashboardProps {
  onClose: () => void;
  researchService: LeadResearchService | null;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, researchService }) => {
  const { isDarkMode } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'leads' | 'intelligence' | 'settings' | 'metrics' | 'chat'>('leads');
  
  // Data State
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<ResearchResult | null>(null);

  // Settings State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [systemPromptInput, setSystemPromptInput] = useState('');
  
  // Research Simulator State
  const [simEmail, setSimEmail] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<ResearchResult | null>(null);

  useEffect(() => {
      if (isAuthenticated) {
          loadLeads();
          loadSettings();
      }
  }, [isAuthenticated]);

  const loadLeads = () => {
      const loadedLeads: any[] = [];
      
      // 1. Scan SessionStorage for research cache
      for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith('lead_research_')) {
              try {
                  const data = JSON.parse(sessionStorage.getItem(key) || '{}');
                  loadedLeads.push({
                      id: key,
                      name: data.person?.fullName || 'Unknown',
                      email: key.replace('lead_research_', '').split('_')[0] || 'Unknown',
                      company: data.company?.name || 'Unknown',
                      role: data.person?.role || 'Unknown',
                      date: 'Session Cached',
                      status: 'Researched',
                      raw: data
                  });
              } catch (e) { console.error("Failed to parse lead", e); }
          }
      }

      // 2. Add Mock Leads for Demo if empty
      if (loadedLeads.length === 0) {
          loadedLeads.push(
              { id: 'mock1', name: "Sarah Connor", email: "sarah.connor@technosys.net", company: "TechnoSys", role: "Security Consultant", date: "2024-03-15", status: "Active", raw: null },
              { id: 'mock2', name: "Dr. Miles Dyson", email: "m.dyson@cyberdyne.io", company: "Cyberdyne Systems", role: "Director of Special Projects", date: "2024-03-14", status: "Pending", raw: null },
              { id: 'mock3', name: "Eldon Tyrell", email: "ceo@tyrellcorp.com", company: "Tyrell Corp", role: "CEO", date: "2024-03-12", status: "Closed", raw: null }
          );
      }

      setLeads(loadedLeads);
  };

  const loadSettings = () => {
      setApiKeyInput(localStorage.getItem('fbc_api_key') || '');
      setSystemPromptInput(localStorage.getItem('fbc_system_prompt') || '');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '2025') {
      setIsAuthenticated(true);
    } else {
      alert('Access Denied: Invalid PIN');
      setPin('');
    }
  };

  const handleSimulateResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchService || !simEmail) return;

    setSimLoading(true);
    setSimResult(null);

    try {
      const result = await researchService.researchLead(simEmail);
      setSimResult(result);
      loadLeads(); // Refresh list
    } catch (err) {
      console.error(err);
      alert('Research failed. Check console.');
    } finally {
      setSimLoading(false);
    }
  };

  const saveSettings = () => {
      if (apiKeyInput.trim()) {
          localStorage.setItem('fbc_api_key', apiKeyInput.trim());
      } else {
          localStorage.removeItem('fbc_api_key');
      }

      if (systemPromptInput.trim()) {
          localStorage.setItem('fbc_system_prompt', systemPromptInput.trim());
      } else {
          localStorage.removeItem('fbc_system_prompt');
      }
      
      alert("Settings saved. Please refresh the page for changes to take effect.");
  };

  const clearCache = () => {
      sessionStorage.clear();
      loadLeads();
      alert("Session cache cleared.");
  };

  if (!isAuthenticated) {
    return (
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-xl ${isDarkMode ? 'bg-black/90' : 'bg-gray-50/90'}`}>
        <div className={`w-full max-w-sm p-8 rounded-3xl shadow-2xl border animate-fade-in-up ${isDarkMode ? 'bg-black border-white/10' : 'bg-white border-white/40'}`}>
          <div className="flex flex-col items-center gap-4 mb-8">
             <div className={`w-12 h-12 flex items-center justify-center rounded-xl font-bold font-matrix text-sm shadow-lg ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>FB</div>
             <div className="text-center">
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Admin Console</h2>
                <p className={`text-xs font-mono uppercase tracking-wider mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Authorized Personnel Only</p>
             </div>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
             <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="ENTER PIN"
                className={`w-full px-4 py-3 text-center text-lg tracking-[0.5em] rounded-xl outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50' : 'bg-gray-50 border-gray-200 text-slate-900 focus:border-orange-500/50'}`}
                autoFocus
             />
             <button 
                type="submit"
                className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-lg ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
             >
                Authenticate
             </button>
             <button 
                type="button"
                onClick={onClose}
                className={`text-xs text-center mt-2 hover:underline ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}
             >
                Return to Site
             </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col ${isDarkMode ? 'bg-[#050505] text-white' : 'bg-gray-50 text-slate-900'}`}>
       {/* Top Bar */}
       <header className={`flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-white/40 border-gray-200'}`}>
           <div className="flex items-center gap-3">
               <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold font-matrix text-xs ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>FB</div>
               <span className="font-matrix font-semibold tracking-tight">F.B/c Admin</span>
               <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>System Online</span>
           </div>
           <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           </button>
       </header>

       <div className="flex flex-1 overflow-hidden">
           {/* Sidebar */}
           <aside className={`w-64 flex-shrink-0 border-r p-4 flex flex-col gap-2 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-white/50'}`}>
               <button 
                  onClick={() => setActiveTab('leads')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'leads' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-black shadow-sm') : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100')}`}
               >
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                   Lead Database
               </button>
               <button 
                  onClick={() => setActiveTab('intelligence')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'intelligence' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-black shadow-sm') : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100')}`}
               >
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                   Intelligence Tool
               </button>
               <button 
                  onClick={() => setActiveTab('metrics')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'metrics' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-black shadow-sm') : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100')}`}
               >
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                   System Metrics
               </button>
               <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'chat' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-black shadow-sm') : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100')}`}
               >
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                   Admin Chat
               </button>
               <button 
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'settings' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-white text-black shadow-sm') : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100')}`}
               >
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                   Settings & Config
               </button>
           </aside>

           {/* Content */}
           <main className={cn("flex-1 overflow-auto relative", activeTab === 'chat' ? 'p-0' : 'p-8')}>
               
               {/* --- LEADS TAB --- */}
               {activeTab === 'leads' && (
                   <div className="max-w-5xl mx-auto animate-fade-in-up">
                       <div className="flex items-center justify-between mb-6">
                           <h2 className="text-2xl font-bold tracking-tight">Captured Leads</h2>
                           <button className={`px-4 py-2 rounded-lg text-sm font-medium border ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-white'}`}>Export CSV</button>
                       </div>
                       
                       <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                           <table className="w-full text-left text-sm">
                               <thead className={`border-b ${isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                                   <tr>
                                       <th className="px-6 py-4 font-mono uppercase text-xs tracking-wider opacity-60">Name</th>
                                       <th className="px-6 py-4 font-mono uppercase text-xs tracking-wider opacity-60">Company</th>
                                       <th className="px-6 py-4 font-mono uppercase text-xs tracking-wider opacity-60">Role</th>
                                       <th className="px-6 py-4 font-mono uppercase text-xs tracking-wider opacity-60">Status</th>
                                       <th className="px-6 py-4 font-mono uppercase text-xs tracking-wider opacity-60 text-right">Actions</th>
                                   </tr>
                               </thead>
                               <tbody className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
                                   {leads.map((lead) => (
                                       <tr key={lead.id} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                           <td className="px-6 py-4 font-medium">
                                               <div className="flex items-center gap-3">
                                                   <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isDarkMode ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                                       {lead.name.charAt(0)}
                                                   </div>
                                                   <div>
                                                       <div>{lead.name}</div>
                                                       <div className="text-xs opacity-50 font-mono mt-0.5">{lead.email}</div>
                                                   </div>
                                               </div>
                                           </td>
                                           <td className="px-6 py-4">{lead.company}</td>
                                           <td className="px-6 py-4">
                                               <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                                                   {lead.role}
                                               </span>
                                           </td>
                                           <td className="px-6 py-4">
                                               <div className="flex items-center gap-2">
                                                   <span className={`w-1.5 h-1.5 rounded-full ${lead.status === 'Active' || lead.status === 'Researched' ? 'bg-orange-400' : 'bg-amber-400'}`}></span>
                                                   <span className={lead.status === 'Active' || lead.status === 'Researched' ? 'text-orange-500' : ''}>{lead.status}</span>
                                               </div>
                                           </td>
                                           <td className="px-6 py-4 text-right">
                                               {lead.raw && (
                                                   <button 
                                                       onClick={() => setSelectedLead(lead.raw as ResearchResult | null)}
                                                       className={`text-xs font-medium hover:underline ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}
                                                   >
                                                       View JSON
                                                   </button>
                                               )}
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                           {leads.length === 0 && (
                               <div className="p-8 text-center opacity-50">No leads found in session storage.</div>
                           )}
                       </div>
                   </div>
               )}

               {/* --- INTELLIGENCE TAB --- */}
               {activeTab === 'intelligence' && (
                   <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-fade-in-up">
                       <div className="flex flex-col gap-2">
                           <h2 className="text-2xl font-bold tracking-tight">Intelligence Simulator</h2>
                           <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manually trigger the Lead Research Service to test grounding capabilities and schema extraction.</p>
                       </div>

                       <form onSubmit={(e) => { e.preventDefault(); void handleSimulateResearch(e); }} className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                           <div className="flex gap-4">
                               <input 
                                   type="email" 
                                   value={simEmail}
                                   onChange={(e) => setSimEmail(e.target.value)}
                                   placeholder="Enter target email (e.g. contact@example.com)"
                                   className={`flex-1 px-4 py-3 rounded-xl outline-none border transition-all ${isDarkMode ? 'bg-black/50 border-white/10 focus:border-orange-500' : 'bg-gray-50 border-gray-200 focus:border-orange-500'}`}
                                   required
                               />
                               <button 
                                    type="submit"
                                    disabled={simLoading}
                                    className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} ${simLoading ? 'opacity-50' : ''}`}
                               >
                                   {simLoading ? <span className="animate-spin block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
                                   RUN RESEARCH
                               </button>
                           </div>
                       </form>

                       {simResult && (
                           <div className={`p-6 rounded-2xl border animate-fade-in-up ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                               <div className="flex items-start justify-between mb-6 border-b pb-4 border-dashed border-gray-700/50">
                                   <div>
                                       <h3 className="text-xl font-bold">{simResult.person.fullName}</h3>
                                       <div className="text-orange-500 font-mono text-sm mt-1">{simResult.role} at {simResult.company.name}</div>
                                   </div>
                                   <div className="text-right">
                                       <div className="text-[10px] font-mono uppercase tracking-wider opacity-60">Confidence Score</div>
                                       <div className="text-xl font-bold">{Math.round(simResult.confidence * 100)}%</div>
                                   </div>
                               </div>

                               <div className="grid grid-cols-2 gap-8 mb-8">
                                   <div className="space-y-4">
                                       <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Company Intelligence</h4>
                                       <div className="space-y-2 text-sm">
                                           <div className="grid grid-cols-3 gap-2">
                                               <span className="opacity-50">Industry:</span>
                                               <span className="col-span-2 font-medium">{simResult.company.industry}</span>
                                           </div>
                                           <div className="grid grid-cols-3 gap-2">
                                               <span className="opacity-50">Size:</span>
                                               <span className="col-span-2 font-medium">{simResult.company.size}</span>
                                           </div>
                                           <div className="grid grid-cols-3 gap-2">
                                               <span className="opacity-50">Domain:</span>
                                               <span className="col-span-2 font-mono text-xs">{simResult.company.domain}</span>
                                           </div>
                                       </div>
                                       <p className={`text-sm leading-relaxed p-3 rounded-lg border ${isDarkMode ? 'bg-black/20 border-white/5 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                                           {simResult.company.summary}
                                       </p>
                                   </div>

                                   <div className="space-y-4">
                                       <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">Verified Citations</h4>
                                       <div className="space-y-2">
                                           {simResult.citations?.map((cite, idx) => (
                                               <WebPreviewCard 
                                                   key={idx}
                                                   title={cite.title || 'Source'}
                                                   url={cite.uri}
                                                   type="web"
                                                   className={isDarkMode ? 'bg-black/30 border-white/10' : 'bg-gray-50 border-gray-200'}
                                               />
                                           ))}
                                       </div>
                                   </div>
                               </div>

                               <div>
                                   <h4 className="text-xs font-bold uppercase tracking-wider opacity-60 mb-2">Raw JSON Output</h4>
                                   <pre className={`p-4 rounded-xl text-xs font-mono overflow-auto max-h-60 custom-scrollbar ${isDarkMode ? 'bg-black text-orange-400' : 'bg-slate-900 text-orange-400'}`}>
                                       {JSON.stringify(simResult, null, 2)}
                                   </pre>
                               </div>
                           </div>
                       )}
                   </div>
               )}

               {/* --- SETTINGS TAB --- */}
               {/* --- METRICS TAB --- */}
               {activeTab === 'metrics' && (
                   <div className="max-w-6xl mx-auto animate-fade-in-up">
                       <div className="flex flex-col gap-2 mb-6">
                           <h2 className="text-2xl font-bold tracking-tight">System Metrics</h2>
                           <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Real-time performance and usage statistics.</p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                           <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                               <div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-2">Active Sessions</div>
                               <div className="text-3xl font-bold">1,337</div>
                           </div>
                           <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                               <div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-2">Avg Response Time</div>
                               <div className="text-3xl font-bold">485<span className="text-lg ml-1">ms</span></div>
                           </div>
                           <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                               <div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-2">P95 Response Time</div>
                               <div className="text-3xl font-bold">920<span className="text-lg ml-1">ms</span></div>
                           </div>
                           <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                               <div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-2">Error Rate</div>
                               <div className="text-3xl font-bold text-green-500">0.03<span className="text-lg ml-1">%</span></div>
                           </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                           <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                               <div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-4">Usage Metrics</div>
                               <div className="space-y-3">
                                   <div className="flex justify-between items-center">
                                       <span className="text-sm">Multimodal Usage</span>
                                       <span className="font-bold">72%</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                       <span className="text-sm">Objection Handling Rate</span>
                                       <span className="font-bold">94%</span>
                                   </div>
                                   <div className="flex justify-between items-center">
                                       <span className="text-sm">Fast-Track Rate</span>
                                       <span className="font-bold">68%</span>
                                   </div>
                               </div>
                           </div>
                           <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                               <div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-4">Stage Distribution</div>
                               <div className="space-y-2 text-sm">
                                   <div className="flex justify-between">
                                       <span>DISCOVERY</span>
                                       <span className="font-mono">8%</span>
                                   </div>
                                   <div className="flex justify-between">
                                       <span>QUALIFIED</span>
                                       <span className="font-mono">22%</span>
                                   </div>
                                   <div className="flex justify-between">
                                       <span>PITCHING</span>
                                       <span className="font-mono">45%</span>
                                   </div>
                                   <div className="flex justify-between">
                                       <span>OBJECTION</span>
                                       <span className="font-mono">15%</span>
                                   </div>
                                   <div className="flex justify-between">
                                       <span>CLOSING</span>
                                       <span className="font-mono">8%</span>
                                   </div>
                                   <div className="flex justify-between">
                                       <span>BOOKED</span>
                                       <span className="font-mono">2%</span>
                                   </div>
                               </div>
                           </div>
                       </div>
                   </div>
               )}

               {activeTab === 'chat' && (
                   <div className="h-full w-full animate-fade-in-up">
                       <AdminChatPanel className="h-full" />
                   </div>
               )}

               {activeTab === 'settings' && (
                   <div className="max-w-3xl mx-auto animate-fade-in-up flex flex-col gap-8">
                       <div className="flex flex-col gap-2">
                           <h2 className="text-2xl font-bold tracking-tight">System Configuration</h2>
                           <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manage API keys and global agent behavior.</p>
                       </div>

                       <div className={`p-6 rounded-2xl border space-y-6 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>
                           <div className="flex flex-col gap-3">
                               <label className="text-xs font-bold uppercase tracking-wider opacity-70">Gemini API Key (Override)</label>
                               <input 
                                   type="password"
                                   value={apiKeyInput}
                                   onChange={(e) => setApiKeyInput(e.target.value)}
                                   placeholder="Enter your API key to override env"
                                   className={`w-full px-4 py-3 rounded-xl outline-none border transition-all ${isDarkMode ? 'bg-black/50 border-white/10 focus:border-orange-500' : 'bg-gray-50 border-gray-200 focus:border-orange-500'}`}
                               />
                               <p className="text-[10px] opacity-50">Leave empty to use the default provided via environment variables.</p>
                           </div>

                           <div className="flex flex-col gap-3">
                               <label className="text-xs font-bold uppercase tracking-wider opacity-70">System Instructions (Agent Persona)</label>
                               <textarea 
                                   value={systemPromptInput}
                                   onChange={(e) => setSystemPromptInput(e.target.value)}
                                   placeholder="Enter custom system instructions..."
                                   className={`w-full h-32 px-4 py-3 rounded-xl outline-none border transition-all resize-none custom-scrollbar ${isDarkMode ? 'bg-black/50 border-white/10 focus:border-orange-500' : 'bg-gray-50 border-gray-200 focus:border-orange-500'}`}
                               />
                               <p className="text-[10px] opacity-50">Overrides the default F.B/c consultant persona.</p>
                           </div>

                           <div className="pt-4 flex gap-4">
                               <button 
                                   onClick={saveSettings}
                                   className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                               >
                                   SAVE CHANGES
                               </button>
                               <button 
                                   onClick={clearCache}
                                   className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border ${isDarkMode ? 'border-red-500/30 text-red-400 hover:bg-red-950/30' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                               >
                                   CLEAR CACHE
                               </button>
                           </div>
                       </div>
                   </div>
               )}

               {/* JSON Modal */}
               {selectedLead && (
                   <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedLead(null)}>
                       <div className={`w-full max-w-2xl max-h-[80vh] rounded-2xl border overflow-hidden flex flex-col shadow-2xl ${isDarkMode ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                           <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                               <h3 className="font-bold">Lead JSON Data</h3>
                               <button onClick={() => setSelectedLead(null)} className="opacity-50 hover:opacity-100">Close</button>
                           </div>
                           <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                               <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-orange-400">
                                   {JSON.stringify(selectedLead, null, 2)}
                               </pre>
                           </div>
                       </div>
                   </div>
               )}

           </main>
       </div>
    </div>
  );
};

export default AdminDashboard;
