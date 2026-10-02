import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import { PassThrough } from 'node:stream';
import { AppContent } from '../App';
export { SITE_ROUTES, SITE_URL, getRouteMetadata } from '../data/siteRoutes';
export { getLegacyRedirect } from '../routing';

export const render = (path: string): Promise<string> => new Promise((resolve, reject) => {
  const output = new PassThrough();
  let html = '';
  output.setEncoding('utf8');
  output.on('data', chunk => { html += chunk; });
  output.on('end', () => resolve(html));
  output.on('error', reject);
  const stream = renderToPipeableStream(
    <StaticRouter location={path}><AppContent /></StaticRouter>,
    {
      onAllReady() { stream.pipe(output); },
      onError(error) { reject(error); }
    }
  );
});
