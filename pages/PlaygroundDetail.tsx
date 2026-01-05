import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PLAYGROUND_ITEMS } from '../data/playground';
import HalftoneVisualizer from '../components/HalftoneVisualizer';
import LocationPulseDashboard from '../components/LocationPulseDashboard';
import PublicationsExplorer from '../components/PublicationsExplorer';
import DungeonDesignerPage from './DungeonDesignerPage';
import SynthCanvasPage from './SynthCanvasPage';

const PlaygroundDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const item = PLAYGROUND_ITEMS.find((entry) => entry.id === id);
  const embedRef = useRef<HTMLDivElement>(null);
  const [isEmbedFullscreen, setIsEmbedFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsEmbedFullscreen(document.fullscreenElement === embedRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleEmbedFullscreen = async () => {
    if (!embedRef.current) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await embedRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen request failed', error);
    }
  };

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

  if (item.id === 'modular-synth') {
    return <SynthCanvasPage embedded />;
  }

  if (item.id === 'dungeon-designer') {
    return <DungeonDesignerPage />;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24 animate-in fade-in duration-500">
      <div className="mb-10">
        <Link
          to="/playground"
          className="inline-flex items-center gap-2 text-sm text-neutral-200 hover:text-white px-3 py-2 rounded-full border border-neutral-800/70 bg-neutral-900/30 hover:border-neutral-600"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Playground</span>
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold text-white mt-4">{item.title}</h1>
        <p className="text-neutral-300 mt-3 max-w-2xl">{item.description}</p>
      </div>

      {item.id === 'halftone-loop' ? (
        <HalftoneVisualizer />
      ) : item.id === 'location-pulse' ? (
        <LocationPulseDashboard />
      ) : item.id === 'publications-explorer' ? (
        <PublicationsExplorer />
      ) : item.embedPath ? (
        item.id === 'cellular-automata' ? (
          <div
            ref={embedRef}
            className={`border border-neutral-800/70 rounded-xl overflow-hidden bg-neutral-900/30 flex flex-col min-h-0 relative ${
              isEmbedFullscreen ? 'bg-neutral-950 h-full' : ''
            }`}
          >
            <div
              className={`flex items-center justify-between px-4 py-3 border-b border-neutral-800/70 ${
                isEmbedFullscreen
                  ? 'absolute top-3 left-3 right-3 z-10 rounded-full border border-neutral-800 bg-neutral-950/80 backdrop-blur'
                  : ''
              }`}
            >
              <span className="text-xs uppercase tracking-wider text-neutral-400">Visualizer</span>
              <button
                className="text-xs uppercase tracking-wider px-3 py-1 rounded-full border border-neutral-800 text-neutral-300 hover:text-white"
                onClick={toggleEmbedFullscreen}
              >
                {isEmbedFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              </button>
            </div>
            <iframe
              title={item.title}
              src={item.embedPath}
              className={`w-full border-0 min-h-0 ${isEmbedFullscreen ? 'flex-1' : 'h-[80vh] md:h-[85vh]'}`}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="border border-neutral-800/70 rounded-xl overflow-hidden bg-neutral-900/30">
            <iframe
              title={item.title}
              src={item.embedPath}
              className="w-full h-[80vh] md:h-[85vh] border-0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )
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
