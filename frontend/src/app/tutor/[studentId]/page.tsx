"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { MicStreamer, PcmPlayer } from "@/lib/pcmAudio";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";

interface TranscriptEntry {
  speaker: "tutor" | "child";
  text: string;
}

export default function TutorPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);
  const micRef = useRef<MicStreamer | null>(null);
  const playerRef = useRef<PcmPlayer | null>(null);

  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [textInput, setTextInput] = useState("");
  const [lessonInfo, setLessonInfo] = useState<{ mode: string; title: string | null } | null>(null);
  const [lessonImage, setLessonImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lit, setLit] = useState(false);
  const litTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashLit() {
    setLit(true);
    if (litTimeout.current) clearTimeout(litTimeout.current);
    litTimeout.current = setTimeout(() => setLit(false), 900);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    playerRef.current = new PcmPlayer();

    const ws = new WebSocket(`${WS_URL}/ws/tutor?token=${token}&studentId=${studentId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "session_started":
          setLessonInfo({ mode: data.mode, title: data.lesson?.title ?? null });
          setLessonImage(null);
          break;
        case "lesson_image":
          setLessonImage(data.imageBase64);
          break;
        case "user_transcript":
          setTranscript((prev) => [...prev, { speaker: "child", text: data.text }]);
          flashLit();
          break;
        case "tutor_reply":
          setTranscript((prev) => [...prev, { speaker: "tutor", text: data.text }]);
          flashLit();
          break;
        case "tutor_audio":
          playerRef.current?.playChunk(data.audioBase64);
          break;
        case "error":
          setError(data.message);
          break;
      }
    };

    return () => {
      ws.close();
      micRef.current?.stop();
    };
  }, [studentId, router]);

  function sendText(text: string) {
    if (!text.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    // Not rendered optimistically — the backend echoes it back as "user_transcript"
    // once Grok confirms receipt, the same path audio input relies on.
    wsRef.current.send(JSON.stringify({ type: "text", text }));
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendText(textInput);
    setTextInput("");
  }

  async function startRecording() {
    setError(null);
    const mic = new MicStreamer();
    try {
      await mic.start((audioBase64) => {
        wsRef.current?.send(JSON.stringify({ type: "audio", audioBase64 }));
      });
      micRef.current = mic;
      setRecording(true);
    } catch {
      setError("Couldn't access the microphone — check browser permissions.");
    }
  }

  function stopRecording() {
    micRef.current?.stop();
    micRef.current = null;
    setRecording(false);
  }

  const reversedTranscript = [...transcript].reverse();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tutor-primary">Math Tutor</h1>
        <span className={`text-sm ${connected ? "text-green-600" : "text-red-500"}`}>
          {connected ? "Connected" : "Connecting..."}
        </span>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* Left: lesson picture */}
        <div className="md:sticky md:top-8 md:self-start">
          {lessonInfo && (
            <p className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-slate-700">
              {lessonInfo.mode === "review" && `Reviewing: ${lessonInfo.title}`}
              {lessonInfo.mode === "new" && `New lesson: ${lessonInfo.title}`}
              {lessonInfo.mode === "complete" && "All lessons complete! 🎉"}
            </p>
          )}
          <div className="flex aspect-square items-center justify-center rounded-lg bg-white p-3 shadow">
            {lessonImage ? (
              <img
                src={`data:image/png;base64,${lessonImage}`}
                alt="Something to count together"
                className="max-h-full max-w-full rounded-lg"
              />
            ) : (
              <p className="text-center text-sm text-slate-400">
                A picture will appear here once the tutor starts a counting exercise.
              </p>
            )}
          </div>
        </div>

        {/* Right: chat room */}
        <div
          className={`flex flex-col rounded-lg bg-white shadow transition-shadow duration-500 ${
            lit ? "shadow-[0_0_0_3px_rgba(255,200,87,0.6)]" : ""
          }`}
        >
          <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "60vh" }}>
            {reversedTranscript.length === 0 && (
              <p className="text-slate-400">Say hello, or type a message below to start the lesson.</p>
            )}
            {reversedTranscript.map((entry, i) => (
              <div
                key={reversedTranscript.length - i}
                className={`max-w-[80%] rounded-lg p-3 ${
                  entry.speaker === "tutor"
                    ? "bg-tutor-primary/10 text-slate-800"
                    : "ml-auto bg-tutor-accent/30 text-slate-800"
                }`}
              >
                {entry.text}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 p-4">
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`rounded-full px-5 py-3 font-semibold text-white ${
                recording ? "bg-red-500" : "bg-tutor-primary"
              }`}
            >
              {recording ? "Stop" : "🎤 Talk"}
            </button>
            <form onSubmit={handleTextSubmit} className="flex flex-1 gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type here..."
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2"
              />
              <button type="submit" className="rounded-lg bg-slate-200 px-4 py-2 font-semibold">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
