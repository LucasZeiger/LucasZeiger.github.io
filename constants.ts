import { ExperienceItem, EducationItem, Publication, Project } from './types';

export const SOCIAL_LINKS = {
  github: "https://github.com/LucasZeiger",
  linkedin: "https://linkedin.com/in/lucaszeiger",
  twitter: "https://twitter.com",
  scholar: "https://scholar.google.com"
};

export const ABOUT_TEXT = `I am a scientist dedicated to unraveling the complexities of colorectal cancer through the lens of spatial transcriptomics. My work bridges the gap between molecular biology and computational analysis, aiming to understand the tumor microenvironment's architecture and its influence on disease progression and therapeutic resistance. By preserving spatial context, we can decipher cell-cell communications that single-cell sequencing alone might miss.`;

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Spatial Atlas of Colorectal Tumors',
    category: 'Research',
    description: 'Mapping the immune landscape of colorectal cancer tissues using high-resolution spatial transcriptomics to identify spatially distinct immune niches.',
    imageUrl: 'https://picsum.photos/800/600?grayscale&blur=2',
    tags: ['Spatial Transcriptomics', 'Immunology', 'CRC', 'Data Analysis'],
    date: '2023 - Present'
  },
  {
    id: 'p2',
    title: 'Microenvironment Interaction Networks',
    category: 'Computational Biology',
    description: 'Developing graph-based deep learning models to predict cell-cell interaction probabilities based on spatial proximity and ligand-receptor expression profiles.',
    imageUrl: 'https://picsum.photos/800/601?grayscale&blur=2',
    tags: ['Deep Learning', 'Python', 'Network Analysis'],
    date: '2022 - 2023'
  },
  {
    id: 'p3',
    title: 'Single-Cell Integration Pipeline',
    category: 'Software',
    description: 'An open-source pipeline for integrating scRNA-seq data with spatial datasets to enhance resolution and impute missing genes.',
    imageUrl: 'https://picsum.photos/800/602?grayscale&blur=2',
    tags: ['R', 'Bioinformatics', 'Tool Development'],
    date: '2021 - 2022'
  }
];

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: 'e1',
    role: 'Postdoctoral Researcher',
    institution: 'Institute for Cancer Research',
    period: '2022 - Present',
    location: 'Boston, MA',
    description: [
      'Leading a project on spatial heterogeneity in metastatic colorectal cancer.',
      'Supervising 2 PhD students and managing lab computational resources.',
      'Developed novel algorithms for image-based transcriptomics alignment.'
    ]
  },
  {
    id: 'e2',
    role: 'PhD Candidate',
    institution: 'University of Heidelberg',
    period: '2018 - 2022',
    location: 'Heidelberg, Germany',
    description: [
      'Thesis: "Deciphering the T-cell exhaustion landscape in solid tumors".',
      'Published 3 first-author papers in high-impact journals.',
      'Collaborated with clinical partners to analyze patient biopsy cohorts.'
    ]
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