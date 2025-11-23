import React from 'react';
import Card from '../components/Card';
import { EXPERIENCE, EDUCATION, PUBLICATIONS } from '../constants';
import { Download } from 'lucide-react';

const CV: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 pb-20 animate-in slide-in-from-bottom-4 duration-700 fade-in">
      
      <div className="flex justify-between items-end mb-12 border-b border-neutral-800 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Curriculum Vitae</h1>
          <p className="text-neutral-400">Academic and professional background.</p>
        </div>
        <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm border border-neutral-800 transition-colors">
          <Download size={16} />
          <span>Download PDF</span>
        </button>
      </div>

      <div className="space-y-16">
        
        {/* Experience Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-[1px] bg-neutral-700"></span>
            Experience
          </h2>
          <div className="space-y-4">
            {EXPERIENCE.map((exp) => (
              <Card 
                key={exp.id} 
                title={exp.role} 
                subtitle={exp.institution}
                date={exp.period}
              >
                <ul className="list-disc list-outside ml-4 space-y-1 text-neutral-400">
                  {exp.description.map((desc, i) => (
                    <li key={i}>{desc}</li>
                  ))}
                </ul>
                <div className="mt-2 text-xs text-neutral-600 font-medium uppercase tracking-wider">
                  {exp.location}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Education Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-[1px] bg-neutral-700"></span>
            Education
          </h2>
          <div className="space-y-4">
            {EDUCATION.map((edu) => (
              <Card 
                key={edu.id} 
                title={edu.degree} 
                subtitle={edu.institution}
                date={edu.year}
              >
                {edu.details && <p>{edu.details}</p>}
              </Card>
            ))}
          </div>
        </section>

        {/* Publications Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-[1px] bg-neutral-700"></span>
            Selected Publications
          </h2>
          <div className="space-y-4">
            {PUBLICATIONS.map((pub) => (
              <Card 
                key={pub.id} 
                title={pub.title} 
                subtitle={pub.journal}
                date={pub.year.toString()}
              >
                <p className="italic text-neutral-500">{pub.authors}</p>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default CV;