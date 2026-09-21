export const copyDiagnosticsReport = async (report: string): Promise<string> => {
  try {
    if (typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(report);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = report;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
      } finally {
        textarea.remove();
      }
    }
    return 'JSON report copied.';
  } catch {
    console.info('Tower Defense v2 Engine Gate report', report);
    return 'Clipboard unavailable. Report written to the device console.';
  }
};
