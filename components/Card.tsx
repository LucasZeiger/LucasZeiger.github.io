import React from 'react';

interface CardProps {
  title: string;
  subtitle?: string;
  date?: string;
  children?: React.ReactNode;
  tags?: string[];
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, subtitle, date, children, tags, className = '' }) => {
  return (
    <div className={`group p-6 rounded-xl bg-neutral-900/40 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60 transition-all duration-300 ${className}`}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2 gap-2">
        <div>
          <h3 className="text-lg font-semibold text-neutral-100 group-hover:text-white transition-colors">
            {title}
          </h3>
          {subtitle && (
            <p className="text-neutral-300 font-medium text-sm mt-1">{subtitle}</p>
          )}
        </div>
        {date && (
          <span className="text-xs font-mono text-neutral-300 bg-neutral-900 px-2 py-1 rounded border border-neutral-800 whitespace-nowrap">
            {date}
          </span>
        )}
      </div>
      
      <div className="text-neutral-300 text-sm leading-relaxed mt-3">
        {children}
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-neutral-800/50">
          {tags.map((tag) => (
            <span key={tag} className="text-xs text-neutral-300 bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default Card;
