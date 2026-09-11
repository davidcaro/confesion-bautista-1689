"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

export default function SmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;

    const update = () => {
      lenis?.destroy();
      lenis = reducedMotion.matches ? null : new Lenis({
        autoRaf: true,
        anchors: { offset: -84 },
        allowNestedScroll: true,
        lerp: 0.11,
        smoothWheel: true,
      });
    };

    update();
    reducedMotion.addEventListener("change", update);
    return () => {
      reducedMotion.removeEventListener("change", update);
      lenis?.destroy();
    };
  }, []);

  return null;
}
