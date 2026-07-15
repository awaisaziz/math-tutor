import { ImageProvider, LLMProvider, VoiceAgentFactory } from "./types";
import { MockImageProvider, MockLLMProvider, MockVoiceAgentFactory } from "./mockProviders";
import { GrokImageProvider, GrokLLMProvider, GrokVoiceAgentFactory } from "./grokProviders";

const apiKey = process.env.GROK_API_KEY;
const llmModel = process.env.GROK_LLM_MODEL ?? "grok-4.5";
const voiceModel = process.env.GROK_VOICE_MODEL ?? "grok-voice-latest";
const voiceName = process.env.GROK_VOICE_NAME ?? "eve";
const imageModel = process.env.GROK_IMAGE_MODEL ?? "grok-imagine-image-quality";

export const llmProvider: LLMProvider = apiKey ? new GrokLLMProvider(apiKey, llmModel) : new MockLLMProvider();

export const voiceAgentFactory: VoiceAgentFactory = apiKey
  ? new GrokVoiceAgentFactory(apiKey, voiceModel, voiceName)
  : new MockVoiceAgentFactory();

export const imageProvider: ImageProvider = apiKey ? new GrokImageProvider(apiKey, imageModel) : new MockImageProvider();

export * from "./types";
