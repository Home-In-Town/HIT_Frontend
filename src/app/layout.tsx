import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeInTown | Intelligent Real Estate Sales Suite",
  description: "Identity and Intelligence for modern builders. Dynamic property websites and AI-powered lead qualification.",
  keywords: ["real estate", "sales", "AI", "lead qualification", "property websites"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
        </Providers>
          <Toaster
          position="top-right"
          toastOptions={{
            style: {
              zIndex: 9999,
            },
          }}
        />
      </body>
    </html>
  );
}
