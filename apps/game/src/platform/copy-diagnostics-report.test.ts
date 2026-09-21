// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest';
import { copyDiagnosticsReport } from './copy-diagnostics-report.js';

afterEach(() => {
  Reflect.deleteProperty(document, 'execCommand');
  vi.restoreAllMocks();
});

it('copies through the selection fallback and removes its temporary field', async () => {
  Object.defineProperty(document, 'execCommand', { configurable: true, value: (command: string) => {
    expect(command).toBe('copy');
    const field = document.querySelector('textarea')!;
    expect(field.value).toBe('{"sample":true}');
    expect(field.selectionEnd - field.selectionStart).toBe(field.value.length);
    return true;
  } });
  expect(await copyDiagnosticsReport('{"sample":true}')).toBe('JSON report copied.');
  expect(document.querySelector('textarea')).toBeNull();
});

it('removes the field and retains the report when the fallback throws', async () => {
  Object.defineProperty(document, 'execCommand', { configurable: true, value: () => { throw new Error('denied'); } });
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  expect(await copyDiagnosticsReport('{"sample":true}')).toContain('Clipboard unavailable');
  expect(document.querySelector('textarea')).toBeNull();
  expect(log).toHaveBeenCalledWith('Tower Defense v2 Engine Gate report', '{"sample":true}');
});
