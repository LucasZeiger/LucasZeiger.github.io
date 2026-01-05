import React, { useEffect, useMemo, useRef, useState } from 'react';
import orcidData from '../data/orcid-publications.json';

interface OrcidPublication {
  id: string;
  title: string;
  journal: string;
  year: number;
  authors: string;
  doi?: string;
  url?: string;
  type: string;
}

interface Publication extends OrcidPublication {
  authorsList: string[];
  journal: string;
}

interface GraphNode {
  id: string;
  label: string;
  count: number;
  x: number;
  y: number;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

const PRIMARY_AUTHOR_HINTS = ['zeiger', 'lucas'];
const GRAPH_WIDTH = 840;
const GRAPH_HEIGHT = 560;
const GRAPH_SCALE_MIN = 0.6;
const GRAPH_SCALE_MAX = 2.4;

const toggleValue = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

const splitAuthors = (authors: string) => {
  const primarySplit = authors.includes(';') ? authors.split(';') : authors.split(',');
  return primarySplit.map((author) => author.trim()).filter(Boolean);
};

const MANUAL_AUTHOR_ALIASES: Record<string, string> = {
  'zeiger lb': 'Lucas Zeiger',
  'zeiger l b': 'Lucas Zeiger',
  'zeiger l. b.': 'Lucas Zeiger',
  'zeiger lucas': 'Lucas Zeiger',
  'lucas b zeiger': 'Lucas Zeiger',
  'lucas b. zeiger': 'Lucas Zeiger',
  'lucas zeiger': 'Lucas Zeiger',
  'lucas z': 'Lucas Zeiger',
  'sansom oj': 'Owen Sansom',
  'sansom o j': 'Owen Sansom',
  'o j sansom': 'Owen Sansom'
};

const normalizeAuthorKey = (author: string) =>
  author
    .toLowerCase()
    .replace(/[^a-z\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toTitleCase = (value: string) =>
  value
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getAuthorKey = (author: string) => {
  const cleaned = normalizeAuthorKey(author);
  const parts = cleaned.split(' ').filter(Boolean);
  if (!parts.length) {
    return '';
  }
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2 && parts[1].length <= 3) {
    return `${parts[0]}-${parts[1].charAt(0)}`;
  }
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${last}-${first.charAt(0)}`;
};

const canonicalizeAuthor = (author: string) => {
  const cleaned = normalizeAuthorKey(author);
  if (MANUAL_AUTHOR_ALIASES[cleaned]) {
    return MANUAL_AUTHOR_ALIASES[cleaned];
  }
  const parts = cleaned.split(' ').filter(Boolean);
  if (parts.length === 0) {
    return author.trim();
  }
  if (parts.length >= 2) {
    const [first, ...rest] = parts;
    const last = rest[rest.length - 1];
    const initials = rest.slice(0, -1).join(' ');
    const looksLikeInitials = initials.length > 0 && initials.length <= 3;
    if (looksLikeInitials) {
      return toTitleCase(`${first} ${last}`);
    }
  }
  return toTitleCase(cleaned);
};

const buildAuthorCanonicalMap = (publications: OrcidPublication[]) => {
  const labelVotes = new Map<string, Map<string, number>>();
  const allAuthors = publications.flatMap((pub) => splitAuthors(pub.authors));

  allAuthors.forEach((author) => {
    const normalized = normalizeAuthorKey(author);
    const aliasLabel = MANUAL_AUTHOR_ALIASES[normalized];
    const baseLabel = aliasLabel ?? canonicalizeAuthor(author);
    const key = getAuthorKey(aliasLabel ?? author);
    if (!key) {
      return;
    }
    if (!labelVotes.has(key)) {
      labelVotes.set(key, new Map());
    }
    const voteMap = labelVotes.get(key);
    if (!voteMap) {
      return;
    }
    voteMap.set(baseLabel, (voteMap.get(baseLabel) ?? 0) + 1);
  });

  const canonicalByKey = new Map<string, string>();
  labelVotes.forEach((voteMap, key) => {
    const sorted = Array.from(voteMap.entries()).sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return b[0].length - a[0].length;
    });
    if (sorted.length) {
      canonicalByKey.set(key, sorted[0][0]);
    }
  });

  return canonicalByKey;
};

const buildBibtex = (publications: Publication[]) => {
  return publications
    .map((pub) => {
      const firstAuthor = pub.authorsList[0] || 'author';
      const authorKey = firstAuthor.split(' ').slice(-1)[0].toLowerCase();
      const key = `${authorKey}${pub.year}`;
      const fields = [
        `title={${pub.title}}`,
        `author={${pub.authorsList.join(' and ')}}`,
        `year={${pub.year}}`,
        pub.journal ? `journal={${pub.journal}}` : '',
        pub.doi ? `doi={${pub.doi}}` : '',
        pub.url ? `url={${pub.url}}` : ''
      ].filter(Boolean);
      return `@article{${key},\n  ${fields.join(',\n  ')}\n}`;
    })
    .join('\n\n');
};

const buildCsl = (publications: Publication[]) => {
  return JSON.stringify(
    publications.map((pub) => ({
      id: pub.id,
      type: 'article-journal',
      title: pub.title,
      issued: { 'date-parts': [[pub.year]] },
      'container-title': pub.journal || undefined,
      author: pub.authorsList.map((name) => ({ literal: name })),
      DOI: pub.doi || undefined,
      URL: pub.url || undefined
    })),
    null,
    2
  );
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const computeGraphLayout = (
  nodes: Array<{ id: string; label: string; count: number }>,
  edges: GraphEdge[],
  width: number,
  height: number
) => {
  const radius = Math.min(width, height) * 0.35;
  const positions = nodes.map((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    return {
      ...node,
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius
    };
  });
  const velocity = nodes.map(() => ({ x: 0, y: 0 }));

  const getIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const steps = 160;
  const repulsion = 2200;
  const attraction = 0.03;
  const damping = 0.85;

  for (let step = 0; step < steps; step += 1) {
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        velocity[i].x += fx;
        velocity[i].y += fy;
        velocity[j].x -= fx;
        velocity[j].y -= fy;
      }
    }

    edges.forEach((edge) => {
      const sourceIndex = getIndex.get(edge.source);
      const targetIndex = getIndex.get(edge.target);
      if (sourceIndex === undefined || targetIndex === undefined) {
        return;
      }
      const dx = positions[targetIndex].x - positions[sourceIndex].x;
      const dy = positions[targetIndex].y - positions[sourceIndex].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const strength = attraction * edge.weight;
      const fx = (dx / dist) * strength;
      const fy = (dy / dist) * strength;
      velocity[sourceIndex].x += fx;
      velocity[sourceIndex].y += fy;
      velocity[targetIndex].x -= fx;
      velocity[targetIndex].y -= fy;
    });

    for (let i = 0; i < positions.length; i += 1) {
      velocity[i].x *= damping;
      velocity[i].y *= damping;
      positions[i].x += velocity[i].x;
      positions[i].y += velocity[i].y;
      positions[i].x = Math.min(width - 20, Math.max(20, positions[i].x));
      positions[i].y = Math.min(height - 20, Math.max(20, positions[i].y));
    }
  }

  return positions;
};

const PublicationsExplorer: React.FC = () => {
  const publications = useMemo(() => {
    const rawPublications = orcidData.publications as OrcidPublication[];
    const canonicalByKey = buildAuthorCanonicalMap(rawPublications);

    const mapAuthor = (author: string) => {
      const normalized = normalizeAuthorKey(author);
      const aliasLabel = MANUAL_AUTHOR_ALIASES[normalized];
      const key = getAuthorKey(aliasLabel ?? author);
      return canonicalByKey.get(key) ?? aliasLabel ?? canonicalizeAuthor(author);
    };

    return rawPublications
      .map((pub) => ({
        ...pub,
        id: String(pub.id),
        journal: pub.journal || 'Unknown journal',
        authorsList: Array.from(
          new Set(splitAuthors(pub.authors).map(mapAuthor))
        )
      }))
      .sort((a, b) => b.year - a.year);
  }, []);

  const getPublicationId = (pub: Publication) => String(pub.id);

  const [search, setSearch] = useState('');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedJournals, setSelectedJournals] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedById, setSelectedById] = useState<Record<string, boolean>>({});
  const [copyStatus, setCopyStatus] = useState('');
  const [showAllCoauthors, setShowAllCoauthors] = useState(false);
  const [showAllJournals, setShowAllJournals] = useState(false);
  const [graphScale, setGraphScale] = useState(1);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const graphSvgRef = useRef<SVGSVGElement | null>(null);
  const nodeDragRef = useRef<{
    id: string | null;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  }>({
    id: null,
    offsetX: 0,
    offsetY: 0,
    moved: false
  });

  const years = useMemo(
    () => Array.from(new Set(publications.map((pub) => pub.year))).sort((a, b) => b - a),
    [publications]
  );

  const journals = useMemo(() => {
    const counts = new Map<string, number>();
    publications.forEach((pub) => counts.set(pub.journal, (counts.get(pub.journal) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [publications]);

  const types = useMemo(() => {
    const counts = new Map<string, number>();
    publications.forEach((pub) => counts.set(pub.type, (counts.get(pub.type) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [publications]);

  const coauthors = useMemo(() => {
    const counts = new Map<string, number>();
    publications.forEach((pub) => {
      pub.authorsList.forEach((author) => {
        counts.set(author, (counts.get(author) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [publications]);

  const filteredPublications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return publications.filter((pub) => {
      if (selectedYears.length && !selectedYears.includes(pub.year)) {
        return false;
      }
      if (selectedJournals.length && !selectedJournals.includes(pub.journal)) {
        return false;
      }
      if (selectedTypes.length && !selectedTypes.includes(pub.type)) {
        return false;
      }
      if (
        selectedAuthors.length &&
        !pub.authorsList.some((author) => selectedAuthors.includes(author))
      ) {
        return false;
      }
      if (query) {
        const inTitle = pub.title.toLowerCase().includes(query);
        const inVenue = pub.journal.toLowerCase().includes(query);
        const inAuthors = pub.authorsList.some((author) =>
          author.toLowerCase().includes(query)
        );
        return inTitle || inVenue || inAuthors;
      }
      return true;
    });
  }, [
    publications,
    search,
    selectedYears,
    selectedJournals,
    selectedTypes,
    selectedAuthors
  ]);

  const selectedPublications = useMemo(
    () => publications.filter((pub) => selectedById[getPublicationId(pub)]),
    [publications, selectedById]
  );

  useEffect(() => {
    const next: Record<string, boolean> = {};
    filteredPublications.forEach((pub) => {
      next[getPublicationId(pub)] = true;
    });
    setSelectedById(next);
  }, [filteredPublications]);

  const graphData = useMemo(() => {
    const counts = new Map<string, number>();
    selectedPublications.forEach((pub) => {
      pub.authorsList.forEach((author) => {
        counts.set(author, (counts.get(author) ?? 0) + 1);
      });
    });

    const topNodes = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([author, count]) => ({ id: author, label: author, count }));

    const nodeSet = new Set(topNodes.map((node) => node.id));
    const edgeCounts = new Map<string, number>();

    selectedPublications.forEach((pub) => {
      const authors = pub.authorsList.filter((author) => nodeSet.has(author));
      for (let i = 0; i < authors.length; i += 1) {
        for (let j = i + 1; j < authors.length; j += 1) {
          const key = `${authors[i]}|||${authors[j]}`;
          edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
        }
      }
    });

    const edges: GraphEdge[] = Array.from(edgeCounts.entries()).map(([key, weight]) => {
      const [source, target] = key.split('|||');
      return { source, target, weight };
    });

    const nodes = computeGraphLayout(topNodes, edges, GRAPH_WIDTH, GRAPH_HEIGHT);
    return { nodes, edges };
  }, [selectedPublications]);

  const graphNodeMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    graphData.nodes.forEach((node) => {
      map.set(node.id, { x: node.x, y: node.y });
    });
    return map;
  }, [graphData]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label} copied to clipboard`);
    } catch {
      setCopyStatus('Copy failed: please try again');
    }
    window.setTimeout(() => setCopyStatus(''), 2000);
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    filteredPublications.forEach((pub) => {
      next[getPublicationId(pub)] = true;
    });
    setSelectedById(next);
  };

  const handleSelectAllPublications = () => {
    const next: Record<string, boolean> = {};
    publications.forEach((pub) => {
      next[getPublicationId(pub)] = true;
    });
    setSelectedById(next);
  };

  const handleClearSelection = () => {
    setSelectedById({});
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedYears([]);
    setSelectedJournals([]);
    setSelectedTypes([]);
    setSelectedAuthors([]);
  };

  const isPrimaryAuthor = (author: string) =>
    PRIMARY_AUTHOR_HINTS.some((hint) => author.toLowerCase().includes(hint));

  const applyGraphZoom = (deltaY: number) => {
    const zoom = deltaY < 0 ? 1.08 : 0.92;
    setGraphScale((prev) => {
      const next = clamp(prev * zoom, GRAPH_SCALE_MIN, GRAPH_SCALE_MAX);
      return next;
    });
  };

  useEffect(() => {
    const container = graphContainerRef.current;
    if (!container) {
      return undefined;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      applyGraphZoom(event.deltaY);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleGraphReset = () => {
    setGraphScale(1);
  };

  const getGraphPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = graphSvgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const rect = svg.getBoundingClientRect();
    const scaleX = GRAPH_WIDTH / rect.width;
    const scaleY = GRAPH_HEIGHT / rect.height;
    const scaledX = (event.clientX - rect.left) * scaleX;
    const scaledY = (event.clientY - rect.top) * scaleY;
    const centerX = GRAPH_WIDTH / 2;
    const centerY = GRAPH_HEIGHT / 2;
    return {
      x: centerX + (scaledX - centerX) / graphScale,
      y: centerY + (scaledY - centerY) / graphScale
    };
  };

  const handleNodePointerDown = (event: React.PointerEvent<SVGGElement>, nodeId: string) => {
    event.stopPropagation();
    const point = getGraphPoint(event);
    const current = nodePositions[nodeId] ?? graphNodeMap.get(nodeId);
    if (!current) {
      return;
    }
    nodeDragRef.current = {
      id: nodeId,
      offsetX: point.x - current.x,
      offsetY: point.y - current.y,
      moved: false
    };
  };

  const handleGraphPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const draggingId = nodeDragRef.current.id;
    if (!draggingId) {
      return;
    }
    const point = getGraphPoint(event);
    if (
      Math.abs(point.x - (nodePositions[draggingId]?.x ?? 0)) > 0.5 ||
      Math.abs(point.y - (nodePositions[draggingId]?.y ?? 0)) > 0.5
    ) {
      nodeDragRef.current.moved = true;
    }
    setNodePositions((prev) => ({
      ...prev,
      [draggingId]: {
        x: point.x - nodeDragRef.current.offsetX,
        y: point.y - nodeDragRef.current.offsetY
      }
    }));
  };

  const handleGraphPointerUp = () => {
    nodeDragRef.current.id = null;
    nodeDragRef.current.moved = false;
  };

  const handleNodePointerUp = (nodeId: string) => {
    if (nodeDragRef.current.moved) {
      nodeDragRef.current.moved = false;
      nodeDragRef.current.id = null;
      return;
    }
    setSelectedAuthors((prev) => toggleValue(prev, nodeId));
    nodeDragRef.current.id = null;
  };

  useEffect(() => {
    const next: Record<string, { x: number; y: number }> = {};
    graphData.nodes.forEach((node) => {
      next[node.id] = { x: node.x, y: node.y };
    });
    setNodePositions(next);
  }, [graphData]);

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              Search
            </label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, journal, author"
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Clear all filters
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-200">Year</h3>
            <div className="space-y-2">
              {years.map((year) => (
                <label key={year} className="flex items-center justify-between text-sm text-neutral-300">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year)}
                    onChange={() => setSelectedYears((prev) => toggleValue(prev, year))}
                      className="accent-emerald-400"
                    />
                    {year}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-200">Type</h3>
            <div className="space-y-2">
              {types.map(([type, count]) => (
                <label key={type} className="flex items-center justify-between text-sm text-neutral-300">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                    onChange={() => setSelectedTypes((prev) => toggleValue(prev, type))}
                      className="accent-emerald-400"
                    />
                    {type}
                  </span>
                  <span className="text-xs text-neutral-500">{count}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-200">Journal</h3>
            <div className="space-y-2">
              {(showAllJournals ? journals : journals.slice(0, 6)).map(([journal, count]) => (
                <label key={journal} className="flex items-center justify-between text-sm text-neutral-300">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedJournals.includes(journal)}
                    onChange={() => setSelectedJournals((prev) => toggleValue(prev, journal))}
                      className="accent-emerald-400"
                    />
                    <span className="truncate">{journal}</span>
                  </span>
                  <span className="text-xs text-neutral-500">{count}</span>
                </label>
              ))}
            </div>
            {journals.length > 6 ? (
              <button
                type="button"
                onClick={() => setShowAllJournals((prev) => !prev)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                {showAllJournals ? 'Show fewer journals' : 'Show all journals'}
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-200">Coauthors</h3>
            <div className="space-y-2">
              {(showAllCoauthors ? coauthors : coauthors.slice(0, 8)).map(([author, count]) => (
                <label key={author} className="flex items-center justify-between text-sm text-neutral-300">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAuthors.includes(author)}
                    onChange={() => setSelectedAuthors((prev) => toggleValue(prev, author))}
                      className="accent-emerald-400"
                    />
                    <span className="truncate">{author}</span>
                  </span>
                  <span className="text-xs text-neutral-500">{count}</span>
                </label>
              ))}
            </div>
            {coauthors.length > 8 ? (
              <button
                type="button"
                onClick={() => setShowAllCoauthors((prev) => !prev)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                {showAllCoauthors ? 'Show fewer coauthors' : 'Show all coauthors'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl border border-neutral-800/70 bg-neutral-900/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  Results
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  {selectedPublications.length} publications
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllPublications}
                  className="rounded-full border border-emerald-500/30 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/10"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500"
                >
                  Clear selection
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-800/70 bg-neutral-900/40 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Coauthor graph</h3>
                <p className="text-sm text-neutral-400">
                  Click nodes to filter publications by collaborator.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <span>Top {graphData.nodes.length}</span>
                <button
                  type="button"
                  onClick={handleGraphReset}
                  className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-500"
                >
                  Reset view
                </button>
              </div>
            </div>
            <div
              ref={graphContainerRef}
              className="mt-4 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/40"
              style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
            >
              <svg
                ref={graphSvgRef}
                viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                className="h-[620px] w-full"
                onPointerMove={handleGraphPointerMove}
                onPointerUp={handleGraphPointerUp}
                onPointerLeave={handleGraphPointerUp}
                onPointerCancel={handleGraphPointerUp}
                style={{ touchAction: 'none' }}
              >
                <g
                  transform={`translate(${GRAPH_WIDTH / 2} ${GRAPH_HEIGHT / 2}) scale(${graphScale}) translate(${-GRAPH_WIDTH / 2} ${-GRAPH_HEIGHT / 2})`}
                >
                  {graphData.edges.map((edge) => {
                    const source = nodePositions[edge.source] ?? graphNodeMap.get(edge.source);
                    const target = nodePositions[edge.target] ?? graphNodeMap.get(edge.target);
                    if (!source || !target) {
                      return null;
                    }
                    return (
                      <line
                        key={`${edge.source}-${edge.target}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="rgba(148, 163, 184, 0.25)"
                        strokeWidth={Math.max(1, edge.weight * 0.5)}
                      />
                    );
                  })}
                  {graphData.nodes.map((node) => {
                    const selected = selectedAuthors.includes(node.id);
                    const primary = isPrimaryAuthor(node.label);
                    const position = nodePositions[node.id] ?? { x: node.x, y: node.y };
                    return (
                      <g
                        key={node.id}
                        onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                        onPointerUp={() => handleNodePointerUp(node.id)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={position.x}
                          cy={position.y}
                          r={primary ? 14 : 10}
                          fill={selected ? '#34d399' : primary ? '#f472b6' : '#60a5fa'}
                          stroke="rgba(15, 23, 42, 0.7)"
                          strokeWidth={2}
                        />
                        <text
                          x={position.x + 14}
                          y={position.y + 5}
                          fontSize="12"
                          fill="rgba(226, 232, 240, 0.8)"
                        >
                          {node.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Scroll to zoom · drag nodes to reposition
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800/70 bg-neutral-900/40 p-6">
            <h3 className="text-lg font-semibold text-white">Export selected</h3>
            <p className="text-sm text-neutral-400">
              Export the currently selected publications as BibTeX or CSL JSON.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleCopy(buildBibtex(selectedPublications), 'BibTeX')}
                className="rounded-full border border-emerald-500/60 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
                disabled={!selectedPublications.length}
              >
                Copy BibTeX
              </button>
              <button
                type="button"
                onClick={() => handleCopy(buildCsl(selectedPublications), 'CSL JSON')}
                className="rounded-full border border-blue-500/60 px-4 py-2 text-sm text-blue-200 hover:bg-blue-500/10 disabled:opacity-50"
                disabled={!selectedPublications.length}
              >
                Copy CSL JSON
              </button>
              <span className="text-sm text-neutral-400">
                {selectedPublications.length
                  ? `${selectedPublications.length} selected`
                  : 'No publications selected'}
              </span>
            </div>
            {copyStatus ? <p className="mt-3 text-sm text-emerald-300">{copyStatus}</p> : null}
          </div>

          <div className="space-y-4">
            {selectedPublications.map((pub) => {
              const selected = Boolean(selectedById[getPublicationId(pub)]);
              const link = pub.url || (pub.doi ? `https://doi.org/${pub.doi}` : undefined);
              return (
                <div
                  key={pub.id}
                  className="rounded-2xl border border-neutral-800/70 bg-neutral-900/40 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                          const id = getPublicationId(pub);
                          setSelectedById((prev) => {
                            const next = { ...prev };
                            if (next[id]) {
                              delete next[id];
                            } else {
                              next[id] = true;
                            }
                            return next;
                          });
                        }}
                        className="mt-1 accent-emerald-400"
                      />
                      <div>
                        <h4 className="text-lg font-semibold text-white">{pub.title}</h4>
                        <p className="text-sm text-neutral-400">
                          {pub.journal} · {pub.year} · {pub.type}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {pub.authorsList.slice(0, 6).join(', ')}
                          {pub.authorsList.length > 6 ? '…' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-emerald-300 hover:text-emerald-200"
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            {!selectedPublications.length ? (
              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-900/40 p-6 text-neutral-300">
                {filteredPublications.length
                  ? 'No publications selected.'
                  : 'No publications match these filters.'}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PublicationsExplorer;
