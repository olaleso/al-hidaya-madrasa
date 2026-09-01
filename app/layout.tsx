import type { Metadata } from "next";
import "./globals.css";
import "./mobile.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://al-hidaya-madrasat.olaleso.chatgpt.site"),
  title: "Al-Hidaya Madrasat | Guidance, Knowledge & Community",
  description: "Islamic education and connected madrasat services for children and families at Al-Hidaya Islamic Centre, Bolton.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: { title: "Al-Hidaya Madrasat", description: "Guidance, knowledge and community in Bolton.", images: [{url:"/og.png",width:1536,height:1024,alt:"Al-Hidaya Madrasat"}] },
  twitter: { card:"summary_large_image", title:"Al-Hidaya Madrasat", description:"Guidance, knowledge and community in Bolton.", images:["/og.png"] }
};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
