import React from 'react';
import { Project } from '../types';

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Spatial Atlas of Colorectal Tumors',
    category: 'Research',
    description: 'Mapping the immune landscape of colorectal cancer tissues using high-resolution spatial transcriptomics.',
    longDescription: (
      <>
        <p className="mb-4">
          This project aims to construct a comprehensive <strong>3D spatial atlas</strong> of the colorectal tumor microenvironment. By leveraging multiplexed error-robust fluorescence in situ hybridization (MERFISH) and sequencing-based spatial transcriptomics, we are mapping the localization of over 50 distinct cell types.
        </p>
        <p>
          The study focuses on the transition zones between normal tissue, invasive margins, and the tumor core, revealing how <em className="text-neutral-300">immune exclusion zones</em> form and persist.
        </p>
      </>
    ),
    openQuestions: [
      'How do tertiary lymphoid structures organize spatially to promote anti-tumor immunity?',
      'What are the spatial determinants of T-cell exhaustion in the invasive margin?',
      'Can spatial patterns predict response to immune checkpoint blockade?'
    ],
    imageUrl: 'https://picsum.photos/800/600?grayscale&blur=2',
    tags: ['Spatial Transcriptomics', 'Immunology', 'CRC', 'Data Analysis'],
    date: '2023 - Present',
    link: 'https://nature.com',
    github: 'https://github.com/LucasZeiger/crc-atlas'
  },
  {
    id: 'p2',
    title: 'Microenvironment Interaction Networks',
    category: 'Computational Biology',
    description: 'Developing graph-based deep learning models to predict cell-cell interaction probabilities.',
    longDescription: (
      <>
        <p className="mb-4">
          We developed "SpatialGraph," a Graph Neural Network (GNN) framework designed to infer cell-cell communication networks from spatial transcriptomics data. Unlike traditional ligand-receptor analysis which ignores distance, SpatialGraph incorporates physical proximity and local tissue architecture to weight interaction probabilities.
        </p>
        <p>
          This approach has successfully identified novel <strong>fibroblast-macrophage signaling loops</strong> driving fibrosis.
        </p>
      </>
    ),
    openQuestions: [
      'Can we infer causality in cell-cell interactions from static snapshot data?',
      'How do interaction networks rewire during metastatic progression?',
      'What is the minimum spatial resolution required to accurately model paracrine signaling?'
    ],
    imageUrl: 'https://picsum.photos/800/601?grayscale&blur=2',
    tags: ['Deep Learning', 'Python', 'Network Analysis'],
    date: '2022 - 2023',
    link: 'https://biorxiv.org',
    github: 'https://github.com/LucasZeiger/spatial-graph'
  },
  {
    id: 'p3',
    title: 'Single-Cell Integration Pipeline',
    category: 'Software',
    description: 'An open-source pipeline for integrating scRNA-seq data with spatial datasets to enhance resolution.',
    longDescription: (
      <>
        <p className="mb-4">
          This software suite solves the "missing modality" problem by integrating high-depth single-cell RNA sequencing data with high-resolution, low-depth spatial data. Using a probabilistic transfer learning approach, we impute genome-wide expression profiles onto spatial coordinates.
        </p>
        <p>
          Effectively, this increases the information content of spatial slides by <strong>10-fold</strong>, allowing for more granular cluster annotation.
        </p>
      </>
    ),
    openQuestions: [
      'How do we quantify uncertainty in spatially imputed gene expression?',
      'Can this integration extend to multi-omics data like ATAC-seq and proteomics?',
      'What are the computational limits when scaling to whole-slide imaging?'
    ],
    imageUrl: 'https://picsum.photos/800/602?grayscale&blur=2',
    tags: ['R', 'Bioinformatics', 'Tool Development'],
    date: '2021 - 2022',
    github: 'https://github.com/LucasZeiger/sc-integration'
  }
];
