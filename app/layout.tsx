import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Aria’s House · Find your rhythm",
  description:
    "An immersive rhythm companion with guided sessions, evolving patterns, and a rhythm that is yours.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
