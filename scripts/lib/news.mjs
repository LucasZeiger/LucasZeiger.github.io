import { homedir } from 'node:os';
import { resolve, relative, isAbsolute, dirname, extname } from 'node:path';
import { mkdir, readFile, readdir, realpath, stat, writeFile, rename, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';
import sharp from 'sharp';

export const ROOT = resolve(import.meta.dirname, '../..');
export const PUBLISHED = resolve(ROOT, 'content/news');
export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export const exists = async path => {
  try { await stat(path); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};

export const inside = (parent, child) => {
  const path = relative(resolve(parent), resolve(child));
  return path === '' || (!path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && path !== '..' && !isAbsolute(path));
};

export const containedFile = async (parent, file) => {
  const path = resolve(parent, file);
  if (!inside(parent, path)) throw new Error(`File must stay inside its post folder: ${file}`);
  if (!inside(await realpath(parent), await realpath(path))) throw new Error(`Linked file leaves its post folder: ${file}`);
  return path;
};

export const getInbox = async () => {
  const configPath = resolve(ROOT, 'news.local.json');
  const config = await exists(configPath) ? JSON.parse(await readFile(configPath, 'utf8')) : {};
  return resolve(process.env.WEBSITE_NEWS_INBOX || config.inboxPath || resolve(homedir(), 'Documents/Website Inbox'));
};

export const validId = id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(id);

export const validatePost = (data, body, { draft = false } = {}) => {
  if (!validId(data.id)) throw new Error('News ID must contain only letters, numbers, and hyphens.');
  if (typeof data.title !== 'string' || !data.title.trim()) throw new Error(`${data.id}: title is required.`);
  if (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || Number.isNaN(Date.parse(data.date)) || new Date(data.date).toISOString().slice(0, 10) !== data.date) {
    throw new Error(`${data.id}: supply a real event date in YYYY-MM-DD format.`);
  }
  for (const field of ['summary', 'displayDate']) {
    if (data[field] !== undefined && typeof data[field] !== 'string') throw new Error(`${data.id}: ${field} must be text.`);
  }
  if (!body.trim()) throw new Error(`${data.id}: the news body is empty.`);
  if (/!\[[^\]]*\]\(/.test(body)) throw new Error(`${data.id}: put pictures in the images list rather than Markdown image links.`);
  if (data.images !== undefined && !Array.isArray(data.images)) throw new Error(`${data.id}: images must be a list.`);
  for (const image of data.images || []) {
    if (typeof image.file !== 'string' || !IMAGE_EXTENSIONS.has(extname(image.file).toLowerCase())) throw new Error(`${data.id}: images must be local JPG, PNG, or WebP files.`);
    if (!draft && (typeof image.alt !== 'string' || !image.alt.trim())) throw new Error(`${data.id}: every published picture needs an image description.`);
    if (image.alt !== undefined && typeof image.alt !== 'string') throw new Error(`${data.id}: image descriptions must be text.`);
    if (image.caption !== undefined && typeof image.caption !== 'string') throw new Error(`${data.id}: image captions must be text.`);
  }
};

export const readPost = async (folder, { draft = false } = {}) => {
  const file = await containedFile(folder, 'post.md');
  const text = await readFile(file, 'utf8');
  if (!/^---\r?\n/.test(text)) throw new Error('News metadata must use a plain YAML header beginning with ---.');
  const { data, content } = matter(text, { language: 'yaml' });
  if (data.date instanceof Date) data.date = data.date.toISOString().slice(0, 10);
  validatePost(data, content, { draft });
  if (data.id !== folder.split(/[\\/]/).pop()) throw new Error(`${data.id}: the post folder must match its ID.`);
  for (const image of data.images || []) await containedFile(folder, image.file);
  return { ...data, body: content.trim(), folder, draft };
};

export const listPosts = async (root, options = {}) => {
  if (!await exists(root)) return [];
  const folders = await readdir(root, { withFileTypes: true });
  const posts = [];
  for (const folder of folders.sort((a, b) => a.name.localeCompare(b.name))) {
    if (folder.isDirectory() && !folder.name.startsWith('.')) {
      const path = resolve(root, folder.name);
      if (await exists(resolve(path, 'post.md'))) posts.push(await readPost(path, options));
    }
  }
  return posts;
};

export const optimizeImage = async source => {
  const bytes = await readFile(source);
  const hash = createHash('sha256').update('news-webp-v1').update(bytes).digest('hex').slice(0, 24);
  const target = resolve(ROOT, '.generated/news-media', `${hash}.webp`);
  await mkdir(dirname(target), { recursive: true });
  if (!await exists(target)) {
    await sharp(bytes).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toFile(target);
  }
  const { width, height } = await sharp(target).metadata();
  return { path: target, width, height };
};

export const loadNews = async ({ preview = false, publishedRoot = PUBLISHED, draftRoot } = {}) => {
  const posts = await listPosts(publishedRoot);
  const byId = new Map(posts.map(post => [post.id, post]));
  if (preview) {
    const localDraftRoot = draftRoot || resolve(await getInbox(), '.drafts');
    for (const post of await listPosts(localDraftRoot, { draft: true })) byId.set(post.id, post);
  }
  const result = [];
  for (const post of byId.values()) {
    const images = [];
    for (const image of post.images || []) {
      const optimized = await optimizeImage(await containedFile(post.folder, image.file));
      images.push({ ...optimized, alt: image.alt || '', caption: image.caption || '' });
    }
    result.push({
      id: post.id, title: post.title, date: post.date,
      displayDate: post.displayDate || new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(post.date)),
      summary: post.summary || '', body: post.body, draft: post.draft, images
    });
  }
  return result.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
};

export const writePost = async (folder, data, body) => {
  await mkdir(folder, { recursive: true });
  const temporary = resolve(folder, '.post.md.tmp');
  await writeFile(temporary, matter.stringify(`${body.trim()}\n`, data), 'utf8');
  await rename(temporary, resolve(folder, 'post.md'));
};

export const approveDraft = async (id, { inbox, publishedRoot = PUBLISHED }) => {
  if (!validId(id)) throw new Error('Supply a valid draft ID.');
  const source = resolve(inbox, '.drafts', id);
  const post = await readPost(source);
  const target = resolve(publishedRoot, id);
  const existing = await exists(resolve(target, 'post.md')) ? await readPost(target) : null;
  const images = post.images || [];
  // Validate all selected sources before changing the approved content.
  const sources = await Promise.all(images.map(image => containedFile(source, image.file)));
  await mkdir(target, { recursive: true });
  if (!inside(await realpath(publishedRoot), await realpath(target))) throw new Error('Published post folder links outside the content directory.');
  for (const [index, image] of images.entries()) {
    const destination = resolve(target, image.file);
    await mkdir(dirname(destination), { recursive: true });
    if (!inside(await realpath(target), await realpath(dirname(destination)))) throw new Error('Published image folder links outside its post.');
    if (await exists(destination)) await containedFile(target, image.file);
    await copyFile(sources[index], destination);
  }
  const data = { id: post.id, title: post.title, date: post.date, summary: post.summary || '', images };
  if (post.displayDate) data.displayDate = post.displayDate;
  if (!data.displayDate && existing?.displayDate && existing.date === post.date) data.displayDate = existing.displayDate;
  await writePost(target, data, post.body);
  await writeFile(resolve(source, 'approved.json'), `${JSON.stringify({ approvedAt: new Date().toISOString(), contentPath: relative(ROOT, target) }, null, 2)}\n`);
  return target;
};
