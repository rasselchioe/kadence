"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface SelectionValue {
  /** Selected sample index, or null. */
  index: number | null;
  pinned: boolean;
  /** Hover a sample (ignored while pinned). */
  setHover: (i: number | null) => void;
  /** Click to pin/unpin a sample. */
  togglePin: (i: number) => void;
  /** Clear selection (also unpins). */
  clear: () => void;
}

const SelectionContext = createContext<SelectionValue | null>(null);

/**
 * Shares a single selected sample index across the map, charts, and splits so
 * hovering any one highlights the others. Click pins; Esc clears (build § 9).
 */
export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const [pinned, setPinned] = useState(false);
  const pinnedRef = useRef(false);

  const setHover = useCallback((i: number | null) => {
    if (pinnedRef.current) return;
    setIndex(i);
  }, []);

  const togglePin = useCallback((i: number) => {
    if (pinnedRef.current) {
      pinnedRef.current = false;
      setPinned(false);
      setIndex(null);
    } else {
      pinnedRef.current = true;
      setPinned(true);
      setIndex(i);
    }
  }, []);

  const clear = useCallback(() => {
    pinnedRef.current = false;
    setPinned(false);
    setIndex(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clear]);

  const value = useMemo(
    () => ({ index, pinned, setHover, togglePin, clear }),
    [index, pinned, setHover, togglePin, clear],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionValue {
  const ctx = useContext(SelectionContext);
  if (!ctx)
    throw new Error("useSelection must be used within SelectionProvider");
  return ctx;
}
