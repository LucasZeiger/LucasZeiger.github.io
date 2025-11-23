export interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  tags: string[];
  link?: string;
  date: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  institution: string;
  period: string;
  description: string[];
  location: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  year: string;
  details?: string;
}

export interface Publication {
  id: string;
  title: string;
  journal: string;
  year: number;
  authors: string;
  doi?: string;
}

export enum SectionType {
  EXPERIENCE = 'Experience',
  EDUCATION = 'Education',
  PUBLICATIONS = 'Publications',
}