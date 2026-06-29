const TICK_LENGTH = 6;

interface DimensionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  dashed?: boolean;
  color?: string;
}

// A line with perpendicular end-ticks and a labeled midpoint, matching standard
// elevation-drawing dimension lines. Only ever used with an axis-aligned span
// (y1 === y2 for a horizontal measurement, x1 === x2 for a vertical one) — a
// dimension line measures a straight horizontal or vertical distance by definition,
// never a diagonal one.
export function DimensionLine({ x1, y1, x2, y2, label, dashed = false, color = "#52525b" }: DimensionLineProps) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const isHorizontal = y1 === y2;
  // Approximate monospace-ish width estimate — fine for the short, mostly-numeric
  // labels this renders (e.g. "4.00m wall"); not a general text-measurement solution.
  const labelWidth = label.length * 7 + 8;

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
      <rect x={midX - labelWidth / 2} y={midY - 8} width={labelWidth} height={16} fill="white" stroke="none" />
      <text x={midX} y={midY + 4} textAnchor="middle" fontSize={11} fill={color} stroke="none">
        {label}
      </text>
    </g>
  );
}
