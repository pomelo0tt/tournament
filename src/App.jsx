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

  // ================= 📊 LIVE REAL-TIME RANKING LOGIC =================
  const calculateLiveRankings = () => {
    return teams.map((team) => {
      let matchesPlayed = 0;
      let wins = 0;
      let losses = 0;
      let totalPointsScored = 0;

      matches.forEach((m) => {
        if (m.status === 'Completed') {
          if (m.team1 === team.name) {
            matchesPlayed++;
            totalPointsScored += m.score1;
            if (m.score1 > m.score2) wins++;
            else losses++;
          } else if (m.team2 === team.name) {
            matchesPlayed++;
            totalPointsScored += m.score2;
            if (m.score2 > m.score1) wins++;
            else losses++;
          }
        }
      });

      const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0;

      return {
        ...team,
        played: matchesPlayed,
        wins,
        losses,
        points: totalPointsScored,
        winRate
      };
    }).sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.points - a.points);
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
    if (!chatInput.trim() ||