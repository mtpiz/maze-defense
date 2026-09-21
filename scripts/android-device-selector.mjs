import { pathToFileURL } from 'node:url';

const IP_ENDPOINT = /^\d{1,3}(?:\.\d{1,3}){3}:\d+$/;

export function selectPhysicalAndroidDevice(output) {
  const devices = String(output).split(/\r?\n/).flatMap((line) => {
    const match = line.trim().match(/^(\S+)\s+device\s+(.+)$/);
    if (!match) return [];
    const [, serial, details] = match;
    const fields = Object.fromEntries([...details.matchAll(/(\w+):(\S+)/g)].map((item) => [item[1], item[2]]));
    if (serial.startsWith('emulator-') || fields.model?.startsWith('sdk_') || fields.device?.startsWith('emu')) return [];
    return [{ serial, model: fields.model ?? 'unknown', device: fields.device ?? 'unknown', product: fields.product ?? 'unknown' }];
  });

  const identities = new Map();
  for (const candidate of devices) {
    const key = `${candidate.product}|${candidate.model}|${candidate.device}`;
    const current = identities.get(key);
    if (!current || IP_ENDPOINT.test(candidate.serial)) identities.set(key, candidate);
  }
  const physical = [...identities.values()];
  if (physical.length === 0) throw new Error('No authorized physical Android phone was found. Enable Wireless debugging and pair this computer.');
  if (physical.length > 1) throw new Error(`Multiple physical Android phones are connected: ${physical.map(({ model }) => model).join(', ')}`);
  const { serial, model, device } = physical[0];
  return { serial, model, device };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const output = Buffer.concat(chunks).toString('utf8');
    process.stdout.write(selectPhysicalAndroidDevice(output).serial);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
