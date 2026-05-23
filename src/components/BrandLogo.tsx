import React from "react";
import advisoLogo from "../assets/adviso-logo.jpeg";

interface BrandLogoProps {
  mark?: boolean;
  className?: string;
}

export default function BrandLogo({ mark = false, className = "" }: BrandLogoProps) {
  if (mark) {
    return (
      <img
        src="/favicon.png"
        alt="Adviso AI"
        className={`h-full w-full rounded-[inherit] object-cover ${className}`}
      />
    );
  }

  return (
    <img
      src={advisoLogo}
      alt="Adviso AI"
      className={`h-full w-full rounded-[inherit] object-cover object-center ${className}`}
    />
  );
}
