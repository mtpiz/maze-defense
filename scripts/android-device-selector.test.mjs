import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { selectPhysicalAndroidDevice } from './android-device-selector.mjs';

test('selects one authorized physical phone and ignores emulators and unauthorized endpoints', () => {
  const output = `List of devices attached
192.168.68.122:5555 unauthorized transport_id:3
emulator-5554 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa transport_id:1
192.168.68.105:42621 device product:pa2qsqw model:SM_S936U device:pa2q transport_id:7
`;

  assert.deepEqual(selectPhysicalAndroidDevice(output), {
    serial: '192.168.68.105:42621', model: 'SM_S936U', device: 'pa2q',
  });
});

test('deduplicates the IP and mDNS identities for the same physical phone and prefers the IP endpoint', () => {
  const output = `List of devices attached
adb-R5CY208HQKF._adb-tls-connect._tcp device product:pa2qsqw model:SM_S936U device:pa2q transport_id:6
192.168.68.105:42621 device product:pa2qsqw model:SM_S936U device:pa2q transport_id:7
`;

  assert.equal(selectPhysicalAndroidDevice(output).serial, '192.168.68.105:42621');
});

test('refuses to select when no authorized physical phone or multiple phones are present', () => {
  assert.throws(() => selectPhysicalAndroidDevice('List of devices attached\nemulator-5554 device model:sdk_gphone64_x86_64 device:emu64xa\n'),
    /No authorized physical Android phone/);
  assert.throws(() => selectPhysicalAndroidDevice(`List of devices attached
10.0.0.2:4000 device product:one model:Phone_One device:one
10.0.0.3:4000 device product:two model:Phone_Two device:two
`), /Multiple physical Android phones/);
});

test('reads adb output from stdin when used by the phone deployment script', () => {
  const result = spawnSync(process.execPath, ['scripts/android-device-selector.mjs'], {
    cwd: process.cwd(), encoding: 'utf8', input: `List of devices attached
192.168.68.105:42621 device product:pa2qsqw model:SM_S936U device:pa2q transport_id:7
`,
  });

  assert.equal(result.status, 0);
  assert.equal(result.stdout, '192.168.68.105:42621');
  assert.equal(result.stderr, '');
});
