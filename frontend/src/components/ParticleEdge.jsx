import { memo } from 'react';
import { BaseEdge, getSmoothStepPath } from 'reactflow';

export default memo(function DottedEdge({
  sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data
}) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 20
  });

  const isActive = data?.status === 'active';
  const isFailed = data?.status === 'failed';
  const isSuccess = data?.status === 'success';

  let pathColor = '#555555'; 
  
  if (isSuccess) pathColor = '#22c55e'; // Green when successful
  if (isFailed) pathColor = '#ef4444';  // Red when looped back/failed
  if (isActive) pathColor = '#eab308';  // Yellow when currently running

  // If active or failed, we animate the dots to simulate flow
  // "reverse-dots" makes it travel backward for the failure loop
  const animateClass = isActive ? 'moving-dots' : isFailed ? 'reverse-dots' : '';

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        className={animateClass}
        style={{ 
          strokeWidth: 4, 
          stroke: pathColor, 
          strokeLinecap: 'round',
          strokeDasharray: '1 12', // Creates genuine spherical dot-dot-dots!
          transition: 'stroke 0.4s ease' 
        }} 
      />
    </>
  );
});
