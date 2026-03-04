// Dynamic SEO tags per route using react-helmet-async
import { Helmet } from 'react-helmet-async';

interface PageSEOProps {
  title: string;
  description: string;
  path?: string;
  type?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
  image?: string;
  keywords?: string;
}

const BASE_URL = 'https://baseddata.lovable.app';
const DEFAULT_OG_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/9aZVPuZmR5Mw1HuAtIjnBaMHjmm1/social-images/social-1772368200933-ChatGPT_Image_Mar_1,_2026_at_07_29_25_AM.webp';

export function PageSEO({ title, description, path = '', type = 'website', jsonLd, noindex, image, keywords }: PageSEOProps) {
  const fullTitle = title.includes('BasedData') ? title : `${title} | BasedData`;
  const url = `${BASE_URL}${path}`;
  const ogImage = image || DEFAULT_OG_IMAGE;
  // Truncate description to 160 chars for SEO best practice
  const metaDesc = description.length > 160 ? description.slice(0, 157) + '...' : description;

  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="BasedData" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@baseddata" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={ogImage} />
      
      {/* Canonical */}
      <link rel="canonical" href={url} />
      
      {/* JSON-LD */}
      {jsonLdArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
