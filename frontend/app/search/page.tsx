"use client";

import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card"; // if you use custom UI card, remove this

export default function SearchPage() {
  const params = useSearchParams();
  const query = params.get("q") ?? "";

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Autofocus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = [
    { type: "image", title: "cat_on_piano.jpg", src: "/sample1.jpg" },
    { type: "text", title: "Feline Melodies.txt", snippet: "The cat gracefully tapped the ivory keys..." },
    { type: "audio", title: "cat_piano_solo.mp3" },
    { type: "document", title: "Piano_Cats_Research.pdf", snippet: "...recent studies show a remarkable aptitude..." },
    { type: "image", title: "paws_on_ivory.png", src: "/sample2.jpg" },
  ];

  return (
    <main className="min-h-screen w-full bg-background text-foreground px-6 py-10">

      {/* -------- Centered Header + Search Bar -------- */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center mb-10"
      >
        <div className="text-2xl font-semibold mb-4">Synapse</div>

        <Input
          ref={inputRef}
          defaultValue={query}
          readOnly={false} // user can type to modify search
          placeholder="Search anything…"
          className="h-14 w-full max-w-xl rounded-2xl bg-card/80 border border-border px-5 backdrop-blur-sm"
        />
      </motion.div>

      {/* -------- Results Count -------- */}
      <p className="text-center text-sm text-muted-foreground mb-6">
        Found {results.length} results for:{" "}
        <span className="text-foreground font-medium">"{query}"</span>
      </p>

      {/* -------- Masonry Grid -------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-12">
        {results.map((item, i) => (
          <ResultCard key={i} item={item} />
        ))}
      </div>

      {/* -------- Load More -------- */}
      <div className="flex justify-center pb-10">
        <button className="border border-border px-6 py-2 rounded-full text-sm hover:bg-muted/20 transition cursor-pointer">
          Load more
        </button>
      </div>

    </main>
  );
}

/* ------------------------- RESULT CARDS ------------------------- */

function ResultCard({ item }: any) {
  const baseClasses = "rounded-2xl bg-card/60 border border-border backdrop-blur-sm";

  if (item.type === "image") {
    return (
      <div className={`${baseClasses} p-3 cursor-default`}>
        <img
          src={item.src}
          alt={item.title}
          className="w-full rounded-xl mb-3 object-cover"
        />
        <div className="text-sm">{item.title}</div>
        <div className="text-xs text-muted-foreground">Source: /images</div>
      </div>
    );
  }

  if (item.type === "text") {
    return (
      <div className={`${baseClasses} p-4 h-full flex flex-col cursor-default`}>
        <div className="text-xs mb-2 text-muted-foreground">Text Match</div>
        <p className="text-sm flex-1">{item.snippet}</p>
        <div className="text-xs mt-3 text-muted-foreground">{item.title}</div>
      </div>
    );
  }

  if (item.type === "document") {
    return (
      <div className={`${baseClasses} p-4 h-full flex flex-col cursor-default`}>
        <div className="text-xs mb-2 text-muted-foreground">Document Match</div>
        <p className="text-sm flex-1">{item.snippet}</p>
        <div className="text-xs mt-3 text-muted-foreground">{item.title}</div>
      </div>
    );
  }

  if (item.type === "audio") {
    return (
      <div className={`${baseClasses} p-4 h-full cursor-default`}>
        <div className="text-xs mb-3 text-muted-foreground">Audio Clip</div>
        <div className="w-full h-20 rounded-xl bg-muted/10 flex items-center justify-center border border-border">
          ▶
        </div>
        <div className="text-sm mt-3">{item.title}</div>
        <div className="text-xs text-muted-foreground">Source: /audio</div>
      </div>
    );
  }

  return null;
}
