import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** GitHub Pages subdirectory — must match experiments.baseUrl in app.json */
const BASE = '/riftbound-companion';

/**
 * Web-only root HTML for static export / SSR.
 * Runs in Node during `expo export --platform web`; no DOM APIs here.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0B1220" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Riftbound Companion" />
        <link rel="manifest" href={`${BASE}/manifest.json`} />
        <link rel="apple-touch-icon" href={`${BASE}/icon-192.png`} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: rootCss }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const rootCss = `
html, body, #root {
  height: 100%;
  background-color: #0B1220;
}
body {
  margin: 0;
  overflow: hidden;
}
`;
