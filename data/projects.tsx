import React from 'react';
import { Project } from '../types';
import spatialMapk from './images/spatial_mapk.png';
import Slc7a5 from './images/Slc7a5.png';

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'Spatially resolving MAPK dependent CRC plasticiy',
    category: "Research",
    description: 'Spatial transcriptomics analysis of colorectal cancer and metastases in genetically engineered mouse models.',
    longDescription: (
      <>
        <p className="mb-4">
          In collaboration with the colorectal cancer and Wnt signalling group at the CRUK SI, we could demonstrate how 
          colorectal cancer cells are able to shift their phenotype in the context of hyperactive MAPK signalling. 
        </p>
        <p>
          We used a custom 100 gene panel to spatially resolve cellular plasticity in primary tumors and liver metastases.
          The publication is available at Nature.com - DOI to follow.
          The datasets are available at Zenodo - DOI to follow. 
        </p>
      </>
    ),
    openQuestions: [
      'How do we exploit the fact that we can switch cell phenotypes using MAPK inhibitors?',
      'We observed interesting signalling gradients in metastases - how can we better describe these?',
      'Is there correlation between histological phenotype and gene expression programs that are altered as cells shift phenotype?'
    ],
    imageUrl: spatialMapk,
    tags: ['Spatial Transcriptomics', 'Xenium', 'Colorectal cancer', "Mouse models", "Cell Plasticity", "Signalling"],
    date: 'Published 2025',
    link: 'TBC',
    github: 'TBC'
  },
  {
    id: 'p2',
    title: 'SLC7A5: An amino acid transporter fuelling colorectal cancer growth',
    category: 'Research',
    description: 'Development of PI3-Kinase hyperactive mouse models and identification of SLC7A5 as a therapeutic target.',
    longDescription: (
      <>
        <p className="mb-4">
          We developed a suite of genetically engineered mouse models of colorectal cancer, harbouring mutations in the PI3-Kinase signalling pathway
          in combination with other common CRC driver mutations, including APC and KRAS. 
          We found the amino acid transporter SLC7A5 to be upregulated in PI3K mutant tumours, and could show that its genetic deletion
          leads to a significant extension of survival in these models.
          Cells display expression of a set of stress response genes and altered amino acid metabolism upon SLC7A5 deletion and in Kras mutant
          models, SLC7A5 deletion enhances efficacy of MAPK inhibition to extend survival.  
        </p>
        <p>
          The paper is currently under review at Nature Communications and the preprint can be read here: https://www.researchsquare.com/article/rs-5002395/v1.
        </p>
      </>
    ),
    openQuestions: [
      'What is the full scope of cellular adaptiations upon Slc7a5 deletion, are there any synthetic lethalities we could exploit?',
      'What setting will Slc7a5 depletion work best in the clinic?',
      'Viewing tumours as ecosystems, what is the impact of Slc7a5 deletion on the local availability of nutrients?'
    ],
    imageUrl: Slc7a5,
    tags: ['Disease modelling', 'Genetically engineered mouse models', 'PI3K signalling', "Colorectal Cancer", "Metabolism", "Slc7a5"],
    date: '2017 - ongoing',
    link: 'https://www.researchsquare.com/article/rs-5002395/v1',
    github: 'NA'
  },
];
