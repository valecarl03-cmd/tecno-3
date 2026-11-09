// Runs timed events ({ at: ms, ... }, sorted) from a single start time.
// Each event is scheduled against that start, so small timer delays never
// add up across the timeline. `speed` scales every time (0.2 = 5x faster).
// Returns a function that cancels the rest of the timeline.
export function runTimeline(events, onEvent, { speed = 1 } = {}) {
  const start = performance.now();
  let index = 0;
  let timer = null;
  let cancelled = false;

  function scheduleNext() {
    if (cancelled || index >= events.length) {
      return;
    }
    const event = events[index];
    const delay = Math.max(0, event.at * speed - (performance.now() - start));
    timer = setTimeout(() => {
      index += 1;
      onEvent(event);
      scheduleNext();
    }, delay);
  }

  scheduleNext();

  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
