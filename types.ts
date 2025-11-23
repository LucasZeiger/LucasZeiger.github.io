import React from 'react';

export interface Project {
  id: string;
  title: string;
  category: string;
  description: string; // Plain text teaser for cards
  longDescription?: React.ReactNode; // Rich text body for detail page
  openQuestions?: string[];
  imageUrl: string;
  tags: string[];
  link?: string; // Paper/External link
  github?: string;
  date: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  institution: string;
  period: string;
  description: React.ReactNode; // Rich text allowed
  location: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  year: string;
  details?: React.ReactNode; // Rich text allowed
}

export interface Publication {
  id: string;
  title: string;
  journal: string;
  year: number;
  authors: string;
  doi?: string;
}
