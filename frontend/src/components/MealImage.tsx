"use client";

import React, { useState } from "react";
import { UtensilsCrossed } from "lucide-react";

interface MealImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
}

export default function MealImage({ src, alt, className = "" }: MealImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-stone-100 ${className}`}
        style={{ color: "#9CA3AF" }}
      >
        <UtensilsCrossed size={40} strokeWidth={1.5} />
        <span className="mt-2 text-xs font-medium">{alt}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}
