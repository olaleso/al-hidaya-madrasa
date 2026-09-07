import type { Metadata } from "next";
import "./globals.css";
import "./mobile.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://al-hidaya-madrasat.olaleso.chatgpt.site"),
  title: "Al-Hidaya Islamic Centre | Faith, Knowledge & Skills",
  description: "Qur’an, Islamic and Arabic Studies, children’s Madrasah, adult classes, and academic and digital learning support for the Bolton community.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "Al-Hidaya Islamic Centre", description: "Faith, knowledge and practical learning for every generation in Bolton.", images: [{url:"/og.png",width:1536,height:1024,alt:"Al-Hidaya Islamic Centre"}] },
  twitter: { card:"summary_large_image", title:"Al-Hidaya Islamic Centre", description:"Faith, knowledge and practical learning for every generation in Bolton.", images:["/og.png"] }
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
