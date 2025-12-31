export interface PlaygroundItem {
  id: string;
  title: string;
  description: string;
  embedPath?: string;
  previewPath?: string;
}

export const PLAYGROUND_ITEMS: PlaygroundItem[] = [
  {
    id: 'cellular-automata',
    title: 'Cellular automata visualizer',
    description: 'Interactive grid-based simulations and rule exploration.',
    embedPath: '/playground/cellular-automata/index.html',
    previewPath: '/playground/cellular-automata/index.html'
  },
  {
    id: 'halftone-loop',
    title: 'Halftone loop visualizer',
    description: 'Generate perfect looping halftone animations on a canvas.'
  },
  {
    id: 'location-pulse',
    title: 'City information dashboard',
    description: 'Live weather, air quality, seismic, and Wikipedia context for any city.'
  }
];
