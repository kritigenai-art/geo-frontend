// Throttle Wikipedia requests: 1 at a time, 600ms between each, retry once on 429
export const wikiQueue = (() => {
  const queue = [];
  let running = false;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const runNext = async () => {
    if (running || queue.length === 0) return;
    running = true;
    const { fn, resolve, reject } = queue.shift();
    try {
      let result;
      try {
        result = await fn();
      } catch (e) {
        if (e?.response?.status === 429) {
          await sleep(2000);
          result = await fn();
        } else {
          throw e;
        }
      }
      resolve(result);
    } catch (e) {
      reject(e);
    } finally {
      running = false;
      await sleep(600);
      runNext();
    }
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    runNext();
  });
})();
