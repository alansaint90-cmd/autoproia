import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto Pro IA Catuense",
  description: "Atendimento WhatsApp com IA e handoff humano para autoescolas."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
