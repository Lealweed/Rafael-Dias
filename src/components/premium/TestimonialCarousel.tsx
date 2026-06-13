import { motion } from "motion/react";
import { Star, Quote } from "lucide-react";
import { cn } from "../../lib/utils";

interface Testimonial {
  name: string;
  role: string;
  comment: string;
  avatar?: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
}

export function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  return (
    <div className="relative w-full py-10 overflow-hidden">
      <div className="flex gap-6 overflow-x-auto pb-12 px-6 scrollbar-hide snap-x snap-mandatory">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            className="flex-shrink-0 w-[320px] md:w-[400px] snap-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.8 }}
          >
            <div className="glass p-8 rounded-premium relative h-full flex flex-col justify-between group hover:border-gold/30 transition-colors duration-500">
              <div className="absolute top-6 right-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Quote size={48} className="text-gold" />
              </div>

              <div className="space-y-4">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={10} className="fill-gold text-gold" />
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed italic font-light">
                  "{t.comment}"
                </p>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center overflow-hidden">
                  <img 
                    src={`https://i.pravatar.cc/100?u=${t.name}`} 
                    alt={t.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">{t.name}</h4>
                  <p className="text-[10px] text-gold/60 uppercase tracking-tighter">{t.role}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Decorative gradient edges */}
      <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black-void to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black-void to-transparent pointer-events-none" />
    </div>
  );
}
