import Script from "next/script";

export function shouldLoadPublicAnalytics(gaId: string | undefined) {
  return Boolean(gaId);
}

export function getPublicAnalyticsConfig(gaId: string | undefined) {
  if (!shouldLoadPublicAnalytics(gaId)) return null;
  return {
    scriptSrc: `https://www.googletagmanager.com/gtag/js?id=${gaId}`,
    inlineId: "ga-init"
  };
}

// Public-only analytics boundary.
// This component is intentionally used on marketing pages only (for now `/`).
// Do not import this inside `/login` or protected `/o/:orgSlug/*` routes.
export function PublicAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const config = getPublicAnalyticsConfig(gaId);
  if (!config || !gaId) return null;

  return (
    <>
      <Script src={config.scriptSrc} strategy="afterInteractive" />
      <Script id={config.inlineId} strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`}
      </Script>
    </>
  );
}
