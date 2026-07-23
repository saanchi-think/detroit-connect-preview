import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./approved-theme.css";

export const metadata: Metadata = {
  title: "Detroit Connect",
  description: "A premium relocation network for trusted Detroit connectors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
