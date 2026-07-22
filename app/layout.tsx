import type { Metadata } from "next";
import "./globals.css";
import "./motor-city-modern.css";

export const metadata: Metadata = {
  title: "Detroit Connect | Interactive Preview",
  description: "A trusted network for finding local help, neighborhood insight, and practical guidance in Detroit.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
