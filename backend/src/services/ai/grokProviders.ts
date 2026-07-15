import WebSocket from "ws";
import { ImageProvider, LLMMessage, LLMProvider, VoiceAgent, VoiceAgentEvent, VoiceAgentFactory } from "./types";

const GROK_BASE_URL = "https://api.x.ai/v1";
const GROK_REALTIME_URL = "wss://api.x.ai/v1/realtime";

// xAI's chat completions endpoint is OpenAI-compatible.
export class GrokLLMProvider implements LLMProvider {
  constructor(private apiKey: string, private model: string) {}

  async chat(messages: LLMMessage[]): Promise<string> {
    const response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, messages }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Grok chat completion failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message.content ?? "";
  }
}

// Bridges a client's mic/text input to xAI's realtime speech-to-speech Voice
// Agent API (wss://api.x.ai/v1/realtime?model=grok-voice-latest). See
// https://docs.x.ai/developers/model-capabilities/audio/voice-agent
class GrokVoiceAgent implements VoiceAgent {
  private ws: WebSocket | null = null;

  constructor(private apiKey: string, private model: string, private voice: string, private instructions: string) {}

  connect(onEvent: (event: VoiceAgentEvent) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${GROK_REALTIME_URL}?model=${encodeURIComponent(this.model)}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      this.ws = ws;

      ws.on("open", () => {
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              voice: this.voice,
              instructions: this.instructions,
              turn_detection: { type: "server_vad" },
              audio: {
                input: { format: { type: "audio/pcm", rate: 24000 } },
                output: { format: { type: "audio/pcm", rate: 24000 } },
              },
              tools: [
                {
                  type: "function",
                  name: "show_counting_image",
                  description:
                    "Show the child a new picture to count, add, subtract, or multiply with. Call this every " +
                    "time you introduce a new exercise or change the numbers/objects you're talking about, so " +
                    "the picture on screen always matches what you're currently teaching.",
                  parameters: {
                    type: "object",
                    properties: {
                      description: {
                        type: "string",
                        description:
                          'What the picture should show, e.g. "3 red apples" or "2 groups of 4 blue balloons for multiplication".',
                      },
                    },
                    required: ["description"],
                  },
                },
              ],
            },
          })
        );
        resolve();
      });

      ws.on("message", (raw) => {
        let message: any;
        try {
          message = JSON.parse(raw.toString());
        } catch {
          return;
        }

        if (process.env.GROK_VOICE_DEBUG === "1") {
          console.log("[grok-voice]", message.type, JSON.stringify(message).slice(0, 500));
        }

        switch (message.type) {
          case "response.output_audio.delta":
            if (message.delta) onEvent({ type: "audio", audioBase64: message.delta });
            break;
          case "response.output_audio_transcript.done":
            if (message.transcript) onEvent({ type: "assistant_transcript", text: message.transcript });
            break;
          case "conversation.item.added":
          case "conversation.item.created": {
            const role = message.item?.role;
            if (role !== "user") break;
            const text = (message.item?.content ?? [])
              .map((c: any) => c.text ?? c.transcript)
              .filter(Boolean)
              .join(" ");
            if (text) onEvent({ type: "user_transcript", text });
            break;
          }
          case "conversation.item.input_audio_transcription.completed":
            if (message.transcript) onEvent({ type: "user_transcript", text: message.transcript });
            break;
          case "response.function_call_arguments.done": {
            if (message.name !== "show_counting_image") break;
            try {
              const args = JSON.parse(message.arguments ?? "{}");
              if (args.description) {
                onEvent({ type: "image_request", callId: message.call_id, prompt: args.description });
              }
            } catch {
              // malformed tool arguments — skip rather than crash the session
            }
            break;
          }
          case "error":
            onEvent({ type: "error", message: message.error?.message ?? "Voice agent error" });
            break;
        }
      });

      ws.on("error", (err) => {
        onEvent({ type: "error", message: err.message });
        reject(err);
      });
    });
  }

  sendAudioChunk(audioBase64: string): void {
    this.ws?.send(JSON.stringify({ type: "input_audio_buffer.append", audio: audioBase64 }));
  }

  sendText(text: string): void {
    this.ws?.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text }] },
      })
    );
    this.ws?.send(JSON.stringify({ type: "response.create" }));
  }

  respondToImageRequest(callId: string, result: string): void {
    this.ws?.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: { type: "function_call_output", call_id: callId, output: result },
      })
    );
    this.ws?.send(JSON.stringify({ type: "response.create" }));
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}

export class GrokVoiceAgentFactory implements VoiceAgentFactory {
  constructor(private apiKey: string, private model: string, private voice: string) {}

  create(instructions: string): VoiceAgent {
    return new GrokVoiceAgent(this.apiKey, this.model, this.voice, instructions);
  }
}

// Illustrations shown alongside a lesson (e.g. a group of apples to count).
// See https://docs.x.ai/developers/model-capabilities/images/generation
export class GrokImageProvider implements ImageProvider {
  constructor(private apiKey: string, private model: string) {}

  async generate(prompt: string): Promise<string> {
    const response = await fetch(`${GROK_BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        n: 1,
        aspect_ratio: "1:1",
        resolution: "1k",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Grok image generation failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { data: { b64_json: string }[] };
    return data.data[0]?.b64_json ?? "";
  }
}
