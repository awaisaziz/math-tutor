"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Student } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState(6);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api
      .listStudents()
      .then(setStudents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const student = await api.createStudent(name, age);
      setStudents((prev) => [...prev, student]);
      setName("");
      setAge(6);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add student");
    }
  }

  function handleLogout() {
    clearToken();
    router.push("/login");
  }

  if (loading) return <main className="p-8">Loading...</main>;

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-tutor-primary">Your Children</h1>
        <button onClick={handleLogout} className="text-sm text-slate-500 underline">
          Log out
        </button>
      </div>

      <ul className="space-y-3">
        {students.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
            <span>
              {s.name} <span className="text-slate-400">· age {s.age}</span>
            </span>
            <a
              href={`/tutor/${s.id}`}
              className="rounded-lg bg-tutor-accent px-4 py-2 font-semibold text-slate-900 hover:opacity-90"
            >
              Start Lesson
            </a>
          </li>
        ))}
        {students.length === 0 && <p className="text-slate-500">No students yet — add one below.</p>}
      </ul>

      <form onSubmit={handleAddStudent} className="space-y-3 rounded-lg bg-white p-6 shadow">
        <h2 className="font-semibold">Add a child</h2>
        <input
          type="text"
          required
          placeholder="Child's name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2"
        />
        <div>
          <label htmlFor="child-age" className="mb-1 block text-sm font-medium text-slate-600">
            Age (4–9 years old)
          </label>
          <input
            id="child-age"
            type="number"
            required
            min={4}
            max={9}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-4 py-2"
          />
          <p className="mt-1 text-xs text-slate-400">
            Used to set the tutor&apos;s pace and vocabulary — the curriculum targets Grade 1 (typically ages 6–7).
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-tutor-primary py-2 font-semibold text-white hover:opacity-90"
        >
          Add Child
        </button>
      </form>
    </main>
  );
}
