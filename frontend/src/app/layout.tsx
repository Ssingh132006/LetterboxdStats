import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Letterboxd Analytics & Comparison | Actor & Director Leaderboards",
  description: "Analyze your Letterboxd watch history, discover your most-watched actors and directors with career completion percentages, and compare taste with other cinephiles.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#14181c] text-white antialiased flex flex-col selection:bg-[#00e054]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
