import PrivacyPage from "@/components/PrivacyPage";
import { SUPPORTED_LOCALES } from "@/i18n/locale";
import { privacyMetadata } from "@/lib/seo";

/** Translated privacy pages: `/es/privacy`, `/pt/privacy`. */
export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.filter((locale) => locale !== "en").map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return privacyMetadata(lang);
}

export default async function LocalizedPrivacyRoute({ params }) {
  const { lang } = await params;
  return <PrivacyPage locale={lang} />;
}
