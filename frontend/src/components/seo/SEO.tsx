import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://www.snyprr.in';
const SITE_NAME = 'Snyprr.ai';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  /** Set true to block crawlers (auth pages, dashboard, admin) */
  noindex?: boolean;
  /** Override the OG image URL */
  ogImage?: string;
  /** 'website' for landing/info pages, 'article' for content pages */
  ogType?: 'website' | 'article';
}

/**
 * Drop-in SEO head manager.
 * Usage:
 *   <SEO title="Pricing" description="Choose a plan..." canonical="/pricing" />
 *
 * Full title becomes: "Pricing | Snyprr.ai"
 * Root page (title omitted): "Snyprr.ai — AI-Powered Market Intelligence"
 */
export default function SEO({
  title,
  description = 'Snyprr.ai — Study analyst desk setups with defined zones, track historical outcomes, and learn technical analysis across crypto, forex, and commodities.',
  canonical,
  noindex = false,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — AI-Powered Market Intelligence`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      {/* Core */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
