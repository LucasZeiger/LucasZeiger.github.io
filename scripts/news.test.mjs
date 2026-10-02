import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { loadNews, readPost, writePost, approveDraft, containedFile, validatePost, ROOT } from './lib/news.mjs';
import { newsPlugin } from './lib/news-plugin.mjs';

const metadata = { id: 'test-news', title: 'Conference update', date: '2026-10-02', summary: 'A short update.' };
const cli = (inbox, ...args) => spawnSync(process.execPath, [resolve(ROOT, 'scripts/news-inbox.mjs'), ...args], {
  cwd: ROOT, env: { ...process.env, WEBSITE_NEWS_INBOX: inbox }, encoding: 'utf8'
});

test('rough-note preparation, private preview, image approval, and stable edits', async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), 'website-news-test-'));
  const inbox = resolve(temporary, 'inbox');
  const published = resolve(temporary, 'published');
  const draftRoot = resolve(inbox, '.drafts');
  try {
    const source = resolve(inbox, 'conference');
    await mkdir(source, { recursive: true });
    await mkdir(published);
    await writeFile(resolve(source, 'note.html'), '<html><body><h1>Conference notes</h1><p>Presented a poster. <a href="https://example.com/meeting">Meeting details</a>.</p><script>alert(1)</script></body></html>');
    const image = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#445566' } }).png().toBuffer();
    await writeFile(resolve(source, 'photo.png'), image);
    await writeFile(resolve(source, 'same-photo.png'), image);
    const prepared = cli(inbox, 'prepare', 'conference', '--id', 'test-news', '--date', '2026-10-02', '--title', 'Conference update');
    assert.equal(prepared.status, 0, prepared.stderr);
    const draftFolder = resolve(draftRoot, 'test-news');
    const draft = await readPost(draftFolder, { draft: true });
    assert(draft.body.includes('[Meeting details](https://example.com/meeting)'));
    assert(!draft.body.includes('alert(1)'));
    assert.equal(draft.images.length, 2);
    assert.equal((await loadNews({ publishedRoot: published, draftRoot })).length, 0, 'Draft leaked into normal news');
    const preview = await loadNews({ preview: true, publishedRoot: published, draftRoot });
    assert.equal(preview.length, 1);
    assert.equal(preview[0].draft, true);
    assert.equal(preview[0].images[0].width, 1600);
    assert.equal(preview[0].images[0].height, 800);
    await assert.rejects(approveDraft('test-news', { inbox, publishedRoot: published }), /image description/);
    const repeat = cli(inbox, 'prepare', 'conference', '--id', 'test-news', '--date', '2026-10-02');
    assert.notEqual(repeat.status, 0, 'Preparing again overwrote agent edits');
    const images = [{ ...draft.images[0], alt: 'A conference poster', caption: 'Poster session.' }];
    await writePost(draftFolder, { ...metadata, displayDate: '02–04 Oct 2026', images }, 'Formatted update with **emphasis**.');
    await approveDraft('test-news', { inbox, publishedRoot: published });
    const approved = await loadNews({ publishedRoot: published, draftRoot });
    assert.equal(approved.length, 1);
    assert.equal(approved[0].draft, false);
    assert.equal(approved[0].body, 'Formatted update with **emphasis**.');
    assert.equal(approved[0].images.length, 1, 'Unselected picture was published');
    await writePost(draftFolder, { ...metadata, images }, 'Revised update.');
    await approveDraft('test-news', { inbox, publishedRoot: published });
    const edited = await loadNews({ publishedRoot: published, draftRoot });
    assert.equal(edited.length, 1, 'Editing created a duplicate news entry');
    assert.equal(edited[0].displayDate, '02–04 Oct 2026');
    assert.equal(edited[0].body, 'Revised update.');
    await assert.rejects(containedFile(draftFolder, '../../conference/note.html'), /inside its post folder/);
    const badSelection = cli(inbox, 'prepare', '../published', '--id', 'escape', '--date', '2026-10-02');
    assert.notEqual(badSelection.status, 0);
    assert((await readFile(resolve(draftFolder, 'source.md'), 'utf8')).includes('Conference notes'));
    const executable = resolve(draftRoot, 'bad-header');
    await mkdir(executable);
    await writeFile(resolve(executable, 'post.md'), '---javascript\n({ id: "bad-header" })\n---\nBody');
    await assert.rejects(readPost(executable, { draft: true }), /plain YAML header/);
  } finally {
    assert(temporary.startsWith(resolve(tmpdir(), 'website-news-test-')));
    await rm(temporary, { recursive: true, force: true });
  }
});

test('invalid dates and IDs are rejected; preview builds are forbidden', () => {
  assert.throws(() => validatePost({ ...metadata, date: '2026-02-30' }, 'Body'), /real event date/);
  assert.throws(() => validatePost({ ...metadata, id: '../escape' }, 'Body'), /ID/);
  assert.throws(() => newsPlugin({ command: 'build', mode: 'news-preview' }), /local previews only/);
});

test('ordinary site module excludes local drafts', async () => {
  const plugin = newsPlugin({ command: 'build', mode: 'production' });
  const code = await plugin.load(plugin.resolveId('virtual:news'));
  assert(code.includes('NEWS_PREVIEW = false'));
  assert(!code.includes('"draft":true'));
  const news = await loadNews();
  assert(news.length > 0);
  assert(news.every(post => !post.draft));
  assert.equal(new Set(news.map(post => post.id)).size, news.length);
});
