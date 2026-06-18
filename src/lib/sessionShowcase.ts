const VIEWED_VALUE = "viewed";

function isPageReload() {
  if (typeof window === "undefined" || !window.performance?.getEntriesByType) {
    return false;
  }

  const navigation = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return navigation?.type === "reload";
}

export function shouldUseCompactShowcase(storageKey: string) {
  if (typeof window === "undefined") {
    return false;
  }

  if (isPageReload()) {
    window.sessionStorage.removeItem(storageKey);
    return false;
  }

  return window.sessionStorage.getItem(storageKey) === VIEWED_VALUE;
}

export function markShowcaseViewed(storageKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(storageKey, VIEWED_VALUE);
}
