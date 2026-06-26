import React from 'react';
import type { TrajectoryPoint } from '../types';

interface TrajectoryPlotProps {
  data: TrajectoryPoint[];
  targetDistance: number; // in meters
}

export const TrajectoryPlot: React.FC<TrajectoryPlotProps> = ({ data, targetDistance }) => {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 rounded-md">
        <p className="text-gray-500 text-sm">Calcule una solución de tiro para ver la trayectoria.</p>
      </div>
    );
  }

  const padding = 40;
  const svgWidth = 400;
  const svgHeight = 200;

  const maxX = Math.max(targetDistance, ...data.map(p => p.x));
  const maxY = Math.max(...data.map(p => p.y));

  const xScale = (svgWidth - 2 * padding) / maxX;
  const yScale = (svgHeight - 2 * padding) / maxY;

  const pathData = data
    .map((p, i) => {
      const x = padding + p.x * xScale;
      const y = svgHeight - padding - p.y * yScale;
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    })
    .join(' ');

  const gridLines = [];
  // Y-axis grid lines (altitude)
  for (let i = 1; i <= 4; i++) {
    const y = svgHeight - padding - (i * maxY / 4) * yScale;
    gridLines.push(
      <g key={`y-grid-${i}`}>
        <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#4b5563" strokeWidth="0.5" />
        <text x={padding - 5} y={y + 3} fill="#9ca3af" fontSize="8" textAnchor="end">
          {((i * maxY) / 4 / 1000).toFixed(1)}km
        </text>
      </g>
    );
  }
  // X-axis grid lines (distance)
  for (let i = 1; i <= 4; i++) {
    const x = padding + (i * maxX / 4) * xScale;
    gridLines.push(
      <g key={`x-grid-${i}`}>
        <line x1={x} y1={padding} x2={x} y2={svgHeight - padding} stroke="#4b5563" strokeWidth="0.5" />
         <text x={x} y={svgHeight - padding + 15} fill="#9ca3af" fontSize="8" textAnchor="middle">
          {((i * maxX) / 4 / 1000).toFixed(1)}km
        </text>
      </g>
    );
  }
  
  const targetX = padding + targetDistance * xScale;


  return (
    <div className="w-full h-full bg-gray-900 p-2 rounded-md">
       <h5 className="text-center text-sm font-semibold text-gray-300 mb-1">Perfil de Trayectoria</h5>
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={svgHeight - padding} stroke="#6b7280" strokeWidth="1" />
        <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#6b7280" strokeWidth="1" />
        <text x={padding-10} y={padding-5} fill="#9ca3af" fontSize="9">Alt.</text>
        <text x={svgWidth-padding+5} y={svgHeight-padding+5} fill="#9ca3af" fontSize="9">Dist.</text>


        {/* Grid Lines */}
        {gridLines}
        
        {/* Origin Label */}
         <text x={padding} y={svgHeight - padding + 15} fill="#9ca3af" fontSize="8" textAnchor="middle">0km</text>

        {/* Target Line */}
         <line x1={targetX} y1={padding} x2={targetX} y2={svgHeight-padding+5} stroke="#f87171" strokeWidth="1" strokeDasharray="2,2" />
          <text x={targetX} y={padding-5} fill="#f87171" fontSize="9" textAnchor="middle">Blanco</text>


        {/* Trajectory Path */}
        <path d={pathData} fill="none" stroke="#60a5fa" strokeWidth="2" />
        
        {/* Apex Point */}
        <circle cx={padding + (data[50]?.x || 0) * xScale} cy={svgHeight - padding - (data[50]?.y || 0) * yScale} r="2" fill="#a78bfa" />
        <text 
            x={padding + (data[50]?.x || 0) * xScale} 
            y={svgHeight - padding - (data[50]?.y || 0) * yScale - 5}
            fill="#a78bfa" fontSize="8" textAnchor="middle"
        >
            Ápice: {(maxY / 1000).toFixed(2)} km
        </text>

      </svg>
    </div>
  );
};
