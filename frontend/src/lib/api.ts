const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed (${res.status})`);
  }
  return res.json();
}

export interface Parent {
  id: string;
  email: string;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  parentId: string;
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  objective: string;
  content: string;
  order: number;
}

export const api = {
  signup: (email: string, password: string) =>
    request<{ token: string; parent: Parent }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; parent: Parent }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  listStudents: () => request<Student[]>("/api/students"),
  createStudent: (name: string, age: number) =>
    request<Student>("/api/students", { method: "POST", body: JSON.stringify({ name, age }) }),
  nextLesson: (studentId: string) =>
    request<{ mode: "review" | "new" | "complete"; lesson: Lesson | null }>(
      `/api/progress/${studentId}/next-lesson`
    ),
};

export { API_URL };
