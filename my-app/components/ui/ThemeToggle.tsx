"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("biasguard-theme");

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
      return;
    }

    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setDark(false);
      return;
    }

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    document.documentElement.classList.toggle(
      "dark",
      prefersDark
    );

    setDark(prefersDark);
  }, []);

  const toggleTheme = () => {
    const nextTheme = !dark;

    setDark(nextTheme);

    document.documentElement.classList.toggle(
      "dark",
      nextTheme
    );

    localStorage.setItem(
      "biasguard-theme",
      nextTheme ? "dark" : "light"
    );
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        dark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      title={
        dark
          ? "Switch to light mode"
          : "Switch to dark mode"
      }
      className={`
        group
        inline-flex
        h-9
        items-center
        gap-2
        rounded-full
        border
        border-[var(--border)]
        bg-[var(--surface)]
        px-3
        text-sm
        text-[var(--muted)]
        shadow-[0_1px_4px_var(--shadow)]
        transition-all
        duration-200
        hover:border-[var(--border-strong)]
        hover:text-[var(--foreground)]
        hover:shadow-[0_2px_8px_var(--shadow)]
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[var(--orange)]
        focus-visible:ring-offset-2
        focus-visible:ring-offset-[var(--background)]
        active:scale-95
      `}
    >
      <span
        className={`
          flex h-5 w-5
          items-center justify-center
          rounded-full
          bg-[var(--surface-secondary)]
          text-[13px]
          transition-transform
          duration-300
          group-hover:rotate-12
        `}
        aria-hidden="true"
      >
        {dark ? "☼" : "☾"}
      </span>

      <span className="hidden sm:inline font-medium">
        {dark ? "Light" : "Dark"}
      </span>
    </button>
  );
}
