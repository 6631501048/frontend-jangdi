// Keep successful images cached, but allow failed requests to recover on polling.
// Dependencies are passed in so request races can be tested without a browser.
export function createProofImageLoader({
  fetchImage,
  describeError,
  onChange,
  revokeUrl = (url) => URL.revokeObjectURL(url),
  now = Date.now,
  retryDelay = 5000,
}) {
  const state = { url: null, loading: false, error: "" };
  let currentKey = null;
  let loadedKey = null;
  let pending = null;
  let generation = 0;
  let retryAt = 0;
  let disposed = false;

  function publish() {
    if (!disposed) onChange({ ...state });
  }

  function revokeImage() {
    if (state.url) revokeUrl(state.url);
    state.url = null;
  }

  function clear() {
    generation++;
    currentKey = loadedKey = pending = null;
    retryAt = 0;
    revokeImage();
    state.loading = false;
    state.error = "";
    publish();
  }

  function fail(message) {
    generation++;
    loadedKey = pending = null;
    revokeImage();
    state.loading = false;
    state.error = message;
    retryAt = now() + retryDelay;
    publish();
  }

  function load(job, force = false) {
    if (disposed) return Promise.resolve();
    const id = job?._id || job?.id;
    const key = id && job.completionProofUrl
      ? `${id}:${job.completionProofUrl}:${job.proofSubmittedAt || ""}`
      : null;
    if (!key) {
      clear();
      return Promise.resolve();
    }
    if (!force && key === currentKey) {
      if (pending) return pending;
      if (key === loadedKey || now() < retryAt) return Promise.resolve();
    }

    const request = ++generation;
    currentKey = key;
    loadedKey = null;
    revokeImage();
    state.error = "";
    state.loading = true;
    publish();

    pending = (async () => {
      try {
        const url = await fetchImage(id);
        if (disposed || request !== generation) {
          revokeUrl(url);
          return;
        }
        state.url = url;
        loadedKey = key;
        retryAt = 0;
      } catch (error) {
        if (disposed || request !== generation) return;
        let message;
        try { message = await describeError(error); }
        catch { message = "โหลดรูปหลักฐานไม่สำเร็จ กรุณาลองใหม่"; }
        if (disposed || request !== generation) return;
        state.error = message;
        // Authentication/permission errors need user action, not polling.
        retryAt = [401, 403].includes(error?.response?.status)
          ? Infinity
          : now() + retryDelay;
      } finally {
        if (!disposed && request === generation) {
          state.loading = false;
          pending = null;
          publish();
        }
      }
    })();
    return pending;
  }

  function dispose() {
    disposed = true;
    clear();
  }

  return { load, clear, fail, dispose };
}
