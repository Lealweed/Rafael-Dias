import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { Sparkles, Wind, Sun, Heart, Activity, ShieldCheck } from "lucide-react";

interface ServiceItem {
  title: string;
  desc: string;
  icon: React.ReactNode;
  size: "large" | "medium" | "small";
  image: string;
}

export function BentoServices({ services }: { services: ServiceItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [-20, 20]);

  return (
    <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-auto md:h-[600px]">
      {services.map((s, i) => (
        <motion.div
          key={i}
          className={`relative group overflow-hidden rounded-premium glass-dark p-6 flex flex-col justify-between ${
            s.size === "large" ? "md:col-span-2 md:row-span-2" : 
            s.size === "medium" ? "md:col-span-2 md:row-span-1" : 
            "md:col-span-1 md:row-span-1"
          }`}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.98, y: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20,
            opacity: { duration: 0.5, ease: "easeOut" }
          }}
        >
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <motion.img 
              style={{ y: imageY }}
              src={s.image} 
              alt={s.title} 
              className="w-full h-full object-cover opacity-20 grayscale group-hover:scale-110 group-hover:opacity-40 transition-all duration-700" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black-void via-transparent to-transparent opacity-80" />
            <div className="absolute inset-0 inner-glow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="relative z-10">
            <div className="h-10 w-10 rounded-full glass flex items-center justify-center border-gold/20 mb-4">
              {s.icon}
            </div>
            <h3 className="text-xl md:text-2xl font-display font-light text-white group-hover:text-gold transition-colors">
              {s.title}
            </h3>
          </div>

          <div className="relative z-10 mt-auto">
            <p className="text-xs text-white/50 leading-relaxed max-w-[200px]">
              {s.desc}
            </p>
            <motion.div 
              className="mt-4 h-[1px] w-0 bg-gold group-hover:w-full transition-all duration-500"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
