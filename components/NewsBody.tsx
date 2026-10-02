import React from 'react';
import Markdown from 'react-markdown';
import { NewsItem } from '../types';

const NewsBody: React.FC<{ item: NewsItem }> = ({ item }) => (
  <>
    <div className="text-neutral-300 leading-relaxed mt-4 space-y-4">
      <Markdown
        skipHtml
        disallowedElements={['img']}
        components={{
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300" />,
          h1: ({ node, ...props }) => <h3 {...props} className="text-xl font-semibold text-white" />,
          h2: ({ node, ...props }) => <h3 {...props} className="text-xl font-semibold text-white" />,
          h3: ({ node, ...props }) => <h4 {...props} className="text-lg font-semibold text-white" />,
          ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-6 space-y-2" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-6 space-y-2" />,
          blockquote: ({ node, ...props }) => <blockquote {...props} className="border-l-2 border-neutral-700 pl-4 italic" />
        }}
      >
        {item.body}
      </Markdown>
    </div>
    {item.images.length > 0 && (
      <div className={`mt-6 grid gap-6 ${item.images.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {item.images.map((image, index) => (
          <figure key={`${image.src}-${index}`}>
            <a href={image.src} target="_blank" rel="noreferrer">
              <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" className="w-full h-auto rounded-lg border border-neutral-800" />
            </a>
            {image.caption && <figcaption className="mt-2 text-sm text-neutral-400">{image.caption}</figcaption>}
          </figure>
        ))}
      </div>
    )}
  </>
);

export default NewsBody;
