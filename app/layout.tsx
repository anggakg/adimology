import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adimology",
  description: "Stock Analysis Dashboard",
};

import Navbar from "./components/Navbar";
import PasswordGate from "./components/PasswordGate";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'light') {
                    document.body.classList.add('light-theme');
                  }
                } catch (e) {}
              })();
              // Auto-reload on ChunkLoadError (stale deploy chunks)
              function handleChunkError(msg) {
                if (!msg) return;
                if (
                  msg.includes('ChunkLoadError') ||
                  msg.includes('Loading chunk') ||
                  msg.includes('Failed to fetch dynamically imported module') ||
                  msg.includes('Importing a module script failed')
                ) {
                  var key = 'chunk_reload_' + location.pathname;
                  if (!sessionStorage.getItem(key)) {
                    sessionStorage.setItem(key, '1');
                    location.reload();
                  }
                }
              }
              // Catches sync errors
              window.addEventListener('error', function(e) {
                handleChunkError(e && e.message);
              });
              // Catches async/dynamic import errors (ChunkLoadError comes as unhandledrejection)
              window.addEventListener('unhandledrejection', function(e) {
                var msg = e && e.reason && (e.reason.message || String(e.reason));
                handleChunkError(msg);
              });

            `,
          }}
        />
      </head>
      <body
        className={`antialiased`}
      >
        <PasswordGate>
          <Navbar />
          {children}
        </PasswordGate>
      </body>
    </html>
  );
}
