import React from 'react';
import Card from '../components/Card';
import { EXPERIENCE, EDUCATION, FALLBACK_PUBLICATIONS } from '../data/cv';
import orcidData from '../data/orcid-publications.json';
import { Download } from 'lucide-react';
import { Publication } from '../types';

const CV: React.FC = () => {
  const orcidPublications = (orcidData.publications || []) as Publication[];
  const publications = orcidPublications.length > 0 ? orcidPublications : FALLBACK_PUBLICATIONS;
  const sortedPublications = [...publications].sort((a, b) => b.year - a.year);
  const orcidProfileUrl = orcidData.orcid ? `https://orcid.org/${orcidData.orcid}` : undefined;

  const getPublicationLink = (pub: Publication) => {
    if (pub.doi) {
      return { href: `https://doi.org/${pub.doi}`, label: 'DOI' };
    }
    if (pub.url) {
      return { href: pub.url, label: 'Link' };
    }
    if (pub.orcidUrl) {
      return { href: pub.orcidUrl, label: 'ORCID' };
    }
    if (orcidProfileUrl) {
      return { href: orcidProfileUrl, label: 'ORCID' };
    }
    return null;
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("In a real deployment, this would download 'cv.pdf'. Please ensure you add a file named 'cv.pdf' to your public directory.");
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pb-20 animate-in slide-in-from-bottom-4 duration-700 fade-in">
      <div className="flex justify-between items-end mb-12 border-b border-neutral-800 pb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Curriculum Vitae</h1>
          <p className="text-neutral-300">Academic and professional background.</p>
        </div>
        <a 
          href="/cv.pdf" 
          onClick={handleDownload}
          className="hidden" /* kept for future use; intentionally hidden for now */
        >
          <Download size={16} />
          <span>Download PDF</span>
        </a>
      </div>

      <div className="space-y-16">
        
        {/* Experience Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-[1px] bg-neutral-700"></span>
            Research experience
          </h2>
          <div className="space-y-4">
            {EXPERIENCE.map((exp) => (
              <Card 
                key={exp.id} 
                title={exp.role} 
                subtitle={exp.institution}
                date={exp.period}
              >
                {exp.description}
                <div className="mt-2 text-xs text-neutral-500 font-medium uppercase tracking-wider">
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
            {sortedPublications.map((pub) => {
              const primaryLink = getPublicationLink(pub);
              const doiUrl = pub.doi ? `https://doi.org/${pub.doi}` : undefined;
              const linkLabel = pub.url ? 'Publisher' : 'Link';

              return (
                <Card 
                  key={pub.id} 
                  title={
                    primaryLink ? (
                      <a
                        href={primaryLink.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-100 hover:text-white transition-colors underline-offset-4 hover:underline"
                      >
                        {pub.title}
                      </a>
                    ) : (
                      pub.title
                    )
                  }
                  subtitle={pub.journal || undefined}
                  date={pub.year ? pub.year.toString() : undefined}
                >
                  <p className="italic text-neutral-300">{pub.authors}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-wider text-neutral-400">
                    {doiUrl && (
                      <a
                        href={doiUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded border border-neutral-800 hover:border-neutral-600 transition-colors"
                      >
                        DOI
                      </a>
                    )}
                    {pub.url && (
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded border border-neutral-800 hover:border-neutral-600 transition-colors"
                      >
                        {linkLabel}
                      </a>
                    )}
                    {orcidProfileUrl && (
                      <a
                        href={orcidProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded border border-neutral-800 hover:border-neutral-600 transition-colors"
                      >
                        ORCID
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
};

export default CV;
