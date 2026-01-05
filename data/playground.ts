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
    description: 'Interactive grid-based simulations and rule exploration. Works best in fullscreen.',
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
  },
  {
    id: 'publications-explorer',
    title: 'Publications explorer',
    description:
      'Faceted ORCID search with coauthor graph, and export tools.'
  },
  {
    id: 'modular-synth',
    title: 'Modular synth canvas',
    description:
      'Patchable audio-rate gates, envelopes, and CV with draggable modules.'
  },
  {
    id: 'dungeon-designer',
    title: 'Procedural Dungeon Designer',
    description:
      'Traditional rooms + corridors built step-by-step with transparent decisions (binary space partitioning -> rooms -> minimum spanning tree -> A* path carving).',
    previewPath: '/playground/dungeon-designer/preview.svg'
  }
];
