import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Math Tutor for Kids",
  description: "An AI-powered voice tutor teaching Grade 1 math",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
