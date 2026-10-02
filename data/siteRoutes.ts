import { PROJECTS } from './projects';
import { PLAYGROUND_ITEMS } from './playground';

export const SITE_URL = 'https://lucaszeiger.github.io';
export const HOME_TITLE = 'Lucas Zeiger | Computational Biology & Cancer Research';
export const HOME_DESCRIPTION = 'Lucas Zeiger, PhD — computational biologist at the CRUK Scotland Institute (Glasgow). Research in spatial -omics, tumour biology, and disease modelling.';

// Derive metadata from existing content instead of maintaining a second copy.
export const SITE_ROUTES = [
  { path: '/', title: HOME_TITLE, description: HOME_DESCRIPTION, prerender: true },
  { path: '/research', title: 'Research', description: 'Selected publications and projects I have led or contributed to.', prerender: true },
  { path: '/cv', title: 'Curriculum Vitae', description: 'Academic and professional background.', prerender: true },
  { path: '/news', title: 'News', description: 'Short updates on awards, talks, and milestones.', prerender: true },
  { path: '/playground', title: 'Playground', description: 'Experiments, visualizers, and interactive prototypes.', prerender: true },
  ...PROJECTS.map(project => ({ path: `/research/${project.id}`, title: project.title, description: project.description, prerender: true })),
  ...PLAYGROUND_ITEMS.map(item => ({ path: `/playground/${item.id}`, title: item.title, description: item.description, prerender: false })),
  { path: '/synth', title: PLAYGROUND_ITEMS.find(item => item.id === 'modular-synth')!.title, description: PLAYGROUND_ITEMS.find(item => item.id === 'modular-synth')!.description, prerender: false }
];

export const getRouteMetadata = (pathname: string) => {
  const path = pathname.replace(/\/+$/, '') || '/';
  const route = SITE_ROUTES.find(entry => entry.path === path) || SITE_ROUTES[0];
  return {
    title: route.path === '/' ? route.title : `${route.title} | Lucas Zeiger`,
    description: route.description,
    url: `${SITE_URL}${route.path === '/' ? '/' : `${route.path}/`}`
  };
};
