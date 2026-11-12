import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TIGER PITCH - AI投資家交渉ゲーム",
  description:
    "5人のAI投資家（虎）と交渉し、1億円の出資を目指すピッチバトルゲーム",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "TIGER PITCH - AI投資家交渉ゲーム",
    description:
      "5人のAI投資家（虎）と交渉し、1億円の出資を目指すピッチバトルゲーム",
    siteName: "TIGER PITCH - Universal Make Associates",
    images: [
      {
        url: "/ogp.jpg",
        width: 1200,
        height: 630,
        alt: "TIGER PITCH - AI投資家交渉ゲーム",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TIGER PITCH - AI投資家交渉ゲーム",
    description:
      "5人のAI投資家（虎）と交渉し、1億円の出資を目指すピッチバトルゲーム",
    images: ["/ogp.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
