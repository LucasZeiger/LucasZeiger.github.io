import React from 'react';
import { ArrowRight, Microscope, Brain, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ABOUT_TEXT } from '../constants';

const Home: React.FC = () => {
  return (
    <div className="animate-in fade-in duration-700">
      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pb-20 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Available for collaborations
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            Mapping the Architecture of <span className="text-neutral-500">Colorectal Cancer.</span>
          </h1>
          
          <p className="text-lg text-neutral-400 leading-relaxed max-w-lg">
            Exploring the spatial dimensions of transcriptomics to decode the tumor microenvironment.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/research"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition-colors"
            >
              View Research <ArrowRight size={18} />
            </Link>
            <Link
              to="/cv"
              className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 border border-neutral-800 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
            >
              Curriculum Vitae
            </Link>
          </div>
        </div>

        <div className="order-1 md:order-2 flex justify-center md:justify-end relative">
            {/* Abstract Decorative Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-neutral-800/20 to-neutral-700/5 blur-3xl rounded-full" />
            
            {/* Profile Image Placeholder */}
            <div className="relative w-72 h-72 md:w-96 md:h-96 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-neutral-900 grayscale hover:grayscale-0 transition-all duration-700">
              <img 
                src="https://picsum.photos/800/800?grayscale" 
                alt="Lucas Zeiger" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-60" />
            </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-neutral-900/30 py-20 border-y border-neutral-900">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-2xl font-bold text-white">About Me</h2>
          <p className="text-neutral-400 leading-8 text-lg">
            {ABOUT_TEXT}
          </p>
        </div>
      </section>

      {/* Areas of Focus */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Microscope,
              title: "Spatial Transcriptomics",
              desc: "High-resolution mapping of gene expression in tissue context."
            },
            {
              icon: Layers,
              title: "Tumor Microenvironment",
              desc: "Dissecting stromal-immune interactions in CRC."
            },
            {
              icon: Brain,
              title: "Computational Biology",
              desc: "Developing algorithms for multi-modal data integration."
            }
          ].map((item, idx) => (
            <div key={idx} className="p-8 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors">
              <item.icon className="w-8 h-8 text-neutral-300 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-neutral-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;