import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold text-tutor-primary">Math Tutor for Kids</h1>
      <p className="max-w-md text-slate-600">
        A friendly voice-powered AI tutor that teaches Grade 1 math, one bite-sized lesson at a time.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-tutor-primary px-6 py-3 font-semibold text-white hover:opacity-90"
        >
          Parent Login
        </Link>
        <Link
          href="/signup"
          className="rounded-lg border border-tutor-primary px-6 py-3 font-semibold text-tutor-primary hover:bg-blue-50"
        >
          Sign Up
        </Link>
      </div>
    </main>
  );
}
