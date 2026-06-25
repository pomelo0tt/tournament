import React, { useState, useEffect } from 'react';

// 🌐 MASTER DATABASE CONFIGURATION
const USE_CLOUD_DATABASE = true; 

// Drop your real Supabase credentials inside these quotation marks
const SUPABASE_URL = "https://clkasjxfifakbmnmaskm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xhrTQjJjCUYxZ7MURLLZwA_v983Oj79";

let supabase = null;
if (USE_CLOUD_DATABASE && !SUPABASE_URL.includes("your-project-url")) {
  import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then((mod) => {
    supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState('signup'); 
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  // Dynamic Content Matrices
  const [tournamentTitle, setTournamentTitle] = useState('Aeos Championship Series 2026');
  const [phases, setPhases] = useState([
    { id: 'p_default_1', name: "Phase 1: Swiss Qualifiers", format: "Swiss", bestOf: 3 },
    { id: 'p_default_2', name: "Phase 2: Championship Bracket", format: "Double Elimination", bestOf: 5 }
  ]);
  const [myTeam, setMyTeam] = useState(null); 
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // Dynamic Space Allocation Hooks
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [generatedKeyReveal, setGeneratedKeyReveal] = useState(null);

  // Phase Creator Form Hooks
  const [phaseFormName, setPhaseFormName] = useState('');
  const [phaseFormFormat, setPhaseFormFormat] = useState('Single Elimination');
  const [phaseFormBestOf, setPhaseFormBestOf] = useState(3);

  // Form Interaction Vectors
  const [newTeamName, setNewTeamName] = useState('');
  const [playerInputs, setPlayerInputs] = useState(['', '', '', '', '']);
  const [subInputs, setSubInputs] = useState(['', '', '']); 
  const [chatInput, setChatInput] = useState('');
  const [playerScore1, setPlayerScore1] = useState(0);
  const [playerScore2, setPlayerScore2] = useState(0);

  const MASTER_PASSWORD = "aeos2026";

  // ================= 🛰️ DATA INITIALIZATION =================
  useEffect(() => {
    const cachedTeam = localStorage.getItem('unite_user_team');
    if (cachedTeam) { try { setMyTeam(JSON.parse(cachedTeam)); } catch(e) {} }

    if (USE_CLOUD_DATABASE && supabase) {
      const fetchCloudData = async () => {
        const { data: t } = await supabase.from('teams').select('*');
        const { data: m } = await supabase.from('matches').select('*');
        const { data: msg } = await supabase.from('messages').select('*').order('id', { ascending: true });
        if (t) setTeams(t); if (m) setMatches(m); if (msg) setMessages(msg);
      };
      fetchCloudData();

      const channel = supabase.channel('cloud-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, p => {
          if (p.eventType === 'INSERT') setMatches(prev => [...prev, p.new]);
          if (p.eventType === 'UPDATE') setMatches(prev => prev.map(m => m.id === p.new.id ? p.new : m));
          if (p.eventType === 'DELETE') setMatches(prev => prev.filter(m => m.id !== p.old.id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, p => {
          if (p.eventType === 'INSERT') setTeams(prev => [...prev, p.new]);
          if (p.eventType === 'DELETE') setTeams(prev => prev.filter(t => t.id !== p.old.id));
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => setMessages(prev => [...prev, p.new]))
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else {
      const localTeams = localStorage.getItem('local_teams');
      const localMatches = localStorage.getItem('local_matches');
      const localMessages = localStorage.getItem('local_messages');
      const localTitle = localStorage.getItem('local_title');
      const localPhases = localStorage.getItem('local_phases');

      if (localTeams) setTeams(JSON.parse(localTeams));
      if (localMatches) setMatches(JSON.parse(localMatches));
      if (localMessages) setMessages(JSON.parse(localMessages));
      if (localTitle) setTournamentTitle(localTitle);
      if (localPhases) setPhases(JSON.parse(localPhases));

      const syncTabs = (e) => {
        if (e.key === 'local_teams' && e.newValue) setTeams(JSON.parse(e.newValue));
        if (e.key === 'local_matches' && e.newValue) setMatches(JSON.parse(e.newValue));
        if (e.key === 'local_messages' && e.newValue) setMessages(JSON.parse(e.newValue));
        if (e.key === 'local_title' && e.newValue) setTournamentTitle(e.newValue);
        if (e.key === 'local_phases' && e.newValue) setPhases(JSON.parse(e.newValue));
      };
      window.addEventListener('storage', syncTabs);
      return () => window.removeEventListener('storage', syncTabs);
    }
  }, []);

  const persistLocally = (key, dataArrayOrString) => {
    if (typeof dataArrayOrString === 'string') {
      localStorage.setItem(key, dataArrayOrString);
    } else {
      localStorage.setItem(key, JSON.stringify(dataArrayOrString));
    }
    window.dispatchEvent(new Event('storage'));
  };

  const getCurrentActiveMatch = () => {
    if (matches.length === 0) return null;
    const selected = matches.find(m => String(m.id) === String(selectedMatchId));
    if (selected) return selected;
    const autoFound = matches.find(m => myTeam && (m.team1 === myTeam.name || m.team2 === myTeam.name));
    if (autoFound) return autoFound;
    return matches[0];
  };

  // ================= 🔥 DYNAMIC OPERATIONS =================
  const handleRegisterTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim() || playerInputs.some(p => !p.trim())) return;

    const activeSubs = subInputs.filter(sub => sub.trim() !== '');
    const secureAccessKey = Math.random().toString(36).substring(2, 8).toUpperCase();

    const teamPayload = { 
      id: 't_' + Date.now(), 
      name: newTeamName, 
      players: [...playerInputs],
      subs: activeSubs, 
      accessKey: secureAccessKey 
    };

    if (USE_CLOUD_DATABASE && supabase) {
      const { data } = await supabase.from('teams').insert([ { name: newTeamName, players: [...playerInputs], subs: activeSubs, accessKey: secureAccessKey } ]).select();
      if (data && data[0]) {
        setMyTeam(data[0]);
        localStorage.setItem('unite_user_team', JSON.stringify(data[0]));
      }
    } else {
      const updatedTeams = [...teams, teamPayload];
      setTeams(updatedTeams);
      setMyTeam(teamPayload);
      localStorage.setItem('unite_user_team', JSON.stringify(teamPayload));
      persistLocally('local_teams', updatedTeams);
    }

    setGeneratedKeyReveal({ name: newTeamName, key: secureAccessKey });
    setNewTeamName('');
    setPlayerInputs(['', '', '', '', '']);
    setSubInputs(['', '', '']);
  };

  const handleSendMessage = async (currentMatchId) => {
    if (!chatInput.trim() || !myTeam || !currentMatchId) return;

    const msgPayload = { 
      matchId: String(currentMatchId), 
      sender: myTeam.name, 
      text: chatInput, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };

    if (USE_CLOUD_DATABASE && supabase) {
      await supabase.from('messages').insert([msgPayload]);
    } else {
      const updatedMsg = [...messages, msgPayload];
      setMessages(updatedMsg);
      persistLocally('local_messages', updatedMsg);
    }
    setChatInput('');
  };

  const handlePlayerSubmitScore = async (matchId) => {
    if (USE_CLOUD_DATABASE && supabase) {
      await supabase.from('matches').update({ score1: playerScore1, score2: playerScore2, status: "Completed" }).eq('id', matchId);
    } else {
      const updatedMatches = matches.map(m => m.id === matchId ? { ...m, score1: playerScore1, score2: playerScore2, status: "Completed" } : m);
      setMatches(updatedMatches);
      persistLocally('local_matches', updatedMatches);
    }
    alert("Score count pipeline broadcast complete!");
  };

  const handleSecureClaimIdentity = (teamObj) => {
    const userInputCode = window.prompt(`🔒 SECURITY CHECK: Enter the 6-character Access Key for "${teamObj.name}" to link this profile to your device:`);
    if (userInputCode === null) return;
    
    if (userInputCode.trim().toUpperCase() === teamObj.accessKey.toUpperCase()) {
      setMyTeam(teamObj);
      localStorage.setItem('unite_user_team', JSON.stringify(teamObj));
      alert(`✅ ACCESS GRANTED: Device linked successfully.`);
    } else {
      alert("❌ ACCESS DENIED: Invalid Security Access Key.");
    }
  };

  const handleRoutingToMatchroom = (matchId) => {
    setSelectedMatchId(matchId); 
    setActiveTab('matchroom');   
  };

  // ================= 🛡️ ADMIN ACTIONS =================
  const handleAdminTitleEdit = (newTitle) => {
    setTournamentTitle(newTitle);
    persistLocally('local_title', newTitle);
  };

  const handleAdminScoreEdit = (matchId, s1, s2) => {
    const score1Val = parseInt(s1) || 0;
    const score2Val = parseInt(s2) || 0;
    const updated = matches.map(match => match.id === matchId ? { ...match, score1: score1Val, score2: score2Val, status: "Completed" } : match);
    setMatches(updated); 
    persistLocally('local_matches', updated);
    if (USE_CLOUD_DATABASE && supabase) {
      supabase.from('matches').update({ score1: score1Val, score2: score2Val, status: "Completed" }).eq('id', matchId);
    }
  };

  // Phase Matrix Manipulation Handlers
  const handleAdminAddPhase = (e) => {
    e.preventDefault();
    if (!phaseFormName.trim()) return;

    const newPhase = {
      id: 'p_' + Date.now(),
      name: phaseFormName,
      format: phaseFormFormat,
      bestOf: parseInt(phaseFormBestOf)
    };

    const updatedPhases = [...phases, newPhase];
    setPhases(updatedPhases);
    persistLocally('local_phases', updatedPhases);
    
    setPhaseFormName('');
    alert(`🆕 Custom Stage: "${newPhase.name}" added to layout configurations!`);
  };

  const handleAdminDeletePhase = (phaseId) => {
    if (!window.confirm("Are you sure you want to delete this phase? All matches generated inside it will be removed.")) return;
    
    const updatedPhases = phases.filter(p => p.id !== phaseId);
    setPhases(updatedPhases);
    persistLocally('local_phases', updatedPhases);

    // Wipe out dependent matches from the viewports
    if (USE_CLOUD_DATABASE && supabase) {
      supabase.from('matches').delete().eq('status', phaseId); // Storing phase reference mapping token safely
    } else {
      const updatedMatches = matches.filter(m => m.statusLabel !== phaseId);
      setMatches(updatedMatches);
      persistLocally('local_matches', updatedMatches);
    }
  };

  const adminCompileFormations = async (phaseObj) => {
    if (teams.length < 2) { alert("Insufficient parameters. Enlist at least 2 teams."); return; }

    const generatedMatches = [];
    for (let i = 0; i < teams.length; i += 2) {
      if (teams[i] && teams[i + 1]) {
        generatedMatches.push({ 
          team1: teams[i].name, 
          team2: teams[i + 1].name, 
          score1: 0, 
          score2: 0, 
          status: "Ongoing",
          statusLabel: phaseObj.id // Ties the match to this precise custom phase identifier token
        });
      } else if (teams[i]) {
        generatedMatches.push({ 
          team1: teams[i].name, 
          team2: "BYE SLOTS", 
          score1: 1, 
          score2: 0, 
          status: "Completed",
          statusLabel: phaseObj.id
        });
      }
    }

    if (USE_CLOUD_DATABASE && supabase) {
      await supabase.from('matches').delete().eq('statusLabel', phaseObj.id);
      const { error } = await supabase.from('matches').insert(generatedMatches);
      if (error) alert("Error connecting to cloud database: " + error.message);
    } else {
      let matchCounter = 101;
      const timedMatches = generatedMatches.map((m, idx) => ({ ...m, id: 'm_' + (matchCounter++ + matches.length + idx) }));
      const updatedMatches = [...matches.filter(m => m.statusLabel !== phaseObj.id), ...timedMatches];
      setMatches(updatedMatches);
      persistLocally('local_matches', updatedMatches);
    }
    alert(`⚡ Pairings built for [ ${phaseObj.name} ] using ${phaseObj.format} (BO${phaseObj.bestOf}) settings!`);
  };

  const adminClearAll = async () => {
    if (window.confirm("🚨 Perform factory hard wipe sequence? This clears all entries completely.")) {
      if (USE_CLOUD_DATABASE && supabase) {
        await supabase.from('matches').delete().neq('id', 0);
        await supabase.from('teams').delete().neq('id', 0);
        await supabase.from('messages').delete().neq('id', 0);
      }
      localStorage.clear();
      setTeams([]); setMatches([]); setMessages([]); setMyTeam(null); setGeneratedKeyReveal(null); setSelectedMatchId(null);
      setTournamentTitle('Aeos Championship Series 2026');
      setPhases([
        { id: 'p_default_1', name: "Phase 1: Swiss Qualifiers", format: "Swiss", bestOf: 3 },
        { id: 'p_default_2', name: "Phase 2: Championship Bracket", format: "Double Elimination", bestOf: 5 }
      ]);
      alert("Database wiped clean.");
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passwordInput === MASTER_PASSWORD) { setIsAdminAuthenticated(true); setPasswordInput(''); } 
    else { alert("❌ INVALID DEPLOYMENT PASSWORD KEY."); setPasswordInput(''); }
  };

  return (
    <div className="min-h-screen bg-[#0c0f12] text-[#f3f4f6] font-sans antialiased">
      <header className="border-b border-[#202631] bg-[#13171e] px-6 py-3 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <span className={`font-mono text-xs tracking-widest font-black px-2 py-1 rounded-sm text-white transition-all ${USE_CLOUD_DATABASE ? 'bg-green-600' : 'bg-amber-600'}`}>
            {USE_CLOUD_DATABASE ? 'CLOUD-LIVE' : 'LOCAL-LIVE'}
          </span>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white">{tournamentTitle}</h1>
            <p className="text-[10px] font-mono text-[#9ca3af]">
              {myTeam ? `👑 TEAM SQUAD: ${myTeam.name}` : "👀 SYSTEM VIEW: SPECTATOR"}
            </p>
          </div>
        </div>
        <div className="flex border border-[#202631] bg-[#0c0f12] p-0.5 rounded gap-1">
          {['signup', 'bracket', 'matchroom', 'admin'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-[#202631] text-white' : 'text-[#9ca3af]'}`}>
              {tab === 'signup' ? 'Registration' : tab === 'bracket' ? 'Brackets' : tab === 'matchroom' ? 'Match Room' : '🛠️ Admin'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* SECURITY BANNER CONTAINER */}
        {generatedKeyReveal && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">🛡️ Secure Team Roster Created</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Give this unique access key to your team players so they can link their profile handles: </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[#0c0f12] border border-emerald-500/40 font-mono text-md font-black tracking-widest text-white px-4 py-2 rounded">
                {generatedKeyReveal.key}
              </div>
              <button onClick={() => setGeneratedKeyReveal(null)} className="text-xs text-gray-500 hover:text-white uppercase font-bold tracking-wider font-mono">Dismiss</button>
            </div>
          </div>
        )}

        {/* TAB 1: REGISTRATION */}
        {activeTab === 'signup' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="bg-[#13171e] border border-[#202631] p-5 rounded space-y-4">
              <form onSubmit={handleRegisterTeam} className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#0072ef]">Roster Enlistment</h2>
                <div>
                  <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider mb-1">Team Identity Name</label>
                  <input type="text" required placeholder="Team Name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="w-full bg-[#0c0f12] border border-[#202631] rounded px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Core Starting Lineup (5 Players)</label>
                  {playerInputs.map((player, idx) => (
                    <input key={idx} type="text" required placeholder={idx === 0 ? "Captain Name (Active)" : `Player ${idx + 1} (Active)`} value={player} onChange={(e) => { const updated = [...playerInputs]; updated[idx] = e.target.value; setPlayerInputs(updated); }} className="w-full bg-[#0c0f12] border border-[#202631] rounded px-3 py-1.5 text-xs text-white focus:outline-none" />
                  ))}
                </div>
                <div className="space-y-1.5 pt-3 border-t border-[#202631]">
                  <label className="block text-[10px] font-bold text-[#e28743] uppercase tracking-wider">Substitutes (Optional - Max 3)</label>
                  {subInputs.map((sub, idx) => (
                    <input key={idx} type="text" placeholder={`Backup Sub Player ${idx + 1}`} value={sub} onChange={(e) => { const updated = [...subInputs]; updated[idx] = e.target.value; setSubInputs(updated); }} className="w-full bg-[#0c0f12] border border-[#202631] rounded px-3 py-1.5 text-xs text-white focus:outline-none border-dashed" />
                  ))}
                </div>
                <button type="submit" className="w-full bg-[#0072ef] hover:bg-[#0061cb] text-white font-bold py-2 text-xs uppercase rounded transition">Register Entire Roster</button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#13171e] border border-[#202631] rounded overflow-hidden">
              <div className="p-4 bg-[#191f29] border-b border-[#202631] text-xs font-bold uppercase tracking-wider text-white">Cloud Master Roster Ledgers ({teams.length})</div>
              <div className="divide-y divide-[#202631]">
                {teams.length === 0 && <div className="p-8 text-xs text-[#9ca3af] italic text-center">Zero registry entries active. Create a team above to populate data.</div>}
                {teams.map((t) => (
                  <div key={t.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0c0f12]/10">
                    <div className="space-y-1">
                      <span className="font-bold text-sm block text-white">{t.name}</span>
                      <div className="text-[10px] text-gray-400 font-mono flex flex-wrap gap-1 items-center">
                        <span className="text-purple-400">Core:</span>
                        {t.players?.map((p, i) => <span key={i} className="bg-[#13171e] px-1 rounded text-gray-300">{p}</span>)}
                      </div>
                      {t.subs && t.subs.length > 0 && (
                        <div className="text-[10px] text-gray-400 font-mono flex flex-wrap gap-1 items-center">
                          <span className="text-orange-400">Subs:</span>
                          {t.subs.map((subName, sIdx) => <span key={sIdx} className="bg-[#191e24] px-1 rounded text-[#9ca3af] italic border border-[#202631]">{subName}</span>)}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleSecureClaimIdentity(t)} className={`text-[10px] font-mono font-bold px-2 py-1 rounded border transition ${myTeam?.name === t.name ? 'bg-[#0072ef]/20 text-[#0072ef] border-[#0072ef]/40' : 'bg-transparent text-gray-400 border-[#202631]'}`}>
                      {myTeam?.name === t.name ? 'Connected' : '🔒 Link Device'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE BRACKETS */}
        {activeTab === 'bracket' && (
          <div className="space-y-10">
            {matches.length === 0 && (
              <div className="p-12 border border-[#202631] bg-[#13171e] rounded text-center text-xs text-[#9ca3af] italic">
                Awaiting tournament layout configuration. Enter Admin Panel to generate structural rounds.
              </div>
            )}

            {/* ADAPTIVE LOOP: Pulls custom phase nodes dynamically */}
            {phases.map((phase) => {
              const stageMatches = matches.filter(m => m.statusLabel === phase.id);
              if (stageMatches.length === 0) return null;

              return (
                <div key={phase.id} className="space-y-4 animate-fadeIn">
                  <div className="bg-[#13171e] border border-[#202631] p-4 rounded text-xs font-bold uppercase tracking-wider text-purple-400 flex justify-between items-center">
                    <span>{phase.name}</span>
                    <span className="bg-[#0c0f12] text-[10px] px-2 py-0.5 rounded text-gray-400 font-mono">
                      {phase.format} • Best of {phase.bestOf}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stageMatches.map((match) => (
                      <div key={match.id} className="bg-[#13171e] border border-[#202631] rounded flex flex-col justify-between hover:border-[#3b4556] transition">
                        <div className="divide-y divide-[#202631]">
                          <div className="flex justify-between items-center p-3 text-xs">
                            <span className={match.status === "Completed" && match.score1 > match.score2 ? "text-green-400 font-bold" : "text-white"}>{match.team1}</span>
                            <span className="bg-[#0c0f12] border px-2 py-0.5 font-mono font-bold">{match.score1}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 text-xs">
                            <span className={match.status === "Completed" && match.score2 > match.score1 ? "text-green-400 font-bold" : "text-white"}>{match.team2}</span>
                            <span className="bg-[#0c0f12] border px-2 py-0.5 font-mono font-bold">{match.score2}</span>
                          </div>
                        </div>
                        <div className="bg-[#0c0f12] p-2 border-t border-[#202631] text-[10px] flex justify-between">
                          <span className="text-gray-500 font-mono">Status: {match.status}</span>
                          <button onClick={() => handleRoutingToMatchroom(match.id)} className="text-[#0072ef] font-bold hover:underline">Enter Room →</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: MATCH ROOM */}
        {activeTab === 'matchroom' && (
          <div>
            {matches.length === 0 ? <div className="p-12 bg-[#13171e] border border-[#202631] rounded text-center text-xs text-[#9ca3af] italic">No active match nodes.</div> : (() => {
              const currentMatch = getCurrentActiveMatch();
              if (!currentMatch) return null;
              
              const parentPhase = phases.find(p => p.id === currentMatch.statusLabel);
              const authorizedUser = myTeam && (myTeam.name === currentMatch.team1 || myTeam.name === currentMatch.team2);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-[#13171e] border border-[#202631] rounded flex flex-col h-[520px]">
                    <div className="bg-[#191f29] p-3 text-xs font-bold border-b border-[#202631]">
                      <span className="text-white block">Real-Time Match Chat Comms</span>
                      <span className="text-[10px] font-mono text-[#9ca3af]">
                        {currentMatch.team1} vs {currentMatch.team2} 
                        <span className="text-purple-400 ml-1">({parentPhase ? parentPhase.name : 'Active Phase'})</span>
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0c0f12]/50 text-xs font-mono">
                      {messages.filter(msg => String(msg.matchId) === String(currentMatch.id)).map((msg, idx) => (
                        <div key={idx} className="border-l border-[#202631] pl-2 py-0.5">
                          <span className="text-blue-400 font-bold">{msg.sender}: </span>
                          <span className="text-gray-300">{msg.text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-[#191f29] border-t border-[#202631] flex gap-2">
                      <input type="text" disabled={!authorizedUser} placeholder={authorizedUser ? "Exchange room handles or passwords here..." : "🔒 Spectator lock. Read-only view."} value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(currentMatch.id)} className="flex-1 bg-[#0c0f12] text-xs p-2 rounded text-white border border-[#202631] focus:outline-none" />
                      <button disabled={!authorizedUser} onClick={() => handleSendMessage(currentMatch.id)} className="bg-[#0072ef] text-white text-xs font-bold px-4 rounded disabled:bg-gray-800">Send</button>
                    </div>
                  </div>

                  <div className="bg-[#13171e] border border-[#202631] p-5 rounded space-y-4">
                    <h3 className="text-xs font-bold uppercase text-white">Report Scores</h3>
                    {authorizedUser ? (
                      <>
                        <div className="flex justify-between items-center bg-[#0c0f12] p-2 rounded border border-[#202631] font-mono text-xs">
                          <span className="truncate max-w-[150px]">{currentMatch.team1}</span>
                          <input type="number" value={playerScore1} onChange={(e) => setPlayerScore1(parseInt(e.target.value) || 0)} className="w-12 bg-[#13171e] border border-[#202631] text-center text-white text-xs p-1" />
                        </div>
                        <div className="flex justify-between items-center bg-[#0c0f12] p-2 rounded border border-[#202631] font-mono text-xs">
                          <span className="truncate max-w-[150px]">{currentMatch.team2}</span>
                          <input type="number" value={playerScore2} onChange={(e) => setPlayerScore2(parseInt(e.target.value) || 0)} className="w-12 bg-[#13171e] border border-[#202631] text-center text-white text-xs p-1" />
                        </div>
                        <button onClick={() => handlePlayerSubmitScore(currentMatch.id)} className="w-full bg-[#22c55e] text-white py-2 rounded text-xs uppercase font-bold transition">Log Match Scores</button>
                      </>
                    ) : (
                      <div className="bg-[#0c0f12] border border-[#202631] rounded p-4 text-center text-xs text-[#9ca3af] italic">🔒 Entry denied. Reporting requires player roster authorization codes.</div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 4: ADMIN */}
        {activeTab === 'admin' && (
          <div>
            {!isAdminAuthenticated ? (
              <form onSubmit={handleAdminLogin} className="max-w-md mx-auto bg-[#13171e] border border-[#202631] p-6 rounded space-y-4 shadow-2xl">
                <h2 className="text-xs font-bold uppercase text-amber-500 text-center tracking-widest">Verify Secure Root Key</h2>
                <input type="password" placeholder="••••••••" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full bg-[#0c0f12] text-center border p-2 text-xs text-white focus:outline-none focus:border-amber-500 tracking-widest" />
                <button type="submit" className="w-full bg-amber-600 text-slate-950 font-black py-2 rounded text-xs uppercase">Unlock Systems</button>
              </form>
            ) : (
              <div className="bg-[#13171e] border border-[#202631] rounded p-5 space-y-6">
                <div className="flex justify-between border-b border-[#202631] pb-3 items-center">
                  <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Master Operations Terminal</h3>
                  <button onClick={() => setIsAdminAuthenticated(false)} className="text-red-400 text-xs hover:underline font-mono">Lock Admin Node</button>
                </div>
                
                {/* DYNAMIC TITLE CONTROLLER */}
                <div className="p-4 bg-[#0c0f12] border border-[#202631] rounded space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tournament Branding Title</label>
                  <input type="text" value={tournamentTitle} onChange={(e) => handleAdminTitleEdit(e.target.value)} className="w-full max-w-xl bg-[#13171e] border border-[#202631] rounded px-3 py-2 text-xs text-white font-bold focus:outline-none" />
                </div>

                {/* 🆕 LIVE CUSTOM PHASE MANAGER BUILDER */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start border border-[#202631] p-4 rounded bg-[#0c0f12]">
                  
                  {/* Submodule A: Creation Inputs Panel */}
                  <form onSubmit={handleAdminAddPhase} className="space-y-3 lg:border-r lg:border-[#202631] lg:pr-6">
                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wide">➕ Construct Custom Phase</h4>
                    
                    <div>
                      <label className="block text-[9px] text-gray-400 uppercase mb-1">Stage Name Label</label>
                      <input type="text" required placeholder="e.g., Phase 3: Top 8 Final Grid" value={phaseFormName} onChange={(e) => setPhaseFormName(e.target.value)} className="w-full bg-[#13171e] border border-[#202631] text-xs px-2.5 py-1.5 rounded text-white focus:outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-gray-400 uppercase mb-1">Bracket Structure</label>
                        <select value={phaseFormFormat} onChange={(e) => setPhaseFormFormat(e.target.value)} className="w-full bg-[#13171e] border border-[#202631] text-xs p-1.5 rounded text-white focus:outline-none">
                          <option value="Single Elimination">Single Elimination</option>
                          <option value="Double Elimination">Double Elimination</option>
                          <option value="Swiss">Swiss</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-400 uppercase mb-1">Match Metrics</label>
                        <select value={phaseFormBestOf} onChange={(e) => setPhaseFormBestOf(e.target.value)} className="w-full bg-[#13171e] border border-[#202631] text-xs p-1.5 rounded text-white focus:outline-none">
                          <option value={1}>Best of 1</option>
                          <option value={3}>Best of 3</option>
                          <option value={5}>Best of 5</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="w-full bg-[#0072ef] text-white text-xs font-bold py-1.5 rounded font-mono uppercase tracking-wide transition">
                      Build Phase Node
                    </button>
                  </form>

                  {/* Submodule B: Interactive Operational Stage Ledger */}
                  <div className="lg:col-span-2 space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">📐 Active Blueprint Layouts Matrix</h4>
                    <div className="divide-y divide-[#202631] max-h-48 overflow-y-auto pr-2">
                      {phases.map((phase) => (
                        <div key={phase.id} className="py-2.5 flex justify-between items-center text-xs font-mono">
                          <div>
                            <span className="text-white font-sans font-bold block">{phase.name}</span>
                            <span className="text-[10px] text-gray-500">{phase.format} • BO{phase.bestOf} format configuration</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => adminCompileFormations(phase)} className="bg-emerald-950 text-emerald-400 border border-emerald-900 hover:bg-emerald-900 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition">
                              ⚡ Pair Matchups
                            </button>
                            <button onClick={() => handleAdminDeletePhase(phase.id)} className="bg-red-950 text-red-400 border border-red-900 hover:bg-red-900 hover:text-white px-2 py-1 rounded text-[10px] font-bold transition">
                              ✕ Drop
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={adminClearAll} className="bg-red-950 border border-red-900 text-red-400 text-xs font-bold px-4 py-2 rounded hover:bg-red-900 transition font-mono">
                    🚨 Wipe Cloud Cluster Ledgers
                  </button>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-[#202631]">
                  <h4 className="text-xs font-bold uppercase text-gray-400">Direct Bracket Match Overrider</h4>
                  {matches.length === 0 && <p className="text-xs italic text-gray-600">No generated matches found to override.</p>}
                  {matches.map((m) => {
                    const matchPhase = phases.find(p => p.id === m.statusLabel);
                    return (
                      <div key={m.id} className="p-3 bg-[#0c0f12] rounded border border-[#202631] flex justify-between items-center text-xs font-mono">
                        <span className="truncate max-w-xs">{m.team1} vs {m.team2} <span className="text-purple-500 text-[10px]">({matchPhase ? matchPhase.name.split(':')[0] : 'P1'})</span></span>
                        <div className="flex gap-2">
                          <input type="number" value={m.score1} onChange={(e) => handleAdminScoreEdit(m.id, e.target.value, m.score2)} className="w-12 bg-[#13171e] text-center py-0.5 border text-white focus:outline-none focus:border-[#0072ef]" />
                          <input type="number" value={m.score2} onChange={(e) => handleAdminScoreEdit(m.id, m.score1, e.target.value)} className="w-12 bg-[#13171e] text-center py-0.5 border text-white focus:outline-none focus:border-[#0072ef]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}