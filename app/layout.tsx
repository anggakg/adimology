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
              // Auto-reload on ChunkLoadError (stale deploy cache)
              window.addEventListener('error', function(e) {
                if (e && e.message && (
                  e.message.includes('ChunkLoadError') ||
                  e.message.includes('Loading chunk') ||
                  e.message.includes('Failed to fetch dynamically imported module')
                )) {
                  var key = 'chunk_reload_' + location.pathname;
                  if (!sessionStorage.getItem(key)) {
                    sessionStorage.setItem(key, '1');
                    location.reload();
                  }
                }
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
