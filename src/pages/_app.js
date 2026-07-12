import "@/styles/globals.css";
import { Manrope, Space_Grotesk } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "700"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["600", "700"],
  display: "swap",
});

function MyApp({ Component, pageProps }) {
  return (
    <div className={`${manrope.variable} ${spaceGrotesk.variable} root-layout`}>
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
