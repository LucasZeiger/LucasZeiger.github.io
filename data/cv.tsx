import React from 'react';
import { ExperienceItem, EducationItem, Publication } from '../types';

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: 'e1',
    role: 'Postdoctoral research scientist, computational biology (PI: Crispin Miller)',
    institution: 'CRUK Scotland Institute',
    period: '11/2024 - Present',
    location: 'Glasgow, UK',
    description: 'Computational biology research with a focus on spatial transcriptomics.'
  },
  {
    id: 'e2',
    role: 'Postdoctoral research scientist, integrative modelling (PI: Xiao Fu)',
    institution: 'CRUK Scotland Institute',
    period: '03/2024 - 10/2024',
    location: 'Glasgow, UK',
    description: 'Computational biology research with a focus on spatial transcriptomics.'
  },
  {
    id: 'e3',
    role: 'Postdoctoral research scientist, colorectal cancer and Wnt signalling (PI: Owen Sansom)',
    institution: 'CRUK Scotland Institute',
    period: '07/2022 - 03/2024',
    location: 'Glasgow, UK',
    description: 'Investigating oncogenic PI3K signalling using genetically engineered mouse models of colon cancer.'
  },
  {
    id: 'e4',
    role: 'PhD studentship, colorectal cancer and Wnt signalling (PI: Owen Sansom)',
    institution: 'CRUK Scotland Institute',
    period: '10/2017 - 07/2022',
    location: 'Glasgow, UK',
    description: 'Investigating oncogenic PI3K signalling using genetically engineered mouse models of colon cancer.'
  },
  {
  id: 'e5',
  role: 'Masters thesis, department for infectiology, immunology, pneumology (PI: Ivan Tancevski)',
  institution: 'University clinic department for internal medicine II, Medical University of Innsbruck',
  period: '02/2017 - 09/2017',
  location: 'Innsbruck, Austria',
  description: 'CRISPR-Cas9 mediated KO of the lipid transporter in J774a.1 macrophages'
}
];

export const EDUCATION: EducationItem[] = [
  {
    id: 'ed1',
    degree: 'PhD in Cancer Science',
    institution: 'University of Glasgow',
    year: '2017 - 2022',
  },
  {
    id: 'ed2',
    degree: "Master's degree in Molecular Medicine",
    institution: 'Medical University of Innsbruck',
    year: '2015 - 2017',
  },
  {
    id: 'ed3',
    degree: "Bachelor's degree in Molecular Medicine",
    institution: 'Medical University of Innsbruck',
    year: '2012 - 2015',
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
