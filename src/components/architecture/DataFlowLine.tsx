import { motion } from 'framer-motion';

interface DataFlowLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  animated?: boolean;
  color?: string;
  label?: string;
  delay?: number;
}

export function DataFlowLine({
  from,
  to,
  animated = true,
  color = 'hsl(var(--primary))',
  label,
  delay = 0,
}: DataFlowLineProps) {
  // Calculate control points for curved lines
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  
  // Curve offset perpendicular to the line
  const curveOffset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.2;
  const controlX = midX + (dy > 0 ? curveOffset : -curveOffset);
  const controlY = midY + (dx > 0 ? -curveOffset : curveOffset);

  const pathD = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;

  return (
    <g>
      {/* Background line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeOpacity="0.2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay }}
      />
      
      {/* Animated flow line */}
      {animated && (
        <motion.path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="8 12"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay }}
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-20"
            dur="1s"
            repeatCount="indefinite"
          />
        </motion.path>
      )}
      
      {/* Arrow head */}
      <motion.circle
        cx={to.x}
        cy={to.y}
        r="4"
        fill={color}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: delay + 0.8 }}
      />
      
      {/* Label */}
      {label && (
        <motion.text
          x={midX}
          y={midY - 8}
          textAnchor="middle"
          fill="currentColor"
          className="text-[10px] fill-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.5 }}
        >
          {label}
        </motion.text>
      )}
    </g>
  );
}
