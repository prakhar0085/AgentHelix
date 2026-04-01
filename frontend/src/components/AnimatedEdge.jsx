import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';

export const AnimatedEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isFailed = data?.status === 'failed';
  const isActive = data?.status === 'active';

  // Base path styling
  const pathStyle = {
    ...style,
    strokeWidth: 2,
    stroke: isFailed ? '#ef4444' : isActive ? '#3b82f6' : '#374151',
    transition: 'stroke 0.3s ease',
  };

  return (
    <>
      {/* Background track */}
      <BaseEdge path={edgePath} style={{ strokeWidth: 4, stroke: 'transparent' }} />
      {/* Visible line */}
      <BaseEdge path={edgePath} style={pathStyle} className={isActive || isFailed ? 'animate-pulse' : ''} />
      
      {/* Moving particles or dash array via CSS classes based on status */}
      <path
        d={edgePath}
        fill="none"
        stroke={isFailed ? '#fca5a5' : '#60a5fa'}
        strokeWidth={isActive || isFailed ? 2 : 0}
        strokeDasharray="5 15"
        className={isActive || isFailed ? (isFailed ? 'animate-[dash_1s_linear_infinite_reverse]' : 'animate-[dash_1s_linear_infinite]') : ''}
        style={{ opacity: isActive || isFailed ? 1 : 0 }}
      />
    </>
  );
});
