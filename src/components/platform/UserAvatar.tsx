import React, { useMemo, useState } from "react";

type AvatarSize = "sm" | "md" | "lg";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

function initialsFor(name?: string | null, email?: string | null) {
  const source = (name || email || "Adviso User").trim();
  const parts = source
    .replace(/@.*/, "")
    .split(/\s|[._-]+/)
    .filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
  return initials || "A";
}

export default function UserAvatar({ name, email, src, size = "md", className = "" }: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = useMemo(() => initialsFor(name, email), [email, name]);
  const cleanSrc = (src || "").trim();
  const sizeClass = SIZE_CLASS[size];

  if (cleanSrc && !imageFailed) {
    return (
      <img
        src={cleanSrc}
        alt={name || email || "User avatar"}
        referrerPolicy="no-referrer"
        onError={() => setImageFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full border border-blue-500/15 object-cover shadow-sm ${className}`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} grid shrink-0 place-items-center rounded-full border border-blue-500/20 bg-gradient-to-br from-[#145DFF] to-[#0B3FCC] font-black text-white shadow-sm ${className}`}
      aria-label={name || email || "User avatar"}
    >
      {initials}
    </span>
  );
}
