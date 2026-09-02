// Imported by the generated service worker (workbox `importScripts`).
//
// The worker never activates on its own: a learner mid-assessment must not be
// swapped onto a new build. The waiting worker takes over only when the page
// sends SKIP_WAITING after the user presses "Refresh now".
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
