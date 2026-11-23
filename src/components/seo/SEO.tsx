
import { Helmet } from "react-helmet-async";
import { seoConfig } from "../../config/seo.config";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}

export default function SEO({
  title,
  description = seoConfig.defaultDescription,
  path = "/",
  image = seoConfig.defaultImage,
  noIndex = false,
}: SEOProps) {
  const pageTitle = title
    ? `${title} | ${seoConfig.siteName}`
    : seoConfig.defaultTitle;

  const canonicalUrl = new URL(
    path,
    `${seoConfig.siteUrl}/`
  ).toString();

  const imageUrl = new URL(
    image,
    `${seoConfig.siteUrl}/`
  ).toString();

  return (
    <Helmet>
      <title>{pageTitle}</title>

      <meta name="description" content={description} />

      <meta
        name="robots"
        content={
          noIndex
            ? "noindex, nofollow"
            : "index, follow"
        }
      />

      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:site_name" content={seoConfig.siteName} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
}
