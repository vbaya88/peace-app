import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Universe of Kindness | PaySeeWhoPay",
  description: "Leave a kind wish for $1 and see how many people are spreading kindness around the world",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}