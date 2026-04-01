import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, { Background, Controls, applyNodeChanges, applyEdgeChanges, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { X, TerminalSquare, Code2, Play, History, User, Lock, ArrowRight, Github, Sparkles, Eye, EyeOff } from 'lucide-react';
import AgentNode from './components/AgentNode';
import InfraEdge from './components/InfraEdge';
import './styles/design-system.css';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CustomMarkdown = ({ content }) => {
  if (!content) return null;
  return (
    <ReactMarkdown
      components={{
        h1: ({node, ...props}) => <h1 style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '1rem', marginBottom: '0.5rem'}} {...props} />,
        h2: ({node, ...props}) => <h2 style={{fontSize: '1.1rem', fontWeight: '600', color: '#e5e7eb', marginTop: '1rem', marginBottom: '0.5rem'}} {...props} />,
        p: ({node, ...props}) => <p style={{lineHeight: '1.6', marginBottom: '0.75rem', color: '#d1d5db'}} {...props} />,
        ul: ({node, ...props}) => <ul style={{listStyleType: 'disc', paddingLeft: '1.5rem', marginBottom: '0.75rem', color: '#d1d5db'}} {...props} />,
        ol: ({node, ...props}) => <ol style={{listStyleType: 'decimal', paddingLeft: '1.5rem', marginBottom: '0.75rem', color: '#d1d5db'}} {...props} />,
        code({node, inline, className, children, ...props}) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag="div"
              customStyle={{ background: '#111', padding: '1rem', borderRadius: '6px', fontSize: '13px', border: '1px solid #333', marginTop: '5px', marginBottom: '1rem' }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props} style={{ background: '#3a3a3a', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace', color: '#a78bfa' }}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

const AuthScreen = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isRegister) {
        if (!githubToken) { setIsLoading(false); return setError('GitHub Token is required'); }
        const res = await fetch('http://localhost:8000/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, github_token: githubToken })
        });
        if (!res.ok) {
           const errData = await res.json();
           setIsLoading(false);
           return setError(errData.detail || "Registration failed");
        }
        setIsRegister(false);
        setIsLoading(false);
        alert("Account Created! You can now log in.");
      } else {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        const res = await fetch('http://localhost:8000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });
        if (!res.ok) {
           setIsLoading(false);
           return setError("Invalid credentials");
        }
        const data = await res.json();
        localStorage.setItem('agenthelix_token', data.access_token);
        onLogin(data.access_token);
        setIsLoading(false);
      }
    } catch (err) {
      setIsLoading(false);
      setError("Network error connecting to API");
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
      background: '#050505',
      backgroundImage: 'radial-gradient(circle at center, #1a1a1a 1px, transparent 1px)',
      backgroundSize: '24px 24px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
       <div style={{
          background: '#0a0a0c',
          padding: '2rem 2rem', border: '1px solid #222224', borderRadius: '12px',
          width: '340px', 
          display: 'flex', flexDirection: 'column', 
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,1) inset'
       }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
            <div style={{background: '#ffffff', padding: '5px', borderRadius: '6px'}}>
               <TerminalSquare color="#000000" size={18} strokeWidth={2.5} />
            </div>
            <span className="helix-logo" style={{fontSize: '18px'}}>AgentHelix</span>
          </div>
          
          <h2 style={{color: '#ffffff', fontSize: '22px', fontWeight: '700', marginBottom: '0.6rem', letterSpacing: '-0.04em', lineHeight: '1.2'}}>
            Access Your <br/> AI Agent Workspace
          </h2>
          {!isRegister && (
            <div className="streaming-subtext" style={{margin: '0 0 1.5rem 0', width: 'auto'}}>
              Autonomous AI Code Orchestration powered <br/> by multi-agent systems.
            </div>
          )}
          
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px',
              color: '#f87171', boxSizing: 'border-box',
              padding: '10px 12px', marginBottom: '1.25rem', fontSize: '13px', fontWeight: '500', width: '100%', 
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <X size={15} color="#f87171" strokeWidth={2.5} /> <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%'}}>
             <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                <label style={{color: '#888888', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Username</label>
                <div style={{position: 'relative'}}>
                  <User size={16} color="#52525b" style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)'}} />
                  <input 
                    type="text" required value={username} onChange={e => setUsername(e.target.value)} 
                    placeholder="Enter your username"
                    disabled={isLoading}
                    style={{
                      width: '100%', boxSizing: 'border-box', background: '#0f0f12', border: '1px solid #27272a', 
                      color: '#ffffff', padding: '10px 12px 10px 36px', fontSize: '13px', outline: 'none', borderRadius: '6px',
                      transition: 'border-color 0.15s, background-color 0.15s',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                    }} 
                    onFocus={e => { e.target.style.borderColor = '#555555'; e.target.style.backgroundColor = '#131316'; }}
                    onBlur={e => { e.target.style.borderColor = '#27272a'; e.target.style.backgroundColor = '#0f0f12'; }}
                  />
                </div>
             </div>
             
             <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                <label style={{color: '#888888', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Password</label>
                <div style={{position: 'relative'}}>
                  <Lock size={16} color="#52525b" style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)'}} />
                  <input 
                    type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} 
                    placeholder="Enter your password"
                    disabled={isLoading}
                    style={{
                      width: '100%', boxSizing: 'border-box', background: '#0f0f12', border: '1px solid #27272a', 
                      color: '#ffffff', padding: '10px 12px 10px 36px', fontSize: '13px', outline: 'none', borderRadius: '6px',
                      transition: 'border-color 0.15s, background-color 0.15s',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                    }} 
                    onFocus={e => { e.target.style.borderColor = '#555555'; e.target.style.backgroundColor = '#131316'; }}
                    onBlur={e => { e.target.style.borderColor = '#27272a'; e.target.style.backgroundColor = '#0f0f12'; }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#52525b', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px'
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
             </div>
             
             {isRegister && (
               <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                  <label style={{color: '#888888', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em'}}>GitHub Token</label>
                  <input 
                    type="password" required value={githubToken} onChange={e => setGithubToken(e.target.value)} 
                    disabled={isLoading}
                    style={{
                      width: '100%', boxSizing: 'border-box', background: '#0f0f12', border: '1px solid #27272a', 
                      color: '#ffffff', padding: '10px 12px', fontSize: '13px', outline: 'none', borderRadius: '6px',
                      transition: 'border-color 0.15s, background-color 0.15s', fontFamily: 'monospace',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
                    }} 
                    onFocus={e => { e.target.style.borderColor = '#555555'; e.target.style.backgroundColor = '#131316'; }}
                    onBlur={e => { e.target.style.borderColor = '#27272a'; e.target.style.backgroundColor = '#0f0f12'; }}
                  />
               </div>
             )}
             
             <button type="submit" disabled={isLoading} style={{
                marginTop: '0.5rem', width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: isLoading ? '#27272a' : '#ededed', color: isLoading ? '#a1a1aa' : '#09090b', border: 'none', borderRadius: '6px',
                fontSize: '13px', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'background-color 0.1s, transform 0.1s'
             }}
             onMouseOver={e => !isLoading && (e.currentTarget.style.background = '#ffffff')}
             onMouseOut={e => !isLoading && (e.currentTarget.style.background = '#ededed')}
             onMouseDown={e => !isLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
             onMouseUp={e => !isLoading && (e.currentTarget.style.transform = 'scale(1)')}
             >
                {isLoading ? (isRegister ? 'Registering...' : 'Signing in...') : (isRegister ? 'Register' : 'Sign In')}
             </button>
          </form>

          <div style={{marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.6}}>
             <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '600', color: '#a78bfa'}}>
               <Sparkles size={11} /> <span>Powered by Multi-Agent AI</span>
             </div>
             <div style={{fontSize: '10px', color: '#71717a'}}>
                Built for Developers. Driven by Automation.
             </div>
          </div>

          <div style={{marginTop: '1.5rem', fontSize: '12px', color: '#52525b', borderTop: '1px solid #1f1f22', paddingTop: '1.5rem', textAlign: 'center'}}>
             {isRegister ? 'Already have an account? ' : "Don't have an account? "}
             <button 
                onClick={() => { setIsRegister(!isRegister); setError(''); setUsername(''); setPassword(''); }} 
                disabled={isLoading}
                style={{
                  background: 'none', border: 'none', color: '#ededed', fontWeight: '500', 
                  cursor: isLoading ? 'not-allowed' : 'pointer', padding: '0', display: 'inline-block',
                }}
                onMouseOver={e => !isLoading && (e.target.style.textDecoration = 'underline')}
                onMouseOut={e => !isLoading && (e.target.style.textDecoration = 'none')}
             >
               {isRegister ? 'Sign in' : 'Sign up'}
             </button>
          </div>
       </div>
    </div>
  );
};

const nodeTypes = { agent: AgentNode };
const edgeTypes = { infra: InfraEdge };

const styleIdle = { stroke: '#3f3f46', strokeWidth: 2 };

const initialNodes = [
  { id: '1', type: 'agent', position: { x: 100, y: 150 }, data: { label: 'Research Agent', type: 'research', description: 'Analyzes GitHub issue & codebase', state: 'idle' } },
  { id: '2a', type: 'agent', position: { x: 450, y: 50 }, data: { label: 'Coding Agent Alpha', type: 'coding', description: 'Conservative fix', state: 'idle' } },
  { id: '2b', type: 'agent', position: { x: 450, y: 250 }, data: { label: 'Coding Agent Beta', type: 'coding', description: 'Creative fix', state: 'idle' } },
  { id: '2j', type: 'agent', position: { x: 800, y: 150 }, data: { label: 'Judge Agent', type: 'judge', description: 'Evaluates candidates', state: 'idle' } },
  { id: '3', type: 'agent', position: { x: 1150, y: 150 }, data: { label: 'Testing Agent', type: 'testing', description: 'Validates in sandbox', state: 'idle' } },
  { id: '4', type: 'agent', position: { x: 1500, y: 150 }, data: { label: 'PR Agent', type: 'pr', description: 'Creates pull request', state: 'idle' } },
];

const initialEdges = [
  { id: 'e1-2a', source: '1', target: '2a', type: 'infra', sourceHandle: 'source', targetHandle: 'target', style: styleIdle, animated: false, markerEnd: { type: MarkerType.ArrowClosed, color: '#505058' } },
  { id: 'e1-2b', source: '1', target: '2b', type: 'infra', sourceHandle: 'source', targetHandle: 'target', style: styleIdle, animated: false, markerEnd: { type: MarkerType.ArrowClosed, color: '#505058' } },
  { id: 'e2a-2j', source: '2a', target: '2j', type: 'infra', sourceHandle: 'source', targetHandle: 'target', style: styleIdle, animated: false, markerEnd: { type: MarkerType.ArrowClosed, color: '#505058' } },
  { id: 'e2b-2j', source: '2b', target: '2j', type: 'infra', sourceHandle: 'source', targetHandle: 'target', style: styleIdle, animated: false, markerEnd: { type: MarkerType.ArrowClosed, color: '#505058' } },
  { id: 'e2j-3', source: '2j', target: '3', type: 'infra', sourceHandle: 'source', targetHandle: 'target', style: styleIdle, animated: false, markerEnd: { type: MarkerType.ArrowClosed, color: '#505058' } },
  { id: 'e3-4', source: '3', target: '4', type: 'infra', sourceHandle: 'source', targetHandle: 'target', style: styleIdle, animated: false, markerEnd: { type: MarkerType.ArrowClosed, color: '#505058' } },
  { id: 'e3-2a-loop', source: '3', target: '2a', type: 'infra', sourceHandle: 'source-top', targetHandle: 'target-top', style: styleIdle, animated: false, markerEnd: { type: MarkerType.ArrowClosed, color: '#505058' } },
  { id: 'e3-2b-loop', source: '3', target: '2b', type: 'infra', sourceHandle: 'source-bottom', targetHandle: 'target-bottom', style: styleIdle, animated: false, markerEnd: { type: MarkerType.ArrowClosed, color: '#505058' } }
];

export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const [key, setKey] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const startTimeRef = useRef(null);

  // Live timer
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now() - elapsedTime * 1000;
      intervalRef.current = setInterval(() => {
        setElapsedTime(((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying]);

  const onNodesChange = useCallback((chs) => setNodes((nds) => applyNodeChanges(chs, nds)), []);
  const onEdgesChange = useCallback((chs) => setEdges((eds) => applyEdgeChanges(chs, eds)), []);

  const updateNodeState = (id, state) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, state } } : n)));
    if (state === 'success') setSuccessCount(c => c + 1);
  };

  const updateEdgeState = (id, status) => {
    const styleActive  = { stroke: '#eab308', strokeWidth: 3 };
    const styleSuccess = { stroke: '#10b981', strokeWidth: 2 };
    const styleFailed  = { stroke: '#ef4444', strokeWidth: 3 };

    setEdges((eds) => eds.map((e) => {
      if (e.id === id) {
        let nStyle = styleIdle;
        let cStyle = '#505058';
        if (status === 'active') { nStyle = styleActive; cStyle = '#eab308'; }
        if (status === 'success') { nStyle = styleSuccess; cStyle = '#10b981'; }
        if (status === 'failed') { nStyle = styleFailed; cStyle = '#ef4444'; }
        
        return { 
          ...e, 
          style: nStyle, 
          animated: status === 'active' || status === 'failed',
          markerEnd: { type: MarkerType.ArrowClosed, color: cStyle }
        };
      }
      return e;
    }));
  };

  const [selectedNode, setSelectedNode] = useState(null);
  const [globalLogs, setGlobalLogs] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historyRuns, setHistoryRuns] = useState([]);
  const [authToken, setAuthToken] = useState(localStorage.getItem('agenthelix_token'));

  useEffect(() => {
    if (isSidebarOpen && authToken) {
       fetch('http://localhost:8000/runs', {
           headers: { 'Authorization': `Bearer ${authToken}` }
       })
         .then(res => {
            if (res.status === 401) throw new Error("Unauthorized");
            return res.json();
         })
         .then(data => setHistoryRuns(data))
         .catch(e => {
            console.error(e);
            if(e.message === "Unauthorized") {
                localStorage.removeItem('agenthelix_token');
                setAuthToken(null);
            }
         });
    }
  }, [isSidebarOpen, authToken]);

  const loadHistoricalRun = async (runId) => {
    try {
      const res = await fetch(`http://localhost:8000/runs/${runId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error("Run not found");
      const run = await res.json();
      resetSimulation();
      const nodeMap = { 'research': '1', 'coder_alpha': '2a', 'coder_beta': '2b', 'judge': '2j', 'test': '3', 'create_pr': '4', 'max_retries': '3' };
      const snaps = run.state_snapshots || {};
      const newLogs = {};
      let sc = 0;
      Object.entries(snaps).forEach(([nodeName, nodeState]) => {
         const nodeId = nodeMap[nodeName];
         if (nodeId) newLogs[nodeId] = nodeState;
      });
      setGlobalLogs(newLogs);
      
      let failedNode = null;
      if (run.status === 'failed') {
         const lastNodeName = Object.keys(snaps).pop();
         failedNode = nodeMap[lastNodeName] || '3'; 
      }
      
      setNodes((nds) => nds.map((n) => {
         const logs = newLogs[n.id];
         let state = 'idle';
         if (logs) state = 'success';
         if (n.id === failedNode) state = 'failed';
         if (state === 'success') sc++;
         return { ...n, data: { ...n.data, state, logs } };
      }));
      setSuccessCount(sc);
      
      setEdges((eds) => eds.map((e) => {
         const tgtNodeLogs = newLogs[e.target];
         if (tgtNodeLogs) {
             return { ...e, style: { stroke: '#10b981', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' } };
         }
         if (e.target === failedNode) {
             return { ...e, animated: true, style: { stroke: '#ef4444', strokeWidth: 3 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' } };
         }
         return e;
      }));
      setIsSidebarOpen(false);
    } catch (e) {
      console.error(e);
      alert('Fail to load historical run');
    }
  };

  const updateNodeData = (id, stateData) => {
    setGlobalLogs((prev) => ({ ...prev, [id]: stateData }));
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, logs: stateData } } : n)));
  };

  const startLiveExecution = (repoUrl, issueNumber) => {
    resetSimulation();
    setIsPlaying(true);
    
    const nodeMap = {
      'research': '1',
      'coder_alpha': '2a',
      'coder_beta': '2b',
      'judge': '2j',
      'test': '3',
      'create_pr': '4',
      'max_retries': '3' 
    };

    updateNodeState('1', 'running');

    const eventSource = new EventSource(`http://localhost:8000/stream?repo_url=${encodeURIComponent(repoUrl)}&issue_number=${issueNumber}&token=${authToken}`);

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data);
      
      if (data.event === 'start') {
        updateNodeState('1', 'running');
      } 
      else if (data.event === 'node_complete') {
        const completedNodeId = nodeMap[data.node];
        
        if (completedNodeId && data.state_data) {
           updateNodeData(completedNodeId, data.state_data);
        }
        
        if (data.error || data.node === 'max_retries') {
            if (completedNodeId) updateNodeState(completedNodeId, 'failed');
            if (data.node === 'max_retries' || data.node === 'test') {
               updateNodeState('3', 'failed');
               updateEdgeState('e3-2a-loop', 'failed');
               updateEdgeState('e3-2b-loop', 'failed');
            }
            setIsPlaying(false);
            eventSource.close();
            return;
        }

        if (completedNodeId) updateNodeState(completedNodeId, 'success');

        if (data.node === 'research') {
           updateEdgeState('e1-2a', 'active');
           updateEdgeState('e1-2b', 'active');
           setTimeout(() => { updateEdgeState('e1-2a', 'success'); updateEdgeState('e1-2b', 'success'); updateNodeState('2a', 'running'); updateNodeState('2b', 'running'); }, 1000);
        } else if (data.node === 'coder_alpha') {
           updateEdgeState('e3-2a-loop', 'idle'); 
           updateEdgeState('e2a-2j', 'active');
           setTimeout(() => { updateEdgeState('e2a-2j', 'success'); updateNodeState('2j', 'running'); }, 1000);
        } else if (data.node === 'coder_beta') {
           updateEdgeState('e3-2b-loop', 'idle'); 
           updateEdgeState('e2b-2j', 'active');
           setTimeout(() => { updateEdgeState('e2b-2j', 'success'); updateNodeState('2j', 'running'); }, 1000);
        } else if (data.node === 'judge') {
           updateEdgeState('e2j-3', 'active');
           setTimeout(() => { updateEdgeState('e2j-3', 'success'); updateNodeState('3', 'running'); }, 1000);
        } else if (data.node === 'test') {
           if (data.tests_passed) {
               updateEdgeState('e3-4', 'active');
               setTimeout(() => { updateEdgeState('e3-4', 'success'); updateNodeState('4', 'running'); }, 1000);
           } else {
               updateNodeState('3', 'failed');
               updateEdgeState('e3-2a-loop', 'failed');
               updateEdgeState('e3-2b-loop', 'failed');
               setTimeout(() => {
                  updateNodeState('3', 'idle');
                  updateEdgeState('e3-2a-loop', 'idle');
                  updateEdgeState('e3-2b-loop', 'idle');
                  updateNodeState('2a', 'running'); 
                  updateNodeState('2b', 'running'); 
               }, 1500);
           }
        } else if (data.node === 'create_pr') {
           setIsPlaying(false);
           eventSource.close();
        }
      } 
      else if (data.event === 'finished') {
        setIsPlaying(false);
        eventSource.close();
      } 
      else if (data.event === 'error') {
        setIsPlaying(false);
        eventSource.close();
        alert(`Backend Error: ${data.message}`);
      }
    };
    
    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setIsPlaying(false);
      eventSource.close();
    };
  };

  const resetSimulation = () => {
    setIsPlaying(false);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setGlobalLogs({});
    setSelectedNode(null);
    setElapsedTime(0);
    setSuccessCount(0);
    setKey(k => k + 1);
  };

  if (!authToken) {
      return <AuthScreen onLogin={setAuthToken} />;
  }

  const statusLabel = isPlaying ? 'Running' : (successCount === initialNodes.length ? 'Complete' : (elapsedTime > 0 ? 'Stopped' : 'Idle'));
  const statusColor = isPlaying ? '#eab308' : (successCount === initialNodes.length ? '#10b981' : (elapsedTime > 0 ? '#ef4444' : '#71717a'));
  const successRate = elapsedTime > 0 ? Math.round((successCount / initialNodes.length) * 100) : 0;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <header className="app-header">
        <div className="logo-text" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <button onClick={() => setIsSidebarOpen(true)} className="btn" style={{background: 'transparent', border: '1px solid #333', borderRadius: '4px', color: '#fff', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
             <History size={18} />
          </button>
          <span className="helix-logo" style={{fontSize: '16px'}}>AgentHelix</span> NodeViz
          <button onClick={() => { localStorage.removeItem('agenthelix_token'); setAuthToken(null); }} style={{marginLeft: '15px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', padding: '4px 8px', fontSize: '11px', cursor: 'pointer'}}>
             Logout
          </button>
        </div>

        {/* Mini Status Dashboard */}
        <div className="status-dashboard">
          <div className="stat-pill">
            <span className="stat-label">Nodes</span>
            <span className="stat-value">{initialNodes.length}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="stat-label">Time</span>
            <span className="stat-value">{elapsedTime.toFixed(1)}s</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="stat-label">Success</span>
            <span className="stat-value">{successRate}%</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="stat-label">Status</span>
            <span className="stat-value stat-status" style={{ color: statusColor }}>
              {isPlaying && <span className="status-dot" style={{ background: statusColor }} />}
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="controls-container">
          <input type="text" id="repoUrl" placeholder="GitHub Repo URL" defaultValue="https://github.com/prakhar0085/test-ai-fix" className="glass-input" style={{ width: '280px' }} />
          <input type="number" id="issueNum" placeholder="Issue #" defaultValue={1} className="glass-input" style={{ width: '70px' }} />
          <button className="btn btn-primary" onClick={() => {
            const r = document.getElementById('repoUrl').value;
            const i = document.getElementById('issueNum').value;
            startLiveExecution(r, i);
          }} disabled={isPlaying}>
            {isPlaying ? 'Running Orchestration...' : 'Start Execution'}
          </button>
        </div>
      </header>
      
      <ReactFlow
        key={key}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => setSelectedNode(node)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={{ x: 60, y: 200, zoom: 0.72 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
           variant="dots" 
           gap={20} 
           size={1.5} 
           color="#555555" 
           style={{ backgroundColor: 'var(--bg-color)' }} 
        />
        <Controls style={{ background: '#1c1c1c', border: '1px solid #444', borderRadius: '4px' }} />
      </ReactFlow>

      {/* Slide-out Log Drawer */}
      <div className={`log-drawer ${selectedNode ? 'open' : ''}`}>
        <div className="drawer-header">
           <h2 className="drawer-title">{selectedNode?.data?.label || 'Logs & Data'}</h2>
           <button className="close-btn" onClick={() => setSelectedNode(null)}>
             <X size={20} />
           </button>
        </div>
        <div className="drawer-content">
           {!selectedNode?.data?.logs ? (
             <div className="empty-logs">No execution data available for this node yet.</div>
           ) : (
             <div className="structured-logs">
               {(selectedNode.data.type === 'research' && selectedNode.data.logs.issue_title) && (
                 <div className="log-panel">
                   <div className="log-panel-header">🚨 Original Error / Issue</div>
                   <div className="log-panel-body markdown-text">
                     <strong style={{fontSize: '15px', color: '#fff'}}>{selectedNode.data.logs.issue_title}</strong>
                     <p>{selectedNode.data.logs.issue_body}</p>
                   </div>
                 </div>
               )}

               {(selectedNode.data.type === 'research' && selectedNode.data.logs.analysis) && (
                 <div className="log-panel">
                   <div className="log-panel-header">🧠 AI Diagnosis & Reasoning</div>
                   <div className="log-panel-body markdown-content">
                     <CustomMarkdown content={selectedNode.data.logs.analysis} />
                   </div>
                 </div>
               )}

               {(selectedNode.data.type === 'coding' && selectedNode.data.logs.candidates?.length > 0) && (
                 <div className="log-panel">
                   <div className="log-panel-header">💡 AI Candidate Proposal</div>
                   <div className="log-panel-body markdown-content">
                     <CustomMarkdown content={
                       selectedNode.data.logs.candidates.find(c => c.agent_name === (selectedNode.id === '2a' ? 'coder_alpha' : 'coder_beta'))?.patch || "*(Waiting...)*"
                     } />
                   </div>
                 </div>
               )}

               {(selectedNode.data.type === 'judge') && (
                 <div className="log-panel">
                   <div className="log-panel-header">⚖️ Judge Evaluation & Selection</div>
                   <div className="log-panel-body markdown-content">
                     <div style={{marginBottom: '1rem'}}>
                       <CustomMarkdown content={selectedNode.data.logs.judge_reasoning} />
                     </div>
                     {selectedNode.data.logs.modified_files?.length > 0 && (
                        <div className="modified-files-text" style={{marginBottom: '0.5rem', background: '#1c1c1c', padding: '8px', borderRadius: '4px', border: '1px solid #333', color: '#10b981'}}>
                          <strong>Winning Patch Files Modified:</strong> {selectedNode.data.logs.modified_files.join(", ")}
                        </div>
                     )}
                     <CustomMarkdown content={selectedNode.data.logs.patch} />
                   </div>
                 </div>
               )}

               {(selectedNode.data.type === 'testing' && selectedNode.data.logs.test_results) && (
                 <div className="log-panel">
                   <div className="log-panel-header">🧪 Sandbox Test Execution</div>
                   <div className="log-panel-body">
                     {selectedNode.data.logs.tests_passed ? (
                       <div className="status-badge passed">✓ All tests passed successfully</div>
                     ) : (
                       <div className="status-badge failed">✗ Tests failed (Attempt {selectedNode.data.logs.retry_count || 1}) - AI will retry</div>
                     )}
                     <pre className="console-block">{selectedNode.data.logs.test_results}</pre>
                   </div>
                 </div>
               )}

               {selectedNode.data.logs.error && (
                 <div className="log-panel error-panel">
                   <div className="log-panel-header error-header">⚠️ Fatal System Error</div>
                   <div className="log-panel-body">
                     <pre className="console-block error-text">{selectedNode.data.logs.error}</pre>
                   </div>
                 </div>
               )}

               {(selectedNode.data.type === 'pr' && selectedNode.data.logs.pr_url) && (
                 <div className="log-panel">
                   <div className="log-panel-header">🚀 Pull Request Deployed</div>
                   <div className="log-panel-body">
                     <a href={selectedNode.data.logs.pr_url} target="_blank" rel="noreferrer" className="pr-link">{selectedNode.data.logs.pr_url}</a>
                     <p className="branch-text" style={{marginTop: '8px'}}>Branch: <code>{selectedNode.data.logs.branch_name}</code></p>
                   </div>
                 </div>
               )}
               
               {(!selectedNode.data.logs.analysis && !selectedNode.data.logs.patch && !selectedNode.data.logs.test_results && !selectedNode.data.logs.pr_url && !selectedNode.data.logs.error && !selectedNode.data.logs.issue_title) && (
                  <pre className="log-code">{JSON.stringify(selectedNode.data.logs, null, 2)}</pre>
               )}
             </div>
           )}
        </div>
      </div>

      {/* Slide-out History Sidebar */}
      <div className={`log-drawer ${isSidebarOpen ? 'open' : ''}`} style={{left: 0, right: 'auto', borderLeft: 'none', borderRight: '1px solid #222', transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)', boxShadow: '5px 0 25px rgba(0,0,0,0.5)', zIndex: 100}}>
        <div className="drawer-header">
           <h2 className="drawer-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <History size={18} /> Persistent History
           </h2>
           <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>
             <X size={20} />
           </button>
        </div>
        <div className="drawer-content" style={{padding: '16px'}}>
          {historyRuns.length === 0 ? (
             <div className="empty-logs">No historic runs found in database.</div>
          ) : (
             <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
               {historyRuns.map(r => (
                  <div key={r.id} onClick={() => loadHistoricalRun(r.id)} style={{background: '#121212', padding: '14px', border: '1px solid #333', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px'}}>
                     <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{color: '#fff', fontWeight: 'bold', fontSize: '14px'}}>Run #{r.id}</span>
                        <span style={{color: r.status === 'completed' ? '#10b981' : (r.status === 'failed' ? '#ef4444' : '#eab308'), fontSize: '12px', fontWeight: '600', textTransform: 'uppercase'}}>{r.status}</span>
                     </div>
                     <div style={{fontSize: '13px', color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: '500'}}>
                        {r.issue_title || `GitHub Issue #${r.issue_number}`}
                     </div>
                     <div style={{fontSize: '11px', color: '#71717a'}}>
                        {new Date(r.created_at).toLocaleString()}
                     </div>
                  </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
