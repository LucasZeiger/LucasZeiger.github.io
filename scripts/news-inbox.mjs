import { resolve, relative, basename, extname } from 'node:path';
import { mkdir, readFile, readdir, copyFile, writeFile, realpath } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import TurndownService from 'turndown';
import { ROOT, IMAGE_EXTENSIONS, exists, getInbox, inside, containedFile, validId, validatePost, writePost, approveDraft } from './lib/news.mjs';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    inbox: { type: 'string' }, id: { type: 'string' }, date: { type: 'string' },
    title: { type: 'string' }, summary: { type: 'string' }, 'display-date': { type: 'string' }
  }
});
const [command, selection] = positionals;
const inbox = values.inbox ? resolve(values.inbox) : await getInbox();
if (inside(ROOT, inbox)) throw new Error('The news inbox must be outside the website repository.');
const drafts = resolve(inbox, '.drafts');

const scanFiles = async folder => {
  const files = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    if (item.name.startsWith('.')) continue;
    const path = resolve(folder, item.name);
    if (item.isDirectory()) files.push(...await scanFiles(path));
    else if (item.isFile()) files.push(await containedFile(folder, item.name));
  }
  return files.sort();
};

if (command === 'init') {
  await mkdir(drafts, { recursive: true });
  await writeFile(resolve(ROOT, 'news.local.json'), `${JSON.stringify({ inboxPath: inbox }, null, 2)}\n`);
  const instructions = resolve(inbox, 'START HERE.txt');
  if (!await exists(instructions)) {
    await writeFile(instructions, 'Website news inbox\n\nMake one folder for each update. Drop in rough notes (.txt or .md), an Evernote HTML export and its resources folder, and JPG/PNG/WebP pictures.\n\nTell Codex: Prepare a news update from my inbox. You can supply the event date in your message or notes. Codex will format the text and pictures and give you a local preview.\n\nReview the preview, then ask for publication separately. Dropping files here does not publish them or start an unattended agent.\n\n.drafts contains prepared updates and review records. Keep original notes and pictures until you are happy with the result.\n');
  }
  console.log(`News inbox ready: ${inbox}`);
} else if (command === 'list') {
  if (!await exists(inbox)) throw new Error('Run npm run news:init first.');
  console.log(`Inbox: ${inbox}`);
  for (const item of await readdir(inbox, { withFileTypes: true })) {
    if (item.name.startsWith('.') || item.name === 'START HERE.txt') continue;
    if (item.isDirectory()) {
      const files = await scanFiles(resolve(inbox, item.name));
      console.log(`\n${item.name}\n${files.map(file => `  ${relative(inbox, file)}`).join('\n')}`);
    } else console.log(`Loose file: ${item.name} (group notes and photos in an update folder)`);
  }
  if (await exists(drafts)) {
    const prepared = await readdir(drafts);
    if (prepared.length) console.log(`\nPrepared drafts: ${prepared.join(', ')}`);
  }
} else if (command === 'prepare') {
  if (!selection || !values.id || !values.date) throw new Error('Usage: npm run news:prepare -- <inbox-folder> --id <stable-id> --date YYYY-MM-DD [--title "Title"]');
  if (!validId(values.id)) throw new Error('Use a stable ID made of letters, numbers, and hyphens.');
  const source = resolve(inbox, selection);
  if (!inside(inbox, source) || inside(drafts, source) || source === inbox) throw new Error('Select one update folder inside the inbox.');
  if (!inside(await realpath(inbox), await realpath(source))) throw new Error('The update folder must not link outside the inbox.');
  const target = resolve(drafts, values.id);
  if (await exists(target)) throw new Error(`Draft ${values.id} already exists. Edit its post.md to keep your agent edits; preparation never overwrites drafts.`);
  const files = await scanFiles(source);
  const notes = files.filter(file => ['.txt', '.md', '.html', '.htm'].includes(extname(file).toLowerCase()));
  if (!notes.length) throw new Error('Add a .txt/.md note or an Evernote HTML export to this folder.');
  const converter = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
  converter.remove(['script', 'style', 'img']);
  const sources = [];
  for (const note of notes) {
    const raw = await readFile(note, 'utf8');
    const text = /\.html?$/i.test(note) ? converter.turndown(raw) : raw;
    sources.push({ file: relative(source, note), text });
  }
  const body = sources.map(note => note.text).join('\n\n---\n\n').replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim();
  const data = { id: values.id, title: values.title || basename(source).replaceAll('-', ' '), date: values.date, summary: values.summary || '', images: [] };
  if (values['display-date']) data.displayDate = values['display-date'];
  const photos = files.filter(file => IMAGE_EXTENSIONS.has(extname(file).toLowerCase()));
  const copies = [];
  for (const photo of photos) {
    const hash = createHash('sha256').update(await readFile(photo)).digest('hex').slice(0, 10);
    const name = `${basename(photo, extname(photo)).replace(/[^A-Za-z0-9-]/g, '-').slice(0, 60) || 'photo'}-${hash}${extname(photo).toLowerCase()}`;
    if (!data.images.some(image => image.file === `images/${name}`)) data.images.push({ file: `images/${name}`, alt: '', caption: '' });
    copies.push({ source: photo, file: `images/${name}` });
  }
  validatePost(data, body, { draft: true });
  await mkdir(resolve(target, 'images'), { recursive: true });
  for (const copy of copies) await copyFile(copy.source, resolve(target, copy.file));
  await writePost(target, data, body);
  await writeFile(resolve(target, 'source.md'), sources.map(note => `# Source: ${note.file}\n\n${note.text}`).join('\n\n'), 'utf8');
  await writeFile(resolve(target, 'review.json'), `${JSON.stringify({ sourceFolder: source, preparedAt: new Date().toISOString() }, null, 2)}\n`);
  console.log(`Prepared: ${resolve(target, 'post.md')}\nThe agent should now edit the title, summary, body, captions, and image descriptions.\nPreview: npm run news:preview\nOpen /news?item=${values.id}`);
} else if (command === 'approve') {
  if (!selection || !validId(selection)) throw new Error('Usage: npm run news:approve -- <draft-id>');
  const target = await approveDraft(selection, { inbox });
  console.log(`Approved locally: ${target}\nNext: build, review the Git diff, and commit. Nothing has been pushed or deployed.`);
} else {
  throw new Error('Commands: init, list, prepare, approve. Preview uses npm run news:preview.');
}
