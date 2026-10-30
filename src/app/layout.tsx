import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Spotlight } from "@/components/Spotlight";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Bonded · Care that clicks", template: "%s · Bonded" },
  description: "Bonded matches home care caregivers to elderly clients by shared taste, powered by Qloo's taste graph, and handles call-outs with an agent.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#080b14" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="min-h-screen">
        <div className="ambient" aria-hidden>
          <span style={{ width: 520, height: 520, left: "-8%", top: "-10%", background: "rgb(var(--teal))" }} />
          <span style={{ width: 460, height: 460, right: "-6%", top: "10%", background: "rgb(var(--coral))", animationDelay: "-7s" }} />
          <span style={{ width: 420, height: 420, left: "30%", bottom: "-15%", background: "rgb(var(--violet))", animationDelay: "-14s" }} />
        </div>
        <Spotlight />
        {children}
      </body>
    </html>
  );
}
