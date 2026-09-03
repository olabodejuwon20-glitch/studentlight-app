import { Helmet } from "react-helmet-async";

type Props = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
};

const SITE = import.meta.env.VITE_SITE_URL ?? "https://legacyskool.com";

export default function SEO({ title, description, path, type = "website" }: Props) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}