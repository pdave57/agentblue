
import { seoConfig } from "../../config/seo.config";

export default function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Agent Bleu",
    url: `${seoConfig.siteUrl}/`,
    logo: `${seoConfig.siteUrl}/logo.png`,
    description: seoConfig.defaultDescription,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}
