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
  null, // 0 — hidden
  "/mascot/f1.png", // 1
  "/mascot/f2.png", // 2
  "/mascot/f3.png", // 3
  "/mascot/f4.png", // 4
  "/mascot/f5.png", // 5
  "/mascot/f6.png", // 6
  "/mascot/f7.png", // 7
  "/mascot/f8.png", // 8
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

  // Blink loop when idle (alternates f1 ↔ f2 every ~3.5-5.5s)
  const startBlinkLoop = () => {
    blinkTimer.current = setTimeout(
      () => {
        setFrame(2); // close eyes
        blinkTimer.current = setTimeout(() => {
          setFrame(1); // open eyes
          startBlinkLoop();
        }, 220);
      },
      3500 + Math.random() * 2000,
    );
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

    // Immediately active on mount with zero padded delay
    setVisible(true);
    goIdle();

    const onScrollEnd = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      velocity.current = 0;
      goIdle();
    };

    const onScroll = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;
        lastScrollY.current = currentY;

        // Velocity tracking
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

        // Minimal 50ms debounce fallback for instantaneous snap on scroll stop
        idleTimer.current = setTimeout(() => {
          onScrollEnd();
        }, 50);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
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
        // Pin strictly flush against the right edge of any mobile screen
        right: 0,
        bottom: "calc(5.2rem + env(safe-area-inset-bottom, 0px))",
        height: 86,
        width: 90,
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
              right: 0,
              bottom: 0,
              height: "100%",
              width: "auto",
              objectFit: "contain",
              objectPosition: "right bottom",
              // Show only the active frame — GPU composited, no layout shift
              opacity: frame === fi ? 1 : 0,
              transition: "opacity 40ms linear",
            }}
          />
        );
      })}
    </div>
  );
}
