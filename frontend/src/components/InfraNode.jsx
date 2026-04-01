import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Globe, Server, Activity, Database } from 'lucide-react';

const iconMap = {
  client: Globe,
  api: Server,
  cache: Activity,
  db: Database
};

function InfraNode({ data }) {
  const Icon = iconMap[data.icon] || Server;

  return (
    <div className="infra-node">
      <Handle type="target" position={Position.Left} className="infra-handle" isConnectable={false} />
      
      <div className="infra-icon-wrapper">
        <Icon size={30} strokeWidth={1.5} className="infra-icon" />
      </div>
      
      <div className="infra-label">{data.label}</div>

      <Handle type="source" position={Position.Right} className="infra-handle" isConnectable={false} />
    </div>
  );
}

export default memo(InfraNode);
