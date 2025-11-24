import React from 'react';
import { ExperienceItem, EducationItem, Publication } from '../types';

export const EXPERIENCE: ExperienceItem[] = [
  {
    id: 'e1',
    role: 'Postdoctoral Research Scientist, Computational Biology (with Prof. Crispin Miller)',
    institution: 'CRUK Scotland Institute',
    period: '11/2024 - Present',
    location: 'Glasgow, UK',
    description: 'Computational biology research with a focus on spatial transcriptomics.'
  },
  {
    id: 'e2',
    role: 'Postdoctoral Research Scientist, Integrative Modelling (with Xiao Fu, Phd)',
    institution: 'CRUK Scotland Institute',
    period: '03/2024 - 10/2024',
    location: 'Glasgow, UK',
    description: 'Computational biology research with a focus on spatial transcriptomics.'
  },
  {
    id: 'e3',
    role: 'Postdoctoral Research Scientist, Colorectal Cancer and Wnt Signalling (with Prof. Owen Sansom)',
    institution: 'CRUK Scotland Institute',
    period: '07/2022 - 03/2024',
    location: 'Glasgow, UK',
    description: 'Investigating oncogenic PI3K signalling using genetically engineered mouse models of colon cancer.'
  },
  {
    id: 'e4',
    role: 'PhD Studentship, Colorectal Cancer and Wnt Signalling (with Prof. Owen Sansom)',
    institution: 'CRUK Scotland Institute',
    period: '10/2017 - 07/2022',
    location: 'Glasgow, UK',
    description: 'Investigating oncogenic PI3K signalling using genetically engineered mouse models of colon cancer.'
  },
  {
  id: 'e5',
  role: 'Master\'s Thesis, Department of Infectiology, Immunology, Pneumology (with Prof. Ivan Tancevski)',
  institution: 'University clinic department for internal medicine II, Medical University of Innsbruck',
  period: '02/2017 - 09/2017',
  location: 'Innsbruck, Austria',
  description: 'CRISPR-Cas9 mediated KO of the lipid transporter in J774a.1 macrophages'
  },
  {
  id: 'e5',
  role: 'Bachelor\'s Thesis, Department of  Physiology & Medical Physics (with Prof. Bernhard Flucher)',
  institution: 'Medical University of Innsbruck',
  period: '03/2015 - 09/2015',
  location: 'Innsbruck, Austria',
  description: 'Expression of Stac3 in dysgenic myotubes'
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
    id: 'pub0',
    title: 'MAPK-driven epithelial cell plasticity drives colorectal cancer therapeutic resistance',
    journal: 'Nature',
    year: 2025,
    authors: (
      <>
        White, Mark; Mills, Megan L.; Millett, Laura M.; Gilroy, Kathryn; Hong, Yourae; <strong>Zeiger, Lucas B.</strong>; Simpson, Rosalin J.; Corry, Shania M.; Ligeza, Amelia; Lannagan, Tamsin R. M.; Susanti, Susanti; Ridgway, Rachel A.; Yazgili, Ayse S.; Grzesiak, Lucile; Amirkhah, Raheleh; Ford, Catriona A.; Vlahov, Nikola; Tovell, Hannah; Officer-Jones, Leah; Ficken, Catherine; Pennie, Rachel; Najumudeen, Arafath K.; Raven, Alexander; Nasreddin, Nadia; Chauhan, Ekansh; Papanastasiou, Andrew S.; Nixon, Colin; Morrison, Vivienne; Jackstadt, Rene; Graham, Janet S.; Miller, Crispin J.; Ross, Sarah J.; Barry, Simon T.; Pavet, Valeria; Wilson, Richard H.; Le Quesne, John; Dunne, Philip D.; Tejpar, Sabine; Leedham, Simon; Campbell, Andrew D.; Sansom, Owen J.
      </>
    )
  },
  {
    id: 'pub1',
    title: 'The amino acid transporter SLC7A5 drives progression of PI3K-mutant intestinal cancer models and enhances response to MAPK-targeted therapy',
    journal: 'Research Square',
    year: 2024,
    authors: (
      <>
        <strong>Zeiger, Lucas B.</strong>; Ford, Catriona; Millett, Laura; Meniel, Valerie; Najumudeen, Arafath; Pennel, Kathryn; Fisher, Natalie; Gilroy, Kathryn; Sphyris, Nathalie; Uribe, Alejandro Huerta; Sumpton, David; Hatthakarnkul, Phimmada; McLaughlin, Sophie; Jones, Phil; Vanhaesebroeck, Bart; Ridgway, Rachel; Nixon, Colin; Pearson, Helen; Phesse, Toby; Barry, Simon; Edwards, Joanne; Dunne, Philip; Campbell, Andrew; Sansom, Owen
      </>
    )
  },
  {
    id: 'pub2',
    title: 'Metabolic profiling stratifies colorectal cancer and reveals adenosylhomocysteinase as a therapeutic target',
    journal: 'Nature Metabolism',
    year: 2023,
    authors: (
      <>
        Vande Voorde, Johan; Steven, Rory T.; Najumudeen, Arafath K.; Ford, Catriona A.; Dexter, Alex; Gonzalez-Fernandez, Ariadna; Nikula, Chelsea J.; Xiang, Yuchen; Ford, Lauren; Maneta Stavrakaki, Stefania; Gilroy, Kathryn; <strong>Zeiger, Lucas B.</strong>; Pennel, Kathryn; Hatthakarnkul, Phimmada; Elia, Efstathios A.; Nasif, Ammar; Murta, Teresa; Manoli, Eftychios; Mason, Sam; Gillespie, Michael; Lannagan, Tamsin R. M.; Vlahov, Nikola; Ridgway, Rachel A.; Nixon, Colin; Raven, Alexander; Mills, Megan; Athineos, Dimitris; Kanellos, Georgios; Nourse, Craig; Gay, David M.; Hughes, Mark; Burton, Amy; Yan, Bin; Sellers, Katherine; Wu, Vincen; De Ridder, Kobe; Shokry, Engy; Huerta Uribe, Alejandro; Clark, William; Clark, Graeme; Kirschner, Kristina; Thienpont, Bernard; Li, Vivian S. W.; Maddocks, Oliver D. K.; Barry, Simon T.; Goodwin, Richard J. A.; Kinross, James; Edwards, Joanne; Yuneva, Mariia O.; Sumpton, David; Takats, Zoltan; Campbell, Andrew D.; Bunch, Josephine; Sansom, Owen J.
      </>
    )
  },
  {
    id: 'pub3',
    title: 'A RAC-GEF network critical for early intestinal tumourigenesis',
    journal: 'Nature Communications',
    year: 2021,
    authors: (
      <>
        Pickering, K. A.; Gilroy, K.; Cassidy, J. W.; Fey, S. K.; Najumudeen, A. K.; <strong>Zeiger, L. B.</strong>; Vincent, D. F.; Gay, D. M.; Johansson, J.; Fordham, R. P.; Miller, B.; Clark, W.; Hedley, A.; Unal, E. B.; Kiel, C.; McGhee, E.; Machesky, L. M.; Nixon, C.; Johnsson, A. E.; Bain, M.; Strathdee, D.; van Hoof, S. R.; Medema, J. P.; Anderson, K. I.; Brachmann, S. M.; Stucke, V. M.; Malliri, A.; Drysdale, M.; Turner, M.; Serrano, L.; Myant, K.; Campbell, A. D.; Sansom, O. J.
      </>
    )
  },
  {
    id: 'pub4',
    title: 'Implications of Peak Selection in the Interpretation of Unsupervised Mass Spectrometry Imaging Data Analyses',
    journal: 'Analytical Chemistry',
    year: 2021,
    authors: (
      <>
        Murta, Teresa; Steven, Rory T.; Nikula, Chelsea J.; Thomas, Spencer A.; <strong>Zeiger, Lucas B.</strong>; Dexter, Alex; Elia, Efstathios A.; Yan, Bin; Campbell, Andrew D.; Goodwin, Richard J. A.; Takats, Zoltan; Sansom, Owen J.; Bunch, Josephine
      </>
    )
  },
  {
    id: 'pub5',
    title: 'The haemochromatosis gene Hfe and Kupffer cells control LDL cholesterol homeostasis and impact on atherosclerosis development.',
    journal: 'European Heart Journal',
    year: 2020,
    authors: (
      <>
        Demetz, E.; Tymoszuk, P.; Hilbe, R.; Volani, C.; Haschka, D.; Heim, C.; Auer, K.; Lener, D.; <strong>Zeiger, L. B.</strong>; Pfeifhofer-Obermair, C.; Boehm, A.; Obermair, G. J.; Ablinger, C.; Weiss, G.
      </>
    )
  },
  {
    id: 'pub6',
    title: 'Wnt ligands influence tumour initiation by controlling the number of intestinal stem cells.',
    journal: 'Nature Communications',
    year: 2018,
    authors: (
      <>
        Huels, D. J.; Bruens, L.; Hodder, M. C.; Cammareri, P.; Campbell, A. D.; Ridgway, R. A.; Gay, D. M.; Solar-Abboud, M.; Faller, W. J.; Nixon, C.; <strong>Zeiger, L. B.</strong>; McLaughlin, M. E.; Sansom, O. J.
      </>
    )
  }
];
