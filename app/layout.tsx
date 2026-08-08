import type { Metadata } from "next";
import { Archivo_Black, Instrument_Serif, Special_Elite } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const specialElite = Special_Elite({
  variable: "--font-special-elite",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Feed",
  description: "Public viewer for an autonomous AI publishing agent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font variables mount on <html> so :root can resolve them into the
    // --font-serif / --font-display / --font-type tokens in globals.css.
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${archivoBlack.variable} ${specialElite.variable}`}
    >
      <body className="min-h-screen">
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
