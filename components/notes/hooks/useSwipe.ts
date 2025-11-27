import { useState, useRef, useCallback } from "react";

interface UseSwipeProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  limit?: number;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  limit = 140,
}: UseSwipeProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null
  );

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const swipeActiveRef = useRef(false);
  const didSwipeRef = useRef(false);

  const resetGesture = useCallback(() => {
    setIsDragging(false);
    setSwipeDirection(null);
    swipeActiveRef.current = false;
    pointerIdRef.current = null;
    setTranslateX(0);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse") {
        return;
      }

      startXRef.current = event.clientX;
      startYRef.current = event.clientY;
      pointerIdRef.current = event.pointerId;
      swipeActiveRef.current = false;
      didSwipeRef.current = false;
      setTranslateX(0);
      setIsDragging(true);
      setSwipeDirection(null);
    },
    []
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || pointerIdRef.current !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - startXRef.current;
      const deltaY = event.clientY - startYRef.current;

      if (!swipeActiveRef.current) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absY > absX && absY > 10) {
          resetGesture();
          return;
        }

        if (absX > 10 && absX > absY) {
          swipeActiveRef.current = true;
        } else {
          return;
        }
      }

      event.preventDefault();
      const clamped = Math.max(Math.min(deltaX, limit), -limit);
      setTranslateX(clamped);
      setSwipeDirection(clamped > 0 ? "right" : clamped < 0 ? "left" : null);
    },
    [isDragging, limit, resetGesture]
  );

  const handlePointerEnd = useCallback(() => {
    if (!isDragging) return;

    const finalDirection = swipeDirection;
    const finalTranslate = translateX;
    const wasActive = swipeActiveRef.current;

    resetGesture();

    if (wasActive && finalDirection && Math.abs(finalTranslate) > threshold) {
      didSwipeRef.current = true;
      if (finalDirection === "left") {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    } else {
      didSwipeRef.current = false;
    }
  }, [
    isDragging,
    resetGesture,
    swipeDirection,
    translateX,
    threshold,
    onSwipeLeft,
    onSwipeRight,
  ]);

  return {
    translateX,
    isDragging,
    swipeDirection,
    didSwipeRef, // Expose ref for click handling
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
    },
  };
}
