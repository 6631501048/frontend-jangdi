import { nextTick, onBeforeUnmount, watch } from 'vue';

// Used by the navigation drawers. Focus stays inside while open and returns on close.
export function useDialogFocus(open, panel, close) {
  let previous;
  let bodyOverflow;
  function restore() {
    if (bodyOverflow !== undefined && typeof document !== 'undefined') {
      document.body.style.overflow = bodyOverflow;
      bodyOverflow = undefined;
    }
    if (previous?.isConnected) previous.focus();
    previous = undefined;
  }
  watch(open, async (visible) => {
    if (!visible) { restore(); return; }
    previous = document.activeElement;
    if (document.body?.style) {
      bodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    await nextTick();
    if (open()) panel.value?.focus();
  }, { immediate: true });
  function onKeydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const items = [...(panel.value?.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') || [])].filter(item => item.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.value)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.value)) {
      event.preventDefault(); first.focus();
    }
  }
  onBeforeUnmount(restore);
  return { onKeydown };
}
