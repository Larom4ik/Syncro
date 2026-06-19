import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

const variants = {
  primary:
    "bg-gradient-to-r from-[var(--syncro-accent)] to-amber-600 hover:brightness-110 text-black font-bold",
  secondary:
    "bg-[var(--syncro-glass)] hover:bg-white/10 border border-[var(--syncro-glass-border)] text-zinc-200",
  ghost: "bg-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`px-5 py-2.5 rounded-xl text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
