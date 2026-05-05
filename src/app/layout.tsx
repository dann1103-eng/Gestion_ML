import type { Metadata } from "next";
import { Lora, Nunito } from "next/font/google";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gestión ML — Centro Cultural El Molino",
  description:
    "Plataforma contable centralizada para Centro Cultural El Molino (AFCYD).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${lora.variable} ${nunito.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
