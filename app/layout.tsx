import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "./session-provider";

// Mapbox GL JS (required by KindnessMap)
const MapboxScript = () => (
  <script
    src="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js"
    crossOrigin="anonymous"
  />
);

const MapboxCSS = () => (
  <link
    rel="stylesheet"
    href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css"
    crossOrigin="anonymous"
  />
);

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || "";

export const metadata: Metadata = {
  title: "Universe of Kindness | PaySeeWhoPay",
  description:
    "Leave a kind wish for $1 and see how many people are spreading kindness around the world",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <MapboxCSS />
        <meta name="mapbox-token" content={MAPBOX_TOKEN} />
      </head>
      <body>
        <MapboxScript />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
