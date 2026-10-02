export const getLegacyRedirect = (url: URL): string | null => {
  if (!/^https?:$/.test(url.protocol) || !url.hash.startsWith('#/')) {
    return null;
  }
  const target = new URL(url.hash.slice(1), url.origin);
  // Never allow a fragment to redirect a visitor to another origin.
  return target.origin === url.origin ? `${target.pathname}${target.search}${target.hash}` : null;
};
