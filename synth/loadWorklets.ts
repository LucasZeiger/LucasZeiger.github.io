export async function loadWorklets(ctx: AudioContext) {
  const base = import.meta.env.BASE_URL;
  await ctx.audioWorklet.addModule(`${base}worklets/gate.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/clock.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/adsr.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/arp.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/slew.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/samplehold.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/quantizer.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/logic.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/noise.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/bitcrusher.worklet.js`);
  await ctx.audioWorklet.addModule(`${base}worklets/wavefolder.worklet.js`);
}
