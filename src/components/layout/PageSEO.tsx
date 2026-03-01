// Dynamic SEO tags per route using react-helmet-async
import { Helmet } from 'react-helmet-async';

interface PageSEOProps {
  title: string;
  description: string;
  path?: string;
  type?: string;
  jsonLd?: Record<string, any>;
}

const BASE_URL = 'https://baseddata.lovable.app';

export function PageSEO({ title, description, path = '', type = 'website', jsonLd }: PageSEOProps) {
  const fullTitle = title.includes('BasedData') ? title : `${title} — BasedData`;
  const url = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <link rel="canonical" href={url} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
