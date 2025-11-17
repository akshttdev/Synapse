"use client";

import { Input } from "@/components/ui/input";
import { Plus, Mic, Square, ArrowUp } from "lucide-react";
import { useRef, useState } from "react";
import { useTheme } from "next-themes";

export default function SearchBar({ query, setQuery, onSearch }: any) {
  const filePickerRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  const [isRecording, setIsRecording] = useState(false);
  const [levels, setLevels] = useState<number[]>(Array(20).fill(6));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "voice.webm", { type: "audio/webm" });
      onSearch(file);
    };

    // waveform
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyserRef.current = analyser;
    src.connect(analyser);

    animateBars();
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const animateBars = () => {
    if (!analyserRef.current) return;

    const buffer = new Uint8Array(analyserRef.current.frequencyBinCount);

    const loop = () => {
      if (!isRecording) return;

      analyserRef.current!.getByteFrequencyData(buffer);
      const newLevels = Array.from(buffer.slice(0, 20)).map((v) =>
        Math.max(3, Math.floor((v / 255) * 24))
      );
      setLevels(newLevels);
      requestAnimationFrame(loop);
    };

    loop();
  };

  const barColor = theme === "dark" ? "bg-white" : "bg-black";

  return (
    <div className="w-[680px] max-w-[680px] mx-auto relative">

      {/* SEARCH BAR WRAPPER */}
      <div className="relative">
        
        {/* Waveform (inside searchbar) */}
        {isRecording && (
          <div
            className="
              absolute inset-0
              flex items-center justify-center
              gap-[3px] pointer-events-none z-30
            "
          >
            {levels.map((h, i) => (
              <div
                key={i}
                className={`
                  w-[3px] rounded-full 
                  ${barColor}
                  transition-all duration-75
                `}
                style={{ height: `${h}px` }}
              ></div>
            ))}
          </div>
        )}

        {/* SEARCH BAR */}
        <div
          className="
            flex items-center 
            h-14 w-full
            rounded-2xl 
            px-4 gap-4

            bg-white/70
            border border-black/10
            backdrop-blur-xl

            dark:bg-[#1e1f20]/80
            dark:border-white/10

            relative overflow-hidden
          "
        >
          {/* Hidden file input */}
          <input
            type="file"
            className="hidden"
            ref={filePickerRef}
            onChange={(e) =>
              console.log("File selected:", e.target.files?.[0])
            }
          />

          {/* Plus button */}
          <button
            className="opacity-80 hover:opacity-100 transition shrink-0 cursor-pointer z-20"
            onClick={() => filePickerRef.current?.click()}
          >
            <Plus size={22} />
          </button>

          {/* Input (hidden while recording) */}
          <Input
            value={isRecording ? "" : query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRecording ? "" : "Ask me anything..."}
            className="
              flex-1 
              bg-transparent 
              dark:bg-transparent
              border-none 
              shadow-none
              h-full
              focus-visible:ring-0 
              focus-visible:ring-transparent 
              focus:outline-none
              text-base
              text-black dark:text-white
              z-20
            "
          />

          {/* Mic / Stop recording */}
          {!isRecording ? (
            <button
              className="opacity-80 hover:opacity-100 transition shrink-0 cursor-pointer z-20"
              onClick={startRecording}
            >
              <Mic size={20} />
            </button>
          ) : (
            <button
              className="opacity-80 hover:opacity-100 transition shrink-0 cursor-pointer z-20"
              onClick={stopRecording}
            >
              <Square size={20} />
            </button>
          )}

          {/* Send */}
          <button
            onClick={() => onSearch(query)}
            className="
              h-10 w-10 shrink-0
              bg-foreground text-background 
              rounded-full 
              flex items-center justify-center
              hover:opacity-90 transition cursor-pointer
              z-20
            "
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
