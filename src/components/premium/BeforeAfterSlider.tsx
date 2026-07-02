import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Maximize2 } from "lucide-react";

interface Marker {
  x: string;
  y: string;
  label: string;
  desc: string;
}

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  markers?: Marker[];
}

export function BeforeAfterSlider({ beforeImage, afterImage, markers = [] }: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/5] rounded-premium overflow-hidden border border-white/10 shadow-premium bg-black select-none group"
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={onMouseMove}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      onTouchMove={onTouchMove}
    >
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 pointer-events-none border border-white/5 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] z-10" />

      {/* Before Image */}
      <img
        src={beforeImage}
        alt="Before"
        className="absolute inset-0 w-full h-full object-cover grayscale opacity-60"
      />
      <div className="absolute bottom-6 left-6 z-20 glass px-4 py-1.5 rounded-full text-[13px] font-mono tracking-widest text-white/50">
        CLINICAL BASE
      </div>

      {/* After Image */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={afterImage}
          alt="After"
          className="absolute inset-y-0 left-0 h-full object-cover"
          style={{ width: containerRef.current?.offsetWidth || "100%", maxWidth: "none" }}
        />
        <div className="absolute bottom-6 right-6 z-20 glass-gold px-4 py-1.5 rounded-full text-[13px] font-mono tracking-widest text-gold whitespace-nowrap">
          OPTIMIZED PROTOCOL
        </div>
      </div>

      {/* Slider Divider */}
      <motion.div
        className="absolute top-0 bottom-0 z-30 w-[2px] bg-gold shadow-[0_0_20px_#D4AF37]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-12 w-8 rounded-full bg-black border border-gold shadow-gold flex items-center justify-center cursor-ew-resize">
          <div className="flex gap-1">
            <div className="h-4 w-[1px] bg-gold/50" />
            <div className="h-4 w-[1px] bg-gold/50" />
          </div>
        </div>
      </motion.div>

      {/* HUD Markers */}
      {markers.map((marker, index) => {
        const markerX = parseFloat(marker.x);
        const isRevealed = sliderPosition > markerX - 5;

        return (
          <motion.div
            key={index}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: marker.x, top: marker.y }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: isRevealed ? 1 : 0,
              scale: isRevealed ? 1 : 0.8
            }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative group/marker">
              <div className="absolute -inset-2 bg-gold/20 rounded-full animate-pulse" />
              <div className="relative h-2 w-2 rounded-full bg-gold shadow-[0_0_10px_#D4AF37]" />
              
              <div className="absolute left-4 top-1/2 -translate-y-1/2 glass px-3 py-1.5 rounded border-gold/30 opacity-0 group-hover/marker:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                <p className="text-[13px] font-bold text-gold uppercase tracking-wider">{marker.label}</p>
                <p className="text-[13px] text-white/50 mt-0.5">{marker.desc}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
