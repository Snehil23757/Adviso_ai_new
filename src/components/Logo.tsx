import React from "react";

interface LogoProps {
  className?: string;
  classNameIcon?: string;
  size?: "sm" | "md" | "lg" | "xl";
  hideText?: boolean;
}

export default function Logo({ className = "", classNameIcon = "", size = "md", hideText = false }: LogoProps) {
  // Dimensions map based on size
  const iconSize = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto",
    lg: "h-10 w-auto",
    xl: "h-14 w-auto",
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <svg
        viewBox={hideText ? "0 0 60 60" : "0 0 280 60"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconSize} ${classNameIcon} transition-transform duration-300 hover:scale-[1.02]`}
        style={hideText ? { width: "auto" } : {}}
      >
        <defs>
          <linearGradient id="aLeft" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="aRight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="aSwoosh" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00F2FE" />
            <stop offset="100%" stopColor="#0072FF" />
          </linearGradient>
          <linearGradient id="aiText" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>

        <g transform="translate(0, 5)">
          {/* Left Leg */}
          <path d="M 25 0 L 0 50 L 15 50 L 35 15 Z" fill="url(#aLeft)" />
          {/* Right Leg */}
          <path d="M 25 0 L 50 50 L 65 50 L 35 15 Z" fill="url(#aRight)" />
          {/* Swoosh cutting across */}
          <path d="M 0 50 C 25 40 40 25 70 25 C 45 32 30 46 15 50 Z" fill="url(#aSwoosh)" />
        </g>

        {!hideText && (
          <g transform="translate(80, 42)">
            <text 
              fill="currentColor" 
              fontSize="38" 
              fontWeight="700" 
              fontFamily="Inter, sans-serif"
              letterSpacing="-1"
            >
              Adviso
            </text>
            <text 
              x="135"
              fill="url(#aiText)" 
              fontSize="38" 
              fontWeight="700" 
              fontFamily="Inter, sans-serif"
              letterSpacing="-1"
            >
              AI
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
