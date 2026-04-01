export default function Timeline({ nodes }) {
  // Sort or just map nodes to a timeline view
  return (
    <div className="flex flex-row items-center gap-4 py-2 px-6 overflow-x-auto border-b border-dark-700 bg-dark-900/50 backdrop-blur-md">
      {nodes.filter(n => ['research', 'coding', 'testing', 'pr'].includes(n.data.type)).map((node, i, arr) => {
        const state = node.data.state;
        const colorClass = 
          state === 'success' ? 'text-green-400' :
          state === 'running' ? 'text-blue-400' :
          state === 'failed'  ? 'text-red-400' : 'text-gray-500';

        const bgClass =
          state === 'success' ? 'bg-green-400/10 border-green-400/30' :
          state === 'running' ? 'bg-blue-400/10 border-blue-400/30' :
          state === 'failed'  ? 'bg-red-400/10 border-red-400/30' : 'bg-dark-700 border-dark-600';

        return (
          <div key={node.id} className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 ${bgClass} ${colorClass}`}>
              Step {i + 1}: {node.data.label}
              {state === 'success' && ' ✅'}
              {state === 'running' && ' ⏳'}
              {state === 'failed' && ' ❌'}
            </div>
            {i !== arr.length - 1 && (
              <div className="w-8 h-px bg-dark-600"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
