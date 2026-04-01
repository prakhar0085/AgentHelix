import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { TerminalSquare, Code2, TestTube2, GitPullRequest, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const iconConfig = {
  research: TerminalSquare,
  coding: Code2,
  testing: TestTube2,
  pr: GitPullRequest
};

function RealtimeCircle() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" className="realtime-circle">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" fill="none" />
      <circle 
        cx="12" cy="12" r="10" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        fill="none" 
        strokeDasharray="62.83" 
        strokeDashoffset="62.83"
        strokeLinecap="round"
        className="realtime-circle-fill" 
      />
    </svg>
  );
}

function AgentNode({ data }) {
  const IconComponent = iconConfig[data.type] || Code2;
  const state = data.state || 'idle';

  return (
    <div className={`infra-node agent-node-override`} data-state={state}>
      <Handle type="target" position={Position.Left} id="target" className="infra-handle" isConnectable={false} />

      <div className="infra-icon-wrapper agent-icon-box">
        {state === 'running' && <RealtimeCircle />}
        {state === 'success' && <CheckCircle2 size={36} />}
        {state === 'failed' && <XCircle size={36} />}
        {state === 'idle' && <IconComponent size={36} className="infra-icon" />}
      </div>

      <div className="agent-label">
        <div className="agent-title">{data.label}</div>
        <div className="agent-desc">{data.description}</div>
      </div>

      <Handle type="source" position={Position.Right} id="source" className="infra-handle" isConnectable={false} />
      
      {/* Invisible Handles just for loop routing physics so edges don't tangle */}
      <Handle type="target" position={Position.Top} id="target-top" style={{ visibility: 'hidden', padding: 0, border: 'none' }} />
      <Handle type="source" position={Position.Top} id="source-top" style={{ visibility: 'hidden', padding: 0, border: 'none' }} />
    </div>
  );
}

export default memo(AgentNode);
