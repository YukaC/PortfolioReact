import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import { Fraunces, Manrope, Space_Grotesk } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "600"],
  display: "swap",
});

/** Display serif: the surname wordmark in the footer, and nothing else. */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  style: ["italic"],
  display: "swap",
});

function MyApp({ Component, pageProps }) {
  return (
    <div
      className={`${manrope.variable} ${spaceGrotesk.variable} ${fraunces.variable} root-layout`}
    >
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
