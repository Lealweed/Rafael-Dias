import { Star, Quote } from "lucide-react";

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
  // Multiply testimonials to ensure continuous scrolling
  const duplicatedTestimonials = [
    ...testimonials,
    ...testimonials,
    ...testimonials,
    ...testimonials,
  ];

  return (
    <div className="relative w-full py-10 overflow-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      <div className="flex w-full overflow-hidden">
        <div className="flex gap-6 shrink-0 animate-marquee">
          {duplicatedTestimonials.map((t, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[320px] md:w-[400px] select-none"
            >
              <div className="glass p-8 rounded-premium relative h-full flex flex-col justify-between group hover:border-gold/30 transition-colors duration-500 bg-[#0E1118]/70 backdrop-blur-md border border-white/5">
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
                      src={t.avatar || `https://i.pravatar.cc/100?u=${t.name}`} 
                      alt={t.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">{t.name}</h4>
                    <p className="text-[13px] text-gold/60 uppercase tracking-tighter">{t.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Decorative gradient edges */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black-void to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black-void to-transparent pointer-events-none z-10" />
    </div>
  );
}

