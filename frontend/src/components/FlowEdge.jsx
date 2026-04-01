import { memo } from 'react';
import { BaseEdge, getBezierPath } from 'reactflow';

export default memo(function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  const state = data?.status || 'idle';
  
  let mainColor = '#3f3f46';
  let glowColor = 'transparent';
  let animateClass = '';
  
  if (state === 'active') {
    mainColor = '#eab308'; // Premium Yellow
    glowColor = 'rgba(234, 179, 8, 0.5)';
    animateClass = 'svg-flow-active';
  } else if (state === 'success') {
    mainColor = '#22c55e'; // Premium Green
    glowColor = 'rgba(34, 197, 94, 0.4)';
  } else if (state === 'failed') {
    mainColor = '#ef4444'; // Premium Red
    glowColor = 'rgba(239, 68, 68, 0.6)';
    animateClass = 'svg-flow-failed';
  }

  return (
    <>
      {/* Background glow layer */}
      <BaseEdge 
        path={edgePath} 
        style={{ 
          strokeWidth: 10, 
          stroke: glowColor, 
          filter: state !== 'idle' ? 'blur(6px)' : 'none', 
          transition: 'all 0.4s ease' 
        }} 
      />
      {/* Primary sharp edge */}
      <BaseEdge 
        path={edgePath} 
        className={animateClass} 
        style={{ 
          strokeWidth: 3, 
          stroke: mainColor, 
          transition: 'all 0.4s ease' 
        }} 
      />
      
      {/* Moving internal energy particle (simulated by dashed offset) */}
      {(state === 'active' || state === 'failed') && (
        <BaseEdge 
          path={edgePath} 
          className={state === 'active' ? 'svg-flow-particle' : 'svg-flow-particle-reverse'} 
          style={{ 
            strokeWidth: 3, 
            stroke: '#ffffff'
          }} 
        />
      )}
    </>
  );
});
