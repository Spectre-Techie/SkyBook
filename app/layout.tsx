import type { Metadata } from "next";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/client/theme/theme-provider";
import { TopNav } from "@/components/top-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: "SkyBook",
  description: "Airline reservation and ticketing MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      data-theme="light"
    >
      <body className="min-h-full text-text-default">
        <ThemeProvider>
          <TopNav />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
          <Toaster
            position="top-right"
            closeButton
            richColors
            toastOptions={{
              className: "border border-border-default bg-surface-raised text-text-default",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
