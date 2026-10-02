import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';

await mkdir('.generated/images', { recursive: true });
const images = [
  { name: 'profile', extension: 'jpg', portrait: true },
  { name: 'spatial_mapk', extension: 'png', portrait: false },
  { name: 'Slc7a5', extension: 'png', portrait: false }
];

for (const image of images) {
  const source = `data/images/${image.name}.${image.extension}`;
  const target = `.generated/images/${image.name}.webp`;
  let pipeline = sharp(source);
  if (image.portrait) {
    pipeline = pipeline.resize({ width: 640, withoutEnlargement: true }).webp({ quality: 85 });
  } else {
    // Preserve every pixel and all scientific figure labels.
    pipeline = pipeline.webp({ lossless: true });
  }
  await pipeline.toFile(target);
  const original = await stat(source);
  const optimized = await stat(target);
  console.log(`${image.name}: ${original.size} -> ${optimized.size} bytes`);
}
