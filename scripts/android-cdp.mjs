export async function connectCdp(url, timeoutMilliseconds = 10_000) {
  const socket = new WebSocket(url);
  let nextId = 0;
  let closed = false;
  const pending = new Map();
  const rejectPending = (error) => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  };
  socket.addEventListener('close', () => {
    closed = true;
    rejectPending(new Error('CDP connection closed'));
  });
  socket.addEventListener('error', () => rejectPending(new Error('CDP connection failed')));
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) request.reject(new Error(JSON.stringify(message.error)));
    else request.resolve(message.result);
  });
  await new Promise((resolve, reject) => {
    const finish = (error) => {
      clearTimeout(timer);
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('close', onClose);
      socket.removeEventListener('error', onError);
      if (error) { socket.close(); reject(error); }
      else resolve();
    };
    const onOpen = () => finish();
    const onClose = () => finish(new Error('CDP connection closed before opening'));
    const onError = () => finish(new Error('CDP connection failed to open'));
    const timer = setTimeout(() => finish(new Error('CDP connection timed out')), timeoutMilliseconds);
    socket.addEventListener('open', onOpen);
    socket.addEventListener('close', onClose);
    socket.addEventListener('error', onError);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    if (closed || socket.readyState !== 1) { reject(new Error('CDP connection closed')); return; }
    const id = ++nextId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`${method} timed out`));
    }, timeoutMilliseconds);
    pending.set(id, { resolve, reject, timer });
    try { socket.send(JSON.stringify({ id, method, params })); }
    catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
  });
  return {
    send,
    async evaluate(expression) {
      const result = await send('Runtime.evaluate', {
        expression, returnByValue: true, awaitPromise: true, userGesture: true,
      });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result?.value;
    },
    close() {
      closed = true;
      rejectPending(new Error('CDP connection closed'));
      socket.close();
    },
  };
}
