import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sello — fidelización",
  description:
    "Tarjetas de fidelización con alma de papel. Sumá sellos, volvé por tu premio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${hanken.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="relative min-h-full">{children}</body>
    </html>
  );
}
