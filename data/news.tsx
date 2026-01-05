import React from 'react';
import { NewsItem } from '../types';

export const NEWS: NewsItem[] = [
  {
    id: 'merry-christmas-2025',
    title: 'Merry Christmas and a happy new year!',
    date: '2025-12-24',
    displayDate: '24 Dec 2025',
    summary: 'Snowy greetings from Austria.',
    body: (
      <>
        <p>Wishing everyone a restful holiday season and a happy new year!</p>
      </>
    )
  },
  {
    id: 'mapk-plasticity-nature-2025',
    title: 'Early access publication: MAPK-driven epithelial cell plasticity',
    date: '2025-11-24',
    displayDate: '24 Nov 2025',
    summary: 'Accelerated early access publication in Nature.',
    body: (
      <>
        <p>
          Our manuscript, &quot;MAPK-driven epithelial cell plasticity drives colorectal cancer therapeutic resistance,&quot; is now
          available as an accelerated early access publication in Nature.
        </p>
        <p className="mt-4">
          Read the paper at
          <a
            className="text-emerald-400 hover:text-emerald-300 ml-1"
            href="https://www.nature.com/articles/s41586-025-09916-w"
            target="_blank"
            rel="noreferrer"
          >
            nature.com
          </a>
          , and view the analysis workflow at
          <a
            className="text-emerald-400 hover:text-emerald-300 ml-1"
            href="https://github.com/LucasZeiger/MAPK-Plasticity"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          .
        </p>
      </>
    )
  },
  {
    id: 'muspan-workshop-2025',
    title: 'MuSpAn advanced workshop in Glasgow',
    date: '2025-10-27',
    displayDate: '27-30 Oct 2025',
    summary: 'Attended MuSpAn at CRUK SI led by Josh Moore and Josh Bull.',
    body: (
      <>
        <p>
          Attended the MuSpAn advanced workshop at CRUK Scotland Institute in Glasgow, led by Josh Moore and Josh Bull.
          Thanks for the great workshop and community.
        </p>
      </>
    )
  },
  {
    id: 'spatial-biology-conference-2025',
    title: 'Spatial Biology, the melting pot conference',
    date: '2025-10-14',
    displayDate: '14-17 Oct 2025',
    summary: 'Presented Poster at the Spatial Biology Society conference at EMBL Heidelberg.',
    body: (
      <>
        <p>
          Presented a poster at the &quot;Spatial Biology, the melting pot&quot; conference at the EMBL Advanced Training Centre in Heidelberg.
        </p>
        <p className="mt-4">
          Details at
          <a
            className="text-emerald-400 hover:text-emerald-300 ml-1"
            href="https://spatialbiologysociety.eu/conference-2025"
            target="_blank"
            rel="noreferrer"
          >
            spatialbiologysociety.eu
          </a>
          .
        </p>
      </>
    )
  },
  {
    id: 'febs-openbio-poster-prize-2025',
    title: 'FEBS-IUBMB-Enable conference and OpenBio poster prize',
    date: '2025-09-10',
    displayDate: '10-12 Sep 2025',
    summary: 'Attended FEBS-IUBMB-Enable and won the FEBS OpenBio poster prize.',
    body: (
      <>
        <p>
          Attended the FEBS-IUBMB-Enable conference in Glasgow and won the FEBS OpenBio poster prize.
        </p>
        <p className="mt-4">
          Conference info at
          <a
            className="text-emerald-400 hover:text-emerald-300 ml-1"
            href="https://febs-iubmb-enableconference.org/glasgow-2025-2/"
            target="_blank"
            rel="noreferrer"
          >
            febs-iubmb-enableconference.org
          </a>
          , and the prize announcement at
          <a
            className="text-emerald-400 hover:text-emerald-300 ml-1"
            href="https://febs.onlinelibrary.wiley.com/hub/journal/22115463/febs-congress"
            target="_blank"
            rel="noreferrer"
          >
            febs.onlinelibrary.wiley.com
          </a>
          .
        </p>
      </>
    )
  },
  {
    id: 'beatson-cancer-conference-2025',
    title: 'Beatson International Cancer Conference: Cancer Models',
    date: '2025-05-27',
    displayDate: '27-29 May 2025',
    summary: 'Attended the Beatson International Cancer Conference in Glasgow.',
    body: (
      <>
        <p>
          Attended the Beatson International Cancer Conference - Cancer Models: From data to discovery, at the Glasgow Science Centre.
        </p>
        <p className="mt-4">
          Details at
          <a
            className="text-emerald-400 hover:text-emerald-300 ml-1"
            href="https://www.beatsonconference.org/"
            target="_blank"
            rel="noreferrer"
          >
            beatsonconference.org
          </a>
          . Already looking forward to the next one!
        </p>
      </>
    )
  },
  {
    id: 'crispin-miller-group-2025',
    title: 'Joined Prof. Crispin Miller to work in the Computational biology group at CRUK Scotland Institute',
    date: '2025-05-01',
    displayDate: '1 May 2025',
    summary: 'Started a 3+3 year contract in the computational biology group.',
    body: (
      <>
        <p>
          Started a position in Prof. Crispin Miller&apos;s group as a postdoctoral research scientist at the CRUK Scotland Institute on a 3+3 year contract.
        </p>
      </>
    )
  },
  {
    id: 'slc7a5-manuscript-2024',
    title: 'First-author manuscript available: SLC7A5 drives PI3K-mutant intestinal cancer',
    date: '2024-09-26',
    displayDate: '26 Sep 2024',
    summary: 'Research Square preprint available; revisions are underway.',
    body: (
      <>
        <p>
          My latest first-author manuscript preprint, &quot;The amino acid transporter SLC7A5 drives progression of PI3K-mutant intestinal
          cancer models and enhances response to MAPK-targeted therapy,&quot; is available on Research Square.
        </p>
        <p className="mt-4">
          Read it at
          <a
            className="text-emerald-400 hover:text-emerald-300 ml-1"
            href="https://www.researchsquare.com/article/rs-5002395/v1"
            target="_blank"
            rel="noreferrer"
          >
            researchsquare.com
          </a>
          . Revisions addressing five reviewers&apos; comments are underway.
        </p>
      </>
    )
  }
];
