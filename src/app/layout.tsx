import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/navbar";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "autoporfonager. | Control Total, Cero Fricción",
  description:
    "Plataforma institucional de trading cuantitativo multi-estrategia, optimización continua de capital y conciliación en tiempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-slate-canvas text-navy font-sans antialiased flex flex-col selection:bg-tech-blue/20 selection:text-navy">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="border-t border-slate-subtle bg-white/80 backdrop-blur-md py-6 text-center text-xs text-slate-muted">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-navy">autoporfonager<span className="text-emerald-success">.</span></span>
                <span className="text-slate-300">|</span>
                <span>Tech Clarity & Human Simplicity</span>
              </div>
              <div>
                Central Engine v1.0 · Multi-Strategy Portfolio Allocation & MOC Execution
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

