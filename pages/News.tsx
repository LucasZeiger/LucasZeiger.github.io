import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NEWS } from '../data/news';

const News: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const focusedId = searchParams.get('item');
  const sortedNews = [...NEWS].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();

    if (Number.isNaN(timeA)) {
      console.warn(`Invalid news date for "${a.title}": ${a.date}`);
    }
    if (Number.isNaN(timeB)) {
      console.warn(`Invalid news date for "${b.title}": ${b.date}`);
    }

    if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
      return 0;
    }
    if (Number.isNaN(timeA)) {
      return 1;
    }
    if (Number.isNaN(timeB)) {
      return -1;
    }
    return timeB - timeA;
  });

  useEffect(() => {
    if (!focusedId) {
      return;
    }
    const target = document.getElementById(focusedId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusedId]);

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24 animate-in fade-in duration-500">
      <div className="mb-16">
        <h1 className="text-4xl font-bold text-white mb-4">News</h1>
        <p className="text-neutral-300 text-lg max-w-2xl">
          Short updates on awards, talks, and milestones.
        </p>
      </div>

      <div className="space-y-10">
        {sortedNews.map((item) => (
          <article
            key={item.id}
            id={item.id}
            className="scroll-mt-28 border border-neutral-800/70 rounded-xl p-6 bg-neutral-900/30"
          >
            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
              <span className="px-2 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
                {item.displayDate}
              </span>
              <span>{item.summary}</span>
            </div>
            <h2 className="text-2xl font-semibold text-white mt-4">{item.title}</h2>
            <div className="text-neutral-300 leading-relaxed mt-4">
              {item.body}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default News;
