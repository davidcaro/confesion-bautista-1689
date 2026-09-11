import type { Metadata } from "next";
import { headers } from "next/headers";
import IdentityCallback from "./identity-callback";
import SmoothScroll from "./smooth-scroll";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title: { default: "Confesión Bautista de 1689", template: "%s · 1689" },
    description: "Una edición digital, navegable y organizada de la Confesión Bautista de Fe de 1689.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Confesión Bautista de 1689",
      description: "32 capítulos · lectura y búsqueda",
      images: [{ url: image, width: 1536, height: 1024, alt: "Confesión Bautista de 1689" }],
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />
      </head>
      <body><SmoothScroll /><IdentityCallback>{children}</IdentityCallback></body>
    </html>
  );
}
