import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getRouteMetadata } from '../data/siteRoutes';

const RouteEffects = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = getRouteMetadata(pathname);
    document.title = metadata.title;
    const values = {
      'meta[name="description"]': metadata.description,
      'meta[property="og:title"]': metadata.title,
      'meta[property="og:description"]': metadata.description,
      'meta[property="og:url"]': metadata.url,
      'meta[name="twitter:title"]': metadata.title,
      'meta[name="twitter:description"]': metadata.description
    };
    Object.entries(values).forEach(([selector, content]) => {
      document.querySelector(selector)?.setAttribute('content', content);
    });
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', metadata.url);
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default RouteEffects;
