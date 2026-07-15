import { LLMMessage } from "./ai/types";

interface PromptContext {
  studentName: string;
  studentAge: number;
  mode: "review" | "new" | "complete";
  lessonTitle?: string;
  lessonObjective?: string;
  lessonContent?: string;
  lastSessionSummary?: string | null;
}

export function buildSystemPrompt(ctx: PromptContext): LLMMessage {
  const lines = [
    `You are a warm, patient, encouraging Grade 1 math tutor speaking with ${ctx.studentName}, age ${ctx.studentAge}.`,
    "Use short sentences, simple words, and a friendly tone appropriate for a young child.",
    "Ask one question at a time and wait for the child's response before moving on.",
    "The child may speak in any language. Always reply in the same language the child just used, even if you started the conversation in a different one.",
  ];

  if (ctx.lastSessionSummary) {
    lines.push(
      `Before teaching anything new, briefly recall what you covered last time: "${ctx.lastSessionSummary}". Ask if they remember it and if they have any questions.`
    );
  }

  if (ctx.mode === "review" && ctx.lessonTitle) {
    lines.push(
      `The child needs more practice on "${ctx.lessonTitle}" (${ctx.lessonObjective}). Re-explain it a simpler way using the material below before introducing anything new.`
    );
  } else if (ctx.mode === "new" && ctx.lessonTitle) {
    lines.push(
      `Today's new lesson is "${ctx.lessonTitle}" (${ctx.lessonObjective}). Only move to it after confirming the child understood the previous session.`
    );
  } else if (ctx.mode === "complete") {
    lines.push("The child has finished the entire curriculum — celebrate this and offer fun review games.");
  }

  if (ctx.lessonContent) {
    lines.push(`Lesson material to draw from:\n${ctx.lessonContent}`);
  }

  if (isVisualLesson(ctx.lessonTitle ?? "", ctx.lessonObjective ?? "")) {
    lines.push(
      "You have a show_counting_image tool. Call it every time you introduce a new counting, addition, " +
        "subtraction, or multiplication exercise, and again whenever the numbers or objects you're talking " +
        "about change — the picture on screen should always match what you're currently teaching. Describe " +
        'what to draw simply, e.g. "4 blue balloons" or "2 groups of 3 red apples for multiplication".'
    );
  }

  return { role: "system", content: lines.join("\n") };
}

const COUNTING_KEYWORDS = ["count", "number", "add", "subtract", "sum", "multipl", "times"];

// Only counting/arithmetic lessons get generated illustrations — shapes/measurement
// lessons lean on real objects the parent has at home instead.
function isVisualLesson(lessonTitle: string, lessonObjective: string): boolean {
  const haystack = `${lessonTitle} ${lessonObjective}`.toLowerCase();
  return COUNTING_KEYWORDS.some((kw) => haystack.includes(kw));
}

export function buildImagePrompt(lessonTitle: string, lessonObjective: string): string | null {
  if (!isVisualLesson(lessonTitle, lessonObjective)) return null;
  return buildDynamicImagePrompt(`for a lesson titled "${lessonTitle}" (${lessonObjective})`);
}

// Shared styling wrapper for both the initial per-lesson image and the tutor's
// own mid-conversation show_counting_image tool calls, so every picture looks
// consistent regardless of when it was generated.
export function buildDynamicImagePrompt(description: string): string {
  return (
    `A simple, cheerful cartoon illustration ${description}. ` +
    "Show a small, clearly countable group of friendly objects (like apples, stars, or balloons) arranged with even spacing " +
    "so a young child can count them one by one. Bright flat colors, thick clean outlines, plain white background. " +
    "Do not include any numbers, digits, letters, or text anywhere in the image."
  );
}

export function buildSummaryRequest(transcript: LLMMessage[]): LLMMessage[] {
  return [
    {
      role: "system",
      content:
        "Summarize this tutoring session in 2-3 short sentences for tomorrow's tutor: what was taught, whether the child understood, and any open questions. Plain text only.",
    },
    ...transcript,
  ];
}
