import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, ExternalLink, Calendar } from 'lucide-react';
import { PROJECTS } from '../data/projects';

const ResearchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = PROJECTS.find(p => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!project) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-200">Project Not Found</h2>
        <Link to="/research" className="text-neutral-300 hover:text-white flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Research
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 pb-24 animate-in fade-in duration-500">
      <button 
        onClick={() => navigate(-1)} 
        className="mb-8 flex items-center gap-2 text-sm text-neutral-300 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="space-y-6 mb-12">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200">
            {project.category}
          </span>
          <span className="flex items-center gap-1 text-neutral-300">
            <Calendar size={14} /> {project.date}
          </span>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
          {project.title}
        </h1>

        <div className="flex gap-4 pt-2">
           {project.link && (
             <a href={project.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-neutral-200 transition-colors">
               <ExternalLink size={16} /> Read Paper
             </a>
           )}
           {project.github && (
             <a href={project.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg font-medium text-sm hover:bg-neutral-800 transition-colors">
               <Github size={16} /> View Code
             </a>
           )}
        </div>
      </div>

      {/* Main Image */}
      <div className="w-full aspect-video rounded-xl overflow-hidden border border-neutral-800 mb-12 bg-neutral-900">
        <img 
          src={project.imageUrl} 
          alt={project.title}
          className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
        />
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-12">
          {/* About */}
          <section>
             <h3 className="text-xl font-semibold text-white mb-4">About the Project</h3>
             <div className="text-neutral-300 leading-relaxed text-lg">
               {project.longDescription || project.description}
             </div>
          </section>

          {/* Open Questions */}
          {project.openQuestions && (
            <section className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Open Questions</h3>
              <ul className="space-y-3">
                {project.openQuestions.map((q, idx) => (
                  <li key={idx} className="flex gap-3 text-neutral-300">
                    <span className="text-neutral-500 font-mono">0{idx + 1}</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
           <div className="border-t border-neutral-800 pt-6">
             <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Technologies</h4>
             <div className="flex flex-wrap gap-2">
               {project.tags.map(tag => (
                 <span key={tag} className="px-2 py-1 bg-neutral-900 text-neutral-300 text-xs rounded border border-neutral-800">
                   {tag}
                 </span>
               ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchDetail;
