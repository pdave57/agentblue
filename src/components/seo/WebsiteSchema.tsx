import { seoConfig } from "../../config/seo.config";

export default function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Agent Bleu",
    url: `${seoConfig.siteUrl}/`,
    description: seoConfig.defaultDescription,
    inLanguage: "en",
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