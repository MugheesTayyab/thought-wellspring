import React, { useId } from "react";

interface HearthBurstProps {
  originX?: number; // percentage or px
  originY?: number;
}

const PARTICLES = [
  { size: 5, driftX: -26, delay: 0 },
  { size: 4, driftX: 18, delay: 0.04 },
  { size: 6, driftX: -8, delay: 0.08 },
  { size: 3, driftX: 32, delay: 0.02 },
  { size: 5, driftX: -38, delay: 0.06 },
  { size: 4, driftX: 6, delay: 0.1 },
  { size: 3, driftX: -16, delay: 0.05 },
];

export const HearthBurst: React.FC<HearthBurstProps> = ({ originX = 50, originY = 85 }) => {
  const idPrefix = useId();

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <span
          key={`${idPrefix}-${i}`}
          className="hearth-ember"
          style={{
            left: `${originX}%`,
            top: `${originY}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            // @ts-expect-error custom css variable
            "--drift-x": `${p.driftX}px`,
          }}
        />
      ))}
    </div>
  );
};
