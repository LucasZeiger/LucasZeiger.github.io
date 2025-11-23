import React from 'react';
import { PROJECTS } from '../constants';
import { ArrowUpRight } from 'lucide-react';

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
          <div 
            key={project.id} 
            className="group flex flex-col bg-neutral-900/30 border border-neutral-800 rounded-xl overflow-hidden hover:bg-neutral-900/50 hover:border-neutral-700 transition-all duration-300"
          >
            {/* Image Container */}
            <div className="h-48 overflow-hidden relative">
              <div className="absolute inset-0 bg-neutral-950/20 group-hover:bg-transparent transition-colors z-10" />
              <img 
                src={project.imageUrl} 
                alt={project.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500 grayscale group-hover:grayscale-0"
              />
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-mono text-emerald-500/80 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                  {project.category}
                </span>
                {project.link && (
                  <a href={project.link} className="text-neutral-500 hover:text-white transition-colors">
                    <ArrowUpRight size={18} />
                  </a>
                )}
              </div>
              
              <h3 className="text-xl font-bold text-neutral-100 mb-2 group-hover:text-white">
                {project.title}
              </h3>
              
              <p className="text-neutral-400 text-sm leading-relaxed mb-6 flex-grow">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-800/50">
                {project.tags.map(tag => (
                  <span key={tag} className="text-xs text-neutral-500">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Research;