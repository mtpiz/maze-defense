import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const client = 'D:/Code/tower-defense-codex/scripts/generate-gemini-images.mjs';
const model = 'gemini-3.1-flash-image';
const briefs = JSON.parse(await readFile(join(root, 'briefs.json'), 'utf8'));
const common = `Generate one premium full-screen portrait mobile tower-defense gameplay concept, not a phone mockup or marketing page. Show the complete playable screen with no exterior device bezel, title card, explanatory prose, extra screens, or collage. Portrait 9:16. The fully visible top-down 9-column by 14-row arena takes about 75 percent of the screen height, with compact HUD above and thumb-reachable controls below. Keep terrain quiet and the playfield unframed, with every cell visible. Original futuristic player machinery fights biological or biomechanical Brood, not medieval fantasy. Use crisp miniature silhouettes: narrow long Rail accelerator towers versus broad heavy Siege launchers; about 20 small distinct enemy shapes. Show a faded route through permanent numbered waypoints 1 and 2, a clear spawn and exit, and strategically placed tower blockers beside open paths. No tower or control obscures a waypoint or path. This is a between-wave planning state with a faint next-wave route and enemy forecast, not a results or menu screen. Show these short exact HUD labels once each: 'LIVES 20', 'WAVE 3/6', '85', '1x'. Include familiar pause and settings symbols. The lower command area has tower symbols with short labels 'Foundation', 'Rail', 'Siege', and one clear 'Launch' action. All text is large enough for a small phone. Controls must not cover the arena. Strong light-dark silhouette contrast, restrained effects, clean typography, no excessive bloom, glossy plastic, or decorative floating orbs. Use reference principles only: Infinitode's modular hierarchy, Geometry Wars' shape and energy separation, The Tower's economy of HUD. Do not copy their artwork or logos. Follow the specific layout, material and art direction below rather than making a generic recolor.`;
const jobs = briefs.hud.map((brief) => ({
  id: brief.id, name: brief.name, aspect: '9:16',
  prompt: `${common}\n\nSpecific direction: ${brief.name}. ${brief.direction}`,
}));
for (const family of ['siege', 'rail']) {
  jobs.push({
    id: `${family}-sheet`, name: `${family === 'siege' ? 'Siege' : 'Rail'} silhouettes`, aspect: '5:4',
    prompt: `Create one clean industrial-design silhouette exploration sheet containing EXACTLY TEN distinct stationary science-fiction ${family} defense towers. White background, solid black silhouettes, no color, shading, texture, gradients, cast shadows, scenery, muzzle flashes, smoke, effects, or decorative frames. Orthographic TOP-DOWN overhead view, front of every tower points UP. Use a 5-column by 2-row equal-cell layout, with generous gutters so shapes never touch. Each tower has a compact anchored foundation suitable for a single square game tile; no vehicles, wheels, or movable tank chassis. All shapes stay within their cell. Every option must have a genuinely different bold outer contour readable at 32 pixels. Minimal white negative spaces may define the barrel opening or separation, but no fine internal detail. ${family === 'siege' ? 'SIEGE family: wide, squat, heavy explosive launchers, massive housings, short thick mortar barrels, broad recoil anchors. Family reads as concentrated mass, not a long rifle.' : 'RAIL family: slender precise linear accelerators, visibly long barrel or paired prongs, compact anchored bases. Family reads as directed precision, not a squat mortar or aircraft.'} Put only the numerals 01 through 10 centered below the respective silhouette, in reading order. No title, captions, extra glyphs, or repeated alternatives. Match these ten distinct concepts in order:\n${briefs[family].map((brief, index) => `${String(index + 1).padStart(2, '0')}. ${brief.name}: ${brief.silhouette}`).join('\n')}`,
  });
}
const selected = process.argv.slice(2);
if (selected.some((id) => !jobs.some((job) => job.id === id))) throw new Error('Unknown concept ID');
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');
for (const directory of ['images', 'prompts', 'raw']) await mkdir(join(root, directory), { recursive: true });
await writeFile(join(root, 'generation-plan.json'), JSON.stringify({ model, jobs }, null, 2));
for (const job of jobs.filter((item) => !selected.length || selected.includes(item.id))) {
  const saved = (await readdir(join(root, 'images'))).find((name) =>
    name === `${job.id}.png` || name === `${job.id}.jpg` || name === `${job.id}.webp`);
  if (saved) { console.log(`${job.id}: already saved; skipped`); continue; }
  const promptFile = join(root, 'prompts', `${job.id}.txt`);
  await writeFile(promptFile, job.prompt);
  const prior = (await readdir(join(root, 'raw'))).filter((name) => name.endsWith(`-${job.id}`)).sort();
  let folder = prior.length ? join(root, 'raw', prior.at(-1)) : null;
  const findImage = async (directory) => (await readdir(directory)).find((name) =>
    name.startsWith(`${job.id}-01.`) && /\.(png|jpg|webp)$/.test(name));
  let filename = folder ? await findImage(folder) : null;
  if (!filename) {
    console.log(`${job.id}: generating with ${model}...`);
    try {
      execFileSync(process.execPath, [client, '--prompt-file', promptFile, '--model', model,
        '--aspect', job.aspect, '--size', '2K', '--name', job.id, '--out-dir', join(root, 'raw')],
      { timeout: 240_000, maxBuffer: 1024 * 1024, windowsHide: true, stdio: 'pipe' });
    } catch (error) {
      const message = String(error.stderr ?? error.message).replaceAll(process.env.GEMINI_API_KEY, '[REDACTED]');
      throw new Error(`${job.id}: ${message}`);
    }
    const folders = (await readdir(join(root, 'raw'))).filter((name) => name.endsWith(`-${job.id}`)).sort();
    folder = join(root, 'raw', folders.at(-1));
    filename = await findImage(folder);
  }
  if (!filename) throw new Error(`${job.id}: API returned no image`);
  const outputName = `${job.id}.${filename.split('.').at(-1)}`;
  const destination = join(root, 'images', outputName);
  await copyFile(join(folder, filename), destination);
  const response = JSON.parse(await readFile(join(folder, 'response.json'), 'utf8'));
  await writeFile(join(root, 'images', `${job.id}.json`), JSON.stringify({
    id: job.id, name: job.name, model, generatedAt: new Date().toISOString(),
    source: folder, usage: response.usageMetadata ?? null,
  }, null, 2));
  console.log(`${job.id}: saved images/${outputName}`);
}
