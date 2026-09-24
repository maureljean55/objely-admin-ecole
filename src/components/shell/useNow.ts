"use client";

import { useEffect, useState } from "react";

/** The current time, refreshed every minute, so relative dates ("il y a 2 h") stay right without calling Date.now() while rendering. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
