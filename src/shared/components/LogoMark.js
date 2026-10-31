"use client";

import React, { useId } from "react";

export default function LogoMark({ className = "size-full" }) {
  const gradientId = `aries-logo-gradient-${useId().replace(/:/g, "")}`;

  return (
    <span className={`relative inline-flex items-center justify-center ${className}`.trim()}>
      <svg
        viewBox="0 0 64 64"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full overflow-hidden block"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF3E00" />
            <stop offset="60%" stopColor="#FF7700" />
            <stop offset="100%" stopColor="#FFB300" />
          </linearGradient>
        </defs>

        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="16"
          className="fill-surface-2 dark:fill-[#080C14] stroke-border dark:stroke-[#26282D]"
          strokeWidth="1.5"
        />

        <g
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4.5"
        >
          <path d="M 32,46 C 32,37 27,29 21,24 C 16,19 10,21 9,26 C 8,31 12,36 17,35 C 20,34 22,31 21,29" />
          <path d="M 32,46 C 32,37 37,29 43,24 C 48,19 54,21 55,26 C 56,31 52,36 47,35 C 44,34 42,31 43,29" />
          <line x1="32" y1="36" x2="32" y2="52" />
        </g>
        <circle cx="32" cy="36" r="3.5" fill="#FFFFFF" />
        <circle cx="21" cy="29" r="2" fill="#FFFFFF" />
        <circle cx="43" cy="29" r="2" fill="#FFFFFF" />
      </svg>
    </span>
  );
}
