"use client";

import React, { useEffect, useRef } from "react";

interface AnimatedLogoProps {
  className?: string;
  size?: number;
  showAsFavicon?: boolean;
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({
  className,
  size = 32,
  showAsFavicon = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let lastFaviconUpdate = 0;
    const faviconUpdateInterval = 500; // Update favicon every 500ms to avoid performance issues

    const render = (time: number) => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Create dynamic gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      const hue1 = (time / 20) % 360;
      const hue2 = (hue1 + 60) % 360;
      gradient.addColorStop(0, `hsl(${hue1}, 70%, 60%)`);
      gradient.addColorStop(1, `hsl(${hue2}, 70%, 60%)`);

      // Draw background shape (rounded rect)
      ctx.fillStyle = gradient;
      ctx.beginPath();
      const radius = width * 0.2;
      ctx.roundRect(0, 0, width, height, radius);
      ctx.fill();

      // Draw "N" logo
      ctx.fillStyle = "white";
      ctx.font = `bold ${width * 0.7}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("N", width / 2, height / 2 + width * 0.05);

      // Update favicon
      if (showAsFavicon && time - lastFaviconUpdate > faviconUpdateInterval) {
        const link =
          (document.querySelector("link[rel*='icon']") as HTMLLinkElement) ||
          document.createElement("link");
        link.type = "image/x-icon";
        link.rel = "shortcut icon";
        link.href = canvas.toDataURL("image/x-icon");
        document.getElementsByTagName("head")[0].appendChild(link);
        lastFaviconUpdate = time;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [showAsFavicon]);

  return (
    <canvas
      ref={canvasRef}
      width={64} // Internal resolution
      height={64}
      className={className}
      style={{ width: size, height: size }}
    />
  );
};

export default AnimatedLogo;
