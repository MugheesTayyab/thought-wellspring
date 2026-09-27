import { useEffect, useRef, useState } from "react";

/**
 * Frame mapping:
 * 0  — hidden (off-canvas, nothing shown)
 * 1  — peek idle, eyes open          /mascot/f1.jpg
 * 2  — peek idle, blink              /mascot/f2.jpg
 * 3  — emerging, scroll down begins  /mascot/f3.jpg
 * 4  — emerging, scroll down mid     /mascot/f4.jpg
 * 5  — emerging, scroll down peak    /mascot/f5.jpg
 * 6  — reverse begins (scroll up)    /mascot/f6.jpg
 * 7  — reverse mid                   /mascot/f7.jpg
 * 8  — reverse peak                  /mascot/f8.jpg
 */

const FRAMES = [
  null,             // 0 — hidden
  "/mascot/f1.jpg", // 1
  "/mascot/f2.jpg", // 2
  "/mascot/f3.jpg", // 3
  "/mascot/f4.jpg", // 4
  "/mascot/f5.jpg", // 5
  "/mascot/f6.jpg", // 6
  "/mascot/f7.jpg", // 7
  "/mascot/f8.jpg", // 8
];

// Preload all frames the moment the component mounts
function preloadFrames() {
  FRAMES.forEach((src) => {
    if (src) {
      const img = new Image();
      img.src = src;
    }
  });
}

export function ScrollMascot() {
  const [frame, setFrame] = useState(1); // start at peek-idle
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const velocity = useRef(0);
  const rafId = useRef<number | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleFrame = useRef<1 | 2>(1);

  // Blink loop when idle (alternates f1 ↔ f2 every ~4s)
  const startBlinkLoop = () => {
    blinkTimer.current = setTimeout(() => {
      setFrame(2); // close eyes
      blinkTimer.current = setTimeout(() => {
        setFrame(1); // open eyes
        startBlinkLoop();
      }, 250);
    }, 3500 + Math.random() * 2000);
  };

  const stopBlinkLoop = () => {
    if (blinkTimer.current) {
      clearTimeout(blinkTimer.current);
      blinkTimer.current = null;
    }
  };

  const goIdle = () => {
    stopBlinkLoop();
    setFrame(1);
    startBlinkLoop();
  };

  useEffect(() => {
    // Respect prefers-reduced-motion: skip animation, show simple peek only
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setFrame(1);
      setVisible(true);
      return;
    }

    preloadFrames();
    lastScrollY.current = window.scrollY;

    // Brief delay before showing mascot so it doesn't flash on load
    const showTimer = setTimeout(() => {
      setVisible(true);
      goIdle();
    }, 1800);

    const onScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;
        lastScrollY.current = currentY;

        // Exponential smoothing of velocity
        velocity.current = velocity.current * 0.6 + delta * 0.4;
        const v = velocity.current;

        stopBlinkLoop();
        if (idleTimer.current) clearTimeout(idleTimer.current);

        if (v > 18) {
          setFrame(5); // peak forward
        } else if (v > 8) {
          setFrame(4); // mid forward
        } else if (v > 2) {
          setFrame(3); // begin forward
        } else if (v < -18) {
          setFrame(8); // peak reverse
        } else if (v < -8) {
          setFrame(7); // mid reverse
        } else if (v < -2) {
          setFrame(6); // begin reverse
        }

        // After 800ms of no scroll, return to idle
        idleTimer.current = setTimeout(() => {
          velocity.current = 0;
          goIdle();
        }, 800);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener("scroll", onScroll);
      stopBlinkLoop();
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const src = FRAMES[frame];

  if (!visible || !src) return null;

  return (
    <div
      className="mascot-root pointer-events-none fixed z-[25] select-none"
      aria-hidden="true"
      style={{
        // Pin to bottom-right, above bottom nav but below modals
        right: 0,
        bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
        width: 88,
        height: 88,
      }}
    >
      {FRAMES.slice(1).map((fsrc, i) => {
        const fi = i + 1;
        return (
          <img
            key={fi}
            src={fsrc!}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "right bottom",
              // Show only the active frame — GPU composited, no layout shift
              opacity: frame === fi ? 1 : 0,
              transition: "opacity 80ms linear",
              // Slight right-offset so body is half off-canvas — realistic edge peek
              transform: "translateX(22px)",
            }}
          />
        );
      })}
    </div>
  );
}
