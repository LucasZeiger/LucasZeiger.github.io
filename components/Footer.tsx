import React from 'react';
import { Github, Linkedin, Mail, Twitter } from 'lucide-react';
import { SOCIAL_LINKS } from '../data/social';

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-12 border-t border-neutral-900 bg-neutral-950 mt-auto">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-neutral-500 text-sm">
          &copy; {new Date().getFullYear()} Lucas Zeiger. All rights reserved.
        </div>
        
        <div className="flex items-center gap-6">
          <a href={SOCIAL_LINKS.github} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-white transition-colors">
            <Github size={20} />
          </a>
          <a href={SOCIAL_LINKS.linkedin} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-white transition-colors">
            <Linkedin size={20} />
          </a>
          <a href={SOCIAL_LINKS.twitter} target="_blank" rel="noreferrer" className="text-neutral-500 hover:text-white transition-colors">
            <Twitter size={20} />
          </a>
          <a href="mailto:contact@lucaszeiger.com" className="text-neutral-500 hover:text-white transition-colors">
            <Mail size={20} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;