import type { Metadata } from "next";
import {
  Space_Grotesk,
  Instrument_Serif,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

// Three voices — Design Spec § 04.
const sans = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const serif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kadence",
    template: "%s · Kadence",
  },
  description: "Editorial cycling-analytics for one rider.",
};

// Sets `.night` on <html> before paint so the chosen theme survives a hard
// refresh with no flash (Design Spec § 03-B; build spec § 9, § 15).
const themeInit = `(function(){try{var t=localStorage.getItem('kadence-theme');var d=t?t==='night':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('night');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
