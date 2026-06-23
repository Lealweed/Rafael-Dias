import { motion } from "motion/react";
import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface PremiumButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "outline" | "ghost";
  href?: string;
  target?: string;
  disabled?: boolean;
  type?: "submit" | "reset" | "button";
}

export function PremiumButton({
  children,
  onClick,
  className,
  variant = "primary",
  href,
  target,
  disabled,
  type = "button",
}: PremiumButtonProps) {
  const isLink = !!href;

  const content = (
    <motion.button
      type={type}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ type: "spring", stiffness: 600, damping: 15 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "btn-premium group flex items-center justify-center gap-2 tracking-[0.3em] font-medium disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "gold-gradient text-black shadow-gold hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]",
        variant === "outline" && "border border-gold/40 text-gold hover:border-gold hover:bg-gold/5",
        variant === "ghost" && "text-white/60 hover:text-white",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
      {variant === "primary" && !disabled && (
        <motion.div
          className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={false}
        />
      )}
    </motion.button>
  );

  if (isLink) {
    return (
      <a href={href} target={target} rel={target === "_blank" ? "noreferrer" : undefined} className="inline-block">
        {content}
      </a>
    );
  }

  return content;
}
