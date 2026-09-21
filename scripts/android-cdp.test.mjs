import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectCdp } from './android-cdp.mjs';

class FakeSocket extends EventTarget {
  static latest;
  readyState = 1;
  sent = [];
  constructor() {
    super();
    FakeSocket.latest = this;
    queueMicrotask(() => this.dispatchEvent(new Event('open')));
  }
  send(raw) { this.sent.push(JSON.parse(raw)); }
  reply(message) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(message) })); }
  close() { this.readyState = 3; this.dispatchEvent(new Event('close')); }
}

const mockSocket = (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'WebSocket');
  Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: FakeSocket });
  t.after(() => Object.defineProperty(globalThis, 'WebSocket', original));
};

test('matches out-of-order CDP responses and ignores unrelated events', async (t) => {
  mockSocket(t);
  const client = await connectCdp('ws://localhost/test');
  try {
    const a = client.send('Page.enable');
    const b = client.send('Runtime.enable');
    FakeSocket.latest.reply({ method: 'Page.loadEventFired' });
    FakeSocket.latest.reply({ id: 2, result: { second: true } });
    FakeSocket.latest.reply({ id: 1, result: { first: true } });
    assert.deepEqual(await a, { first: true });
    assert.deepEqual(await b, { second: true });
  } finally { client.close(); }
});

test('surfaces protocol and page evaluation failures instead of returning false success', async (t) => {
  mockSocket(t);
  const client = await connectCdp('ws://localhost/test');
  try {
    const protocol = assert.rejects(client.send('Bad.method'), /Unknown method/);
    FakeSocket.latest.reply({ id: 1, error: { message: 'Unknown method' } });
    await protocol;
    const script = assert.rejects(client.evaluate('bad()'), /ReferenceError/);
    FakeSocket.latest.reply({ id: 2, result: { exceptionDetails: { text: 'ReferenceError' } } });
    await script;
    const value = client.evaluate('42');
    FakeSocket.latest.reply({ id: 3, result: { result: { value: 42 } } });
    assert.equal(await value, 42);
  } finally { client.close(); }
});

test('rejects pending and subsequent work immediately on disconnect', async (t) => {
  mockSocket(t);
  const client = await connectCdp('ws://localhost/test');
  const pending = assert.rejects(client.send('Page.enable'), /closed/i);
  FakeSocket.latest.close();
  await pending;
  await assert.rejects(client.send('Page.enable'), /closed/i);
});

test('request timeout clears only that request and leaves the connection usable', async (t) => {
  mockSocket(t);
  const client = await connectCdp('ws://localhost/test', 20);
  try {
    await assert.rejects(client.send('Page.enable'), /timed out/);
    const next = client.send('Runtime.enable');
    FakeSocket.latest.reply({ id: 1, result: {} });
    FakeSocket.latest.reply({ id: 2, result: { ready: true } });
    assert.deepEqual(await next, { ready: true });
  } finally { client.close(); }
});
