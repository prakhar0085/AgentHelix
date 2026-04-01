import { memo } from 'react';
import { BaseEdge, getSmoothStepPath } from 'reactflow';

export default memo(function InfraEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style, animated
}) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 16
  });

  // Fallback edge color
  const pathColor = style?.stroke || '#4f46e5';
  const isIdle = !animated && style?.stroke === '#3f3f46';
  
  // Choose animation class based on whether it needs to be reversed (if failed loop, we might want reverse, but standard forward is fine)
  // For the particle effect, if it's idle we can dim it
  const particleOpacity = isIdle ? 0.2 : 1;
  const animSpeed = isIdle ? '3s' : '1.5s';

  // Use a unique class or inline animation for speed changes
  const animStyle = {
    animation: `infraParticle ${animSpeed} linear infinite`,
    stroke: pathColor,
    strokeWidth: 3,
    strokeDasharray: '8 200',
    strokeLinecap: 'round',
    opacity: particleOpacity,
    transition: 'stroke 0.3s ease, opacity 0.3s ease'
  };

  return (
    <>
      <BaseEdge 
        id={`${id}-bg`}
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ strokeWidth: 3, stroke: '#505058' }} 
      />
      
      <BaseEdge 
        id={`${id}-anim`}
        path={edgePath} 
        style={animStyle} 
      />
    </>
  );
});
