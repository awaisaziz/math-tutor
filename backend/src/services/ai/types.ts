export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Text-only chat, used for the end-of-session summary (next-day recall).
export interface LLMProvider {
  chat(messages: LLMMessage[]): Promise<string>;
}

export type VoiceAgentEvent =
  | { type: "audio"; audioBase64: string }
  | { type: "user_transcript"; text: string }
  | { type: "assistant_transcript"; text: string }
  // The tutor decided to show a new picture mid-lesson (e.g. moving from "3 apples"
  // to "5 apples"). callId must be echoed back via respondToImageRequest so the
  // agent knows the picture was shown and can keep talking.
  | { type: "image_request"; callId: string; prompt: string }
  | { type: "error"; message: string };

// Wraps one live tutoring conversation. Grok's Voice Agent API is a bundled
// speech-to-speech pipeline (STT+LLM+TTS in one realtime session), so this
// models a session rather than separate STT/LLM/TTS calls.
export interface VoiceAgent {
  connect(onEvent: (event: VoiceAgentEvent) => void): Promise<void>;
  sendAudioChunk(audioBase64: string): void;
  sendText(text: string): void;
  respondToImageRequest(callId: string, result: string): void;
  close(): void;
}

export interface VoiceAgentFactory {
  create(instructions: string): VoiceAgent;
}

// Illustrations shown alongside counting/arithmetic lessons (e.g. "5 apples to count").
export interface ImageProvider {
  generate(prompt: string): Promise<string>; // returns base64-encoded image data (no data: prefix)
}
