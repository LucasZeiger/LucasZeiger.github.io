import React, { useRef } from 'react';
import { ArrowRight, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ABOUT_TEXT, AVAILABILITY } from '../data/about';
import { PROJECTS } from '../data/projects';
import { EXPERIENCE, EDUCATION, PUBLICATIONS } from '../data/cv';
import ResearchCard from '../components/ResearchCard';
import Card from '../components/Card';
import profileImg from '../data/images/profile.jpg';

const Home: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("In a real deployment, this would download 'cv.pdf'. Please ensure you add a file named 'cv.pdf' to your public directory.");
  };

  return (
    <div className="animate-in fade-in duration-700">
      
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-12 md:py-20 grid md:grid-cols-2 gap-12 items-center min-h-[70vh]">
        {/* Text Content */}
        <div className="space-y-6 md:space-y-8 order-2 md:order-1">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-medium ${AVAILABILITY.status ? 'text-emerald-500' : 'text-neutral-400'}`}>
            <span className="relative flex h-2 w-2">
              {AVAILABILITY.status && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${AVAILABILITY.status ? 'bg-emerald-500' : 'bg-neutral-500'}`}></span>
            </span>
            {AVAILABILITY.label}
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Mapping the Architecture of <span className="text-neutral-500">Health and Disease.</span>
          </h1>
          
          <p className="text-lg text-neutral-400 leading-relaxed max-w-lg">
            Lucas Zeiger, PhD | CRUK Scotland Institute | Glasgow.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('research')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Research <ArrowRight size={18} />
            </button>
            <a
              href="/cv.pdf"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-neutral-800 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
            >
              Curriculum Vitae
            </a>
          </div>
        </div>

        {/* Image Content */}
        <div className="relative flex justify-center md:justify-end mt-8 md:mt-0 order-1 md:order-2">
            <div className="relative group">
              <div className="absolute inset-0 bg-neutral-800/20 blur-2xl rounded-full transform scale-90" />
              <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-900 transition-all duration-700">
                <img 
                  src={profileImg} 
                  alt="Lucas Zeiger" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 via-transparent to-transparent" />
              </div>
              
              {/* Name Label */}
              <div className="absolute -bottom-6 -right-6 md:bottom-6 md:-left-12 md:right-auto bg-neutral-900/90 backdrop-blur border border-neutral-800 px-6 py-3 rounded-xl shadow-xl z-20">
                <p className="text-white font-bold text-lg whitespace-nowrap">Lucas Zeiger, PhD</p>
              </div>
            </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-neutral-900/20 py-16 border-y border-neutral-900">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-2xl font-bold text-white">About Me</h2>
          <div className="text-neutral-400 leading-8 text-lg">
            {ABOUT_TEXT}
          </div>
        </div>
      </section>

      {/* Research Section - Horizontal Scroll */}
      <section id="research" className="py-24 border-b border-neutral-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Research Highlights</h2>
              <p className="text-neutral-400">Swipe to explore recent projects.</p>
            </div>
            
            <div className="flex gap-2">
              <button onClick={scrollLeft} className="p-2 rounded-full border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
                <ChevronLeft size={20} />
              </button>
              <button onClick={scrollRight} className="p-2 rounded-full border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Carousel */}
          <div 
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto pb-8 -mx-6 px-6 no-scrollbar snap-x snap-mandatory"
          >
            {PROJECTS.map((project) => (
              <div key={project.id} className="min-w-[85vw] md:min-w-[350px] lg:min-w-[400px] snap-center">
                <ResearchCard project={project} />
              </div>
            ))}
            {/* View All Card */}
            <div className="min-w-[200px] snap-center flex items-center justify-center">
              <Link to="/research" className="group flex flex-col items-center gap-3 text-neutral-500 hover:text-white transition-colors p-8">
                <div className="p-4 rounded-full border border-neutral-800 bg-neutral-900 group-hover:border-neutral-600 transition-colors">
                  <ArrowRight size={24} />
                </div>
                <span className="font-medium">View All Projects</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CV Section */}
      <section id="cv" className="max-w-4xl mx-auto px-6 py-24">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">Curriculum Vitae</h2>
            <p className="text-neutral-400">Academic and professional background.</p>
          </div>
          <button 
             onClick={handleDownload}
             className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg text-sm border border-neutral-800 transition-colors"
          >
            <Download size={16} />
            <span>PDF</span>
          </button>
        </div>

        <div className="space-y-16">
          {/* Experience */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
              <span className="w-6 h-[1px] bg-neutral-700"></span>
              Experience
            </h3>
            <div className="space-y-4">
              {EXPERIENCE.map((exp) => (
                <Card 
                  key={exp.id} 
                  title={exp.role} 
                  subtitle={exp.institution}
                  date={exp.period}
                >
                  {exp.description}
                </Card>
              ))}
            </div>
          </div>

          {/* Education */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
              <span className="w-6 h-[1px] bg-neutral-700"></span>
              Education
            </h3>
            <div className="space-y-4">
              {EDUCATION.map((edu) => (
                <Card 
                  key={edu.id} 
                  title={edu.degree} 
                  subtitle={edu.institution}
                  date={edu.year}
                >
                  {edu.details}
                </Card>
              ))}
            </div>
          </div>

           {/* Publications */}
           <div>
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-3">
              <span className="w-6 h-[1px] bg-neutral-700"></span>
              Selected Publications
            </h3>
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
          </div>

          <div className="flex justify-center pt-8">
            <Link to="/cv" className="inline-flex items-center gap-2 px-6 py-3 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
              View Full CV <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
