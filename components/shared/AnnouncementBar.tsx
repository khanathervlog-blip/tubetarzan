"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  message: string;
  link?: string;
  linkText?: string;
}

export default function AnnouncementBar({ message, link, linkText }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("announcement_dismissed") === message.slice(0, 50);
  });

  if (dismissed || !message) return null;

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("announcement_dismissed", message.slice(0, 50));
  }

  return (
    <div className="bg-[#FFD200] text-[#080808] text-sm font-medium flex items-center justify-center px-4 py-2 gap-3 relative">
      <span>{message}</span>
      {link && linkText && (
        <a href={link} className="underline font-bold hover:no-underline shrink-0">{linkText}</a>
      )}
      <button onClick={dismiss} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#080808]/60 hover:text-[#080808] transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
