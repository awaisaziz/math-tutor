import { ImageProvider, LLMMessage, LLMProvider, VoiceAgent, VoiceAgentEvent, VoiceAgentFactory } from "./types";

// Lets the whole app run end-to-end with no API key configured yet.
// Swap these out (see index.ts) once GROK_API_KEY is set.

export class MockLLMProvider implements LLMProvider {
  async chat(messages: LLMMessage[]): Promise<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return `(mock tutor) That's a great thought! Let's talk about it: "${lastUser?.content ?? ""}"`;
  }
}

class MockVoiceAgent implements VoiceAgent {
  private onEvent: ((event: VoiceAgentEvent) => void) | null = null;

  async connect(onEvent: (event: VoiceAgentEvent) => void): Promise<void> {
    this.onEvent = onEvent;
  }

  sendAudioChunk(_audioBase64: string): void {
    this.onEvent?.({
      type: "assistant_transcript",
      text: "(mock voice reply — connect GROK_API_KEY for real speech-to-speech)",
    });
  }

  sendText(text: string): void {
    this.onEvent?.({ type: "user_transcript", text });
    this.onEvent?.({
      type: "assistant_transcript",
      text: `(mock tutor) That's a great thought! Let's talk about it: "${text}"`,
    });
  }

  respondToImageRequest(_callId: string, _result: string): void {
    // no-op — the mock never requests images
  }

  close(): void {
    this.onEvent = null;
  }
}

export class MockVoiceAgentFactory implements VoiceAgentFactory {
  create(_instructions: string): VoiceAgent {
    return new MockVoiceAgent();
  }
}

export class MockImageProvider implements ImageProvider {
  async generate(_prompt: string): Promise<string> {
    return ""; // no image — connect GROK_API_KEY for real generated illustrations
  }
}
