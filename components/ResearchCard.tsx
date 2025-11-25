import React from 'react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Project } from '../types';

interface ResearchCardProps {
  project: Project;
}

const ResearchCard: React.FC<ResearchCardProps> = ({ project }) => {
  return (
    <Link 
      to={`/research/${project.id}`}
      className="group flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 transition-all duration-300 h-full shadow-sm hover:shadow-lg hover:shadow-neutral-900/50"
    >
      {/* Image Container */}
      <div className="h-48 overflow-hidden relative flex-shrink-0">
        <div className="absolute inset-0 bg-neutral-950/20 group-hover:bg-transparent transition-colors z-10" />
        <img 
          src={project.imageUrl} 
          alt={project.title}
          className="w-full h-full object-cover transform md:group-hover:scale-105 transition-transform duration-700 grayscale-0 md:grayscale md:group-hover:grayscale-0"
        />
        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <div className="bg-white text-black p-1.5 rounded-full">
              <ArrowUpRight size={16} />
           </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs font-mono text-neutral-300 bg-neutral-800 px-2 py-1 rounded border border-neutral-700">
            {project.category}
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-neutral-100 mb-2 group-hover:text-white">
          {project.title}
        </h3>
        
        <p className="text-neutral-300 text-sm leading-relaxed mb-6 line-clamp-3 flex-grow">
          {project.description}
        </p>

        <div className="pt-4 border-t border-neutral-800 mt-auto flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {project.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs text-neutral-500">
                #{tag}
              </span>
            ))}
          </div>
          <span className="text-xs font-medium text-neutral-200 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            Read More <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ResearchCard;
