"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Sora } from "next/font/google";
import { examplePrompts } from "@/data/examples";
import SearchBar from "@/components/searchbar"; 

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

// Pick 3 random examples
function getRandomExamples() {
  const shuffled = [...examplePrompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

export default function Home() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [examples, setExamples] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    setExamples(getRandomExamples());
  }, []);

  if (!mounted) {
    return (
      <main className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
      </main>
    );
  }

  return (
    <main
      className={`${sora.className} relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-foreground`}
    >
      {/* Spotlight background */}
      <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="absolute inset-0 flex items-center justify-center pointer-events-none"
>

        <div
          className={`pointer-events-none absolute h-[480px] w-[480px] rounded-full blur-[140px] opacity-40
          ${
            theme === "light"
              ? "bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-300"
              : "bg-gradient-to-br from-teal-900 via-emerald-900 to-blue-900"
          }`}
        />
      </motion.div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-start pt-[16vh] px-4 text-center">

        <h2 className="text-3xl sm:text-4xl font-light text-muted-foreground mb-0.5">
          Good to see you again.
        </h2>

        <h1 className="text-4xl sm:text-5xl font-semibold mb-1">
          What can I help with?
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground mb-6 opacity-80">
          I'm available 24/7 for you — ask me anything.
        </p>

        {/* ⭐ Search Bar Component */}
        <div className="w-full flex max-w-xl mb-8 justify-center">
        <SearchBar
  query={query}
  setQuery={setQuery}
  onSearch={(q) => console.log("Searching:", q)}
/>


        </div>

        {/* Example chips */}
        <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
          {examples.map((ex, idx) => (
            <button
              key={idx}
              className="
                text-sm rounded-full 
                border border-border/40 
                px-3 py-1 z-20
                transition 
                hover:bg-muted/20 
                cursor-pointer
              "
              onClick={() => setQuery(ex)}
            >
              {ex}
            </button>
          ))}
        </div>

      </div>
    </main>
  );
}
