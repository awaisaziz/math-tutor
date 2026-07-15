import { IncomingMessage } from "http";
import { WebSocket, WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { imageProvider, llmProvider, voiceAgentFactory, LLMMessage } from "../services/ai";
import { buildDynamicImagePrompt, buildImagePrompt, buildSystemPrompt, buildSummaryRequest } from "../services/tutorSession";
import { determineNextLesson } from "../services/curriculum";

interface ClientMessage {
  type: "text" | "audio";
  text?: string; // for type "text" (used for testing without a mic)
  audioBase64?: string; // for type "audio" — base64 PCM16 @ 24kHz, per Grok's Voice Agent API
}

function parseQuery(req: IncomingMessage) {
  const url = new URL(req.url ?? "", "http://localhost");
  return {
    token: url.searchParams.get("token") ?? "",
    studentId: url.searchParams.get("studentId") ?? "",
  };
}

export function attachVoiceSessionServer(wss: WebSocketServer) {
  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const { token, studentId } = parseQuery(req);

    let parentId: string;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { parentId: string };
      parentId = payload.parentId;
    } catch {
      ws.close(4001, "Invalid or expired token");
      return;
    }

    const student = await prisma.student.findFirst({ where: { id: studentId, parentId } });
    if (!student) {
      ws.close(4004, "Student not found");
      return;
    }

    const lastSession = await prisma.conversationSession.findFirst({
      where: { studentId, endedAt: { not: null } },
      orderBy: { startedAt: "desc" },
    });

    const { mode, lesson } = await determineNextLesson(studentId);

    const systemPrompt = buildSystemPrompt({
      studentName: student.name,
      studentAge: student.age,
      mode,
      lessonTitle: lesson?.title,
      lessonObjective: lesson?.objective,
      lessonContent: lesson?.content,
      lastSessionSummary: lastSession?.summary,
    });

    const transcript: LLMMessage[] = [];
    const session = await prisma.conversationSession.create({
      data: { studentId, lessonId: lesson?.id, transcript: [] },
    });

    const agent = voiceAgentFactory.create(systemPrompt.content);
    try {
      await agent.connect((event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        switch (event.type) {
          case "audio":
            ws.send(JSON.stringify({ type: "tutor_audio", audioBase64: event.audioBase64 }));
            break;
          case "user_transcript":
            transcript.push({ role: "user", content: event.text });
            ws.send(JSON.stringify({ type: "user_transcript", text: event.text }));
            break;
          case "assistant_transcript":
            transcript.push({ role: "assistant", content: event.text });
            ws.send(JSON.stringify({ type: "tutor_reply", text: event.text }));
            break;
          case "image_request":
            imageProvider
              .generate(buildDynamicImagePrompt(event.prompt))
              .then((imageBase64) => {
                if (imageBase64 && ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "lesson_image", imageBase64 }));
                }
                agent.respondToImageRequest(event.callId, imageBase64 ? "Image shown to the child." : "Could not generate an image right now — continue with words only.");
              })
              .catch(() => {
                agent.respondToImageRequest(event.callId, "Could not generate an image right now — continue with words only.");
              });
            break;
          case "error":
            ws.send(JSON.stringify({ type: "error", message: event.message }));
            break;
        }
      });
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: "Could not start the voice tutor session" }));
      ws.close(1011, "Voice agent connection failed");
      return;
    }

    ws.send(
      JSON.stringify({
        type: "session_started",
        mode,
        lesson: lesson ? { id: lesson.id, title: lesson.title } : null,
      })
    );

    if (lesson) {
      const imagePrompt = buildImagePrompt(lesson.title, lesson.objective);
      if (imagePrompt) {
        imageProvider
          .generate(imagePrompt)
          .then((imageBase64) => {
            if (imageBase64 && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "lesson_image", imageBase64 }));
            }
          })
          .catch(() => {
            // Non-critical — the lesson continues fine without an illustration.
          });
      }
    }

    ws.on("message", (raw) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (message.type === "audio" && message.audioBase64) {
        agent.sendAudioChunk(message.audioBase64);
      } else if (message.type === "text" && message.text) {
        agent.sendText(message.text);
      }
    });

    ws.on("close", async () => {
      agent.close();

      let summary: string | null = null;
      if (transcript.length > 0) {
        try {
          summary = await llmProvider.chat(buildSummaryRequest(transcript));
        } catch {
          summary = null;
        }
      }

      await prisma.conversationSession.update({
        where: { id: session.id },
        data: {
          transcript: transcript.map((m) => ({ role: m.role, text: m.content })),
          summary,
          endedAt: new Date(),
        },
      });
    });
  });
}
