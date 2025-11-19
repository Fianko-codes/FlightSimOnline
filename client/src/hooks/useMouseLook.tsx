import { useEffect, useRef } from "react";
import { useGame } from "@/lib/stores/useGame";

interface MouseLookState {
  isLocked: boolean;
  sensitivity: number;
}

const DEFAULT_SENSITIVITY = 0.002;

export function useMouseLook(
  onMouseMove: (deltaX: number, deltaY: number) => void,
  enabled: boolean = true
) {
  const { phase } = useGame();
  const isLockedRef = useRef(false);
  const sensitivityRef = useRef(DEFAULT_SENSITIVITY);

  useEffect(() => {
    if (!enabled || phase !== "playing") {
      // Release pointer lock if we're not playing
      if (isLockedRef.current && document.pointerLockElement) {
        document.exitPointerLock();
      }
      return;
    }

    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const handlePointerLockChange = () => {
      isLockedRef.current = document.pointerLockElement === canvas;
      
      // Hide cursor when locked
      if (isLockedRef.current) {
        document.body.style.cursor = "none";
      } else {
        document.body.style.cursor = "default";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isLockedRef.current) return;
      
      const deltaX = e.movementX * sensitivityRef.current;
      const deltaY = e.movementY * sensitivityRef.current;
      
      onMouseMove(deltaX, deltaY);
    };

    const handleClick = () => {
      if (phase === "playing" && !isLockedRef.current) {
        canvas.requestPointerLock();
      }
    };

    // Request pointer lock on click
    canvas.addEventListener("click", handleClick);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousemove", handleMouseMove);

    // Cleanup
    return () => {
      canvas.removeEventListener("click", handleClick);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("mousemove", handleMouseMove);
      document.body.style.cursor = "default";
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    };
  }, [enabled, phase, onMouseMove]);

  return {
    isLocked: isLockedRef.current,
    setSensitivity: (sensitivity: number) => {
      sensitivityRef.current = sensitivity;
    },
  };
}

