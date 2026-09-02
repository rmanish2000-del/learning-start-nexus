import { useEffect, useState } from "react";

/**
 * Browser connectivity state for the Safe PWA layer.
 *
 * `navigator.onLine` is read after mount only — reading it during render would
 * mismatch SSR, where no navigator exists. `wasOffline` stays true after the
 * first drop so consumers can announce a "back online" recovery exactly once
 * instead of firing on the initial mount.
 */
export function useOnlineStatus(): { online: boolean; wasOffline: boolean } {
  const [online, setOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (navigator.onLine === false) {
      setOnline(false);
      setWasOffline(true);
    }
    const goOffline = () => {
      setOnline(false);
      setWasOffline(true);
    };
    const goOnline = () => setOnline(true);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return { online, wasOffline };
}
