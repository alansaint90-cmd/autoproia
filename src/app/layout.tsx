import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto Pro IA Catuense",
  description: "Atendimento WhatsApp com IA e handoff humano para autoescolas."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = window.localStorage.getItem("auto-pro-ia:theme") || "dark";
                document.documentElement.dataset.theme = theme;
                document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
              } catch (_) {}
            `
          }}
        />
        {children}
      </body>
    </html>
  );
}
