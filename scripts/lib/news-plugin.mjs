import { resolve } from 'node:path';
import { getInbox, inside, loadNews, PUBLISHED } from './news.mjs';

export const newsPlugin = ({ command, mode }) => {
  if (command === 'build' && mode === 'news-preview') throw new Error('News drafts are local previews only. Use the normal production build.');
  const preview = command === 'serve' && mode === 'news-preview';
  const id = '\0virtual:news';
  return {
    name: 'file-based-news',
    transformIndexHtml(html) {
      if (preview) return html.replace(/<meta name="robots" content="[^"]*"\s*\/?>/, '<meta name="robots" content="noindex, nofollow" />');
    },
    resolveId(source) { if (source === 'virtual:news') return id; },
    async load(source) {
      if (source !== id) return;
      const news = await loadNews({ preview });
      const imports = [];
      const entries = news.map(post => {
        const images = post.images.map(image => {
          const name = `newsImage${imports.length}`;
          imports.push(`import ${name} from ${JSON.stringify(image.path.replaceAll('\\', '/'))};`);
          const { path, ...metadata } = image;
          return `{ ...${JSON.stringify(metadata)}, src: ${name} }`;
        });
        const { images: unused, ...data } = post;
        return `{ ...${JSON.stringify(data)}, images: [${images.join(',')}] }`;
      });
      return `${imports.join('\n')}\nexport const NEWS_PREVIEW = ${preview};\nexport const NEWS = [${entries.join(',\n')}];`;
    },
    async configureServer(server) {
      const roots = [PUBLISHED];
      if (preview) roots.push(resolve(await getInbox(), '.drafts'));
      server.watcher.add(roots);
      server.watcher.on('all', (event, file) => {
        if (!roots.some(root => inside(root, file))) return;
        const module = server.moduleGraph.getModuleById(id);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      });
    }
  };
};
