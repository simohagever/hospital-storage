const TICK_LENGTH = 6;

interface DimensionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  dashed?: boolean;
  color?: string;
  fontSize?: number;
}

// A line with perpendicular end-ticks and a labeled midpoint, matching standard
// elevation-drawing dimension lines. Only ever used with an axis-aligned span
// (y1 === y2 for a horizontal measurement, x1 === x2 for a vertical one) — a
// dimension line measures a straight horizontal or vertical distance by definition,
// never a diagonal one.
export function DimensionLine({ x1, y1, x2, y2, label, dashed = false, color = "#52525b", fontSize = 13 }: DimensionLineProps) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const isHorizontal = y1 === y2;
  const labelWidth = label.length * (fontSize * 0.62) + 10;

  return (
    <g stroke={color} strokeWidth={1} fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray={dashed ? "4 3" : undefined} />
      {isHorizontal ? (
        <>
          <line x1={x1} y1={y1 - TICK_LENGTH} x2={x1} y2={y1 + TICK_LENGTH} />
          <line x1={x2} y1={y2 - TICK_LENGTH} x2={x2} y2={y2 + TICK_LENGTH} />
        </>
      ) : (
        <>
          <line x1={x1 - TICK_LENGTH} y1={y1} x2={x1 + TICK_LENGTH} y2={y1} />
          <line x1={x2 - TICK_LENGTH} y1={y2} x2={x2 + TICK_LENGTH} y2={y2} />
        </>
      )}
      <rect x={midX - labelWidth / 2} y={midY - fontSize * 0.7} width={labelWidth} height={fontSize * 1.5} fill="white" stroke="none" />
      <text x={midX} y={midY + fontSize * 0.35} textAnchor="middle" fontSize={fontSize} fill={color} stroke="none">
        {label}
      </text>
    </g>
  );
}
