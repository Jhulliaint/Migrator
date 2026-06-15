import type { Metadata } from "next";
import "./globals.css";
import { DataProvider } from "@/lib/store-client";
import { InspectorProvider } from "@/lib/inspector";
import { InspectorHost } from "@/components/inspector/InspectorHost";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "BeCloud · Pilotage migration Microsoft 365 — Groupe Corthay",
  description: "Suivi de la migration Google Workspace → Microsoft 365 / Exchange Online.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <DataProvider>
          <InspectorProvider>
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-[1600px] p-4">{children}</div>
              </main>
            </div>
            <InspectorHost />
          </InspectorProvider>
        </DataProvider>
      </body>
    </html>
  );
}
