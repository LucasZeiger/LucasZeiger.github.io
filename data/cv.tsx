import React from 'react';
import { ExperienceItem, EducationItem, Publication } from '../types';

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: 'e1',
    role: 'Postdoctoral Researcher',
    institution: 'Institute for Cancer Research',
    period: '2022 - Present',
    location: 'Boston, MA',
    description: (
      <ul className="list-disc list-outside ml-4 space-y-1 text-neutral-400">
        <li>Leading a project on <strong className="text-neutral-300">spatial heterogeneity</strong> in metastatic colorectal cancer.</li>
        <li>Supervising 2 PhD students and managing lab computational resources.</li>
        <li>Developed novel algorithms for image-based transcriptomics alignment.</li>
      </ul>
    )
  },
  {
    id: 'e2',
    role: 'PhD Candidate',
    institution: 'University of Heidelberg',
    period: '2018 - 2022',
    location: 'Heidelberg, Germany',
    description: (
      <ul className="list-disc list-outside ml-4 space-y-1 text-neutral-400">
        <li>Thesis: <em className="text-neutral-300">"Deciphering the T-cell exhaustion landscape in solid tumors"</em>.</li>
        <li>Published 3 first-author papers in high-impact journals.</li>
        <li>Collaborated with clinical partners to analyze patient biopsy cohorts.</li>
      </ul>
    )
  }
];

export const EDUCATION: EducationItem[] = [
  {
    id: 'ed1',
    degree: 'Ph.D. in Molecular Biology',
    institution: 'University of Heidelberg',
    year: '2022',
    details: 'Magna Cum Laude'
  },
  {
    id: 'ed2',
    degree: 'M.Sc. in Bioinformatics',
    institution: 'Technical University of Munich',
    year: '2018',
  },
  {
    id: 'ed3',
    degree: 'B.Sc. in Biology',
    institution: 'University of Freiburg',
    year: '2016',
  }
];

export const PUBLICATIONS: Publication[] = [
  {
    id: 'pub1',
    title: 'Spatially resolved transcriptomics reveals distinct immune microenvironments in colorectal cancer',
    journal: 'Nature Genetics',
    year: 2023,
    authors: 'Zeiger L., et al.'
  },
  {
    id: 'pub2',
    title: 'Graph neural networks for cell interaction prediction',
    journal: 'Bioinformatics',
    year: 2022,
    authors: 'Zeiger L., Smith J., Doe A.'
  },
  {
    id: 'pub3',
    title: 'Integrative analysis of single-cell and spatial data',
    journal: 'Cell Systems',
    year: 2021,
    authors: 'Muller K., Zeiger L.'
  }
];