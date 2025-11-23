import React from 'react';
import { PROJECTS } from '../data/projects';
import ResearchCard from '../components/ResearchCard';

const Research: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-6 pb-20 animate-in slide-in-from-bottom-4 duration-700 fade-in">
      <div className="mb-16">
        <h1 className="text-4xl font-bold text-white mb-4">Research</h1>
        <p className="text-neutral-400 text-lg max-w-2xl">
          Selected projects focusing on the intersection of spatial omics, colorectal cancer, and computational modeling.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROJECTS.map((project) => (
          <ResearchCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
};

export default Research;