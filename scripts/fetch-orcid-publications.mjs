import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORCID = '0000-0002-8712-3112';
const BASE_URL = `https://pub.orcid.org/v3.0/${ORCID}`;
const OUTPUT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'orcid-publications.json');

const getValue = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'value' in value) return value.value || undefined;
  return undefined;
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`ORCID request failed: ${response.status} ${response.statusText} for ${url}`);
  }

  return response.json();
};

const fetchWorks = async () => {
  const works = await fetchJson(`${BASE_URL}/works`);
  const groups = Array.isArray(works?.group) ? works.group : [];
  const putCodes = new Set();

  for (const group of groups) {
    const summaries = Array.isArray(group?.['work-summary']) ? group['work-summary'] : [];
    for (const summary of summaries) {
      if (summary?.['put-code'] !== undefined && summary?.['put-code'] !== null) {
        putCodes.add(String(summary['put-code']));
      }
    }
  }

  const publications = [];

  for (const putCode of putCodes) {
    const work = await fetchJson(`${BASE_URL}/work/${putCode}`);
    const title = getValue(work?.title?.title) || 'Untitled';
    const journal = getValue(work?.['journal-title']) || '';
    const year = Number(getValue(work?.['publication-date']?.year)) || 0;
    const type = getValue(work?.type) || undefined;

    const contributors = Array.isArray(work?.contributors?.contributor)
      ? work.contributors.contributor
      : [];
    const authors = contributors
      .map((contributor) => getValue(contributor?.['credit-name']))
      .filter(Boolean)
      .join('; ');

    const externalIds = Array.isArray(work?.['external-ids']?.['external-id'])
      ? work['external-ids']['external-id']
      : [];

    const doiEntry =
      externalIds.find((entry) => entry?.['external-id-type'] === 'doi' && entry?.['external-id-relationship'] === 'self') ||
      externalIds.find((entry) => entry?.['external-id-type'] === 'doi');

    const doi = getValue(doiEntry?.['external-id-value']);
    const url = getValue(work?.url) || getValue(doiEntry?.['external-id-url']);

    publications.push({
      id: String(work?.['put-code'] ?? putCode),
      title,
      journal,
      year,
      authors: authors || 'Authors not listed',
      doi: doi || undefined,
      url: url || undefined,
      orcidUrl: `https://orcid.org/${ORCID}`,
      type,
    });
  }

  publications.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.title.localeCompare(b.title);
  });

  return {
    orcid: ORCID,
    updatedAt: new Date().toISOString(),
    publications,
  };
};

const main = async () => {
  const data = await fetchWorks();
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(data, null, 2));
  console.log(`Wrote ${data.publications.length} publications to ${OUTPUT_PATH}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
