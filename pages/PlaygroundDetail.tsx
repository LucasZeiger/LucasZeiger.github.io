import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { PLAYGROUND_ITEMS } from '../data/playground';
import HalftoneVisualizer from '../components/HalftoneVisualizer';
import LocationPulseDashboard from '../components/LocationPulseDashboard';

const PlaygroundDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const item = PLAYGROUND_ITEMS.find((entry) => entry.id === id);

  if (!item) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-200">Playground Item Not Found</h2>
        <Link to="/playground" className="text-neutral-300 hover:text-white">
          Back to Playground
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24 animate-in fade-in duration-500">
      <div className="mb-10">
        <Link to="/playground" className="text-sm text-neutral-300 hover:text-white">
          ← Back to Playground
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mt-4">{item.title}</h1>
        <p className="text-neutral-300 mt-3 max-w-2xl">{item.description}</p>
      </div>

      {item.id === 'halftone-loop' ? (
        <HalftoneVisualizer />
      ) : item.id === 'location-pulse' ? (
        <LocationPulseDashboard />
      ) : item.embedPath ? (
        <div className="border border-neutral-800/70 rounded-xl overflow-hidden bg-neutral-900/30">
          <iframe
            title={item.title}
            src={item.embedPath}
            className="w-full h-[80vh] md:h-[85vh] border-0"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : (
        <div className="border border-neutral-800/70 rounded-xl p-8 bg-neutral-900/30 text-neutral-300">
          <p>
            This is a placeholder area for the {item.title} experience. We can embed the visualizer here once the separate
            implementation is ready.
          </p>
        </div>
      )}
    </div>
  );
};

export default PlaygroundDetail;
