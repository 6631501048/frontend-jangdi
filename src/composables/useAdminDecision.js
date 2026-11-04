import { onScopeDispose, ref } from 'vue';

// Browser-native prompt/confirm may be blocked in embedded browsers. Keep the
// decision in the page, and cancel it if its owning page is left.
export function useAdminDecision() {
  const decision = ref(null);
  let pending = null;
  function askDecision(options) {
    if (pending) return Promise.resolve(null);
    decision.value = options;
    return new Promise(resolve => { pending = resolve; });
  }
  function finish(value) {
    const resolve = pending;
    pending = null;
    decision.value = null;
    resolve?.(value);
  }
  const confirmDecision = value => finish(value);
  const cancelDecision = () => finish(null);
  onScopeDispose(cancelDecision);
  return { decision, askDecision, confirmDecision, cancelDecision };
}
