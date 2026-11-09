import PrivacyPage from "@/components/PrivacyPage";
import { privacyMetadata } from "@/lib/seo";

/** English privacy page: `/privacy`. */
export const metadata = privacyMetadata("en");

export default function PrivacyRoute() {
  return <PrivacyPage locale="en" />;
}
