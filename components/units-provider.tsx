"use client";

import { createContext, useContext } from "react";
import {
  fmtDistance,
  fmtElevation,
  fmtSpeed,
  type UnitSystem,
} from "@/lib/units";

const UnitsContext = createContext<UnitSystem>("metric");

/** Supplies the active unit system to client displays (Design Spec § 09). */
export function UnitsProvider({
  units,
  children,
}: {
  units: UnitSystem;
  children: React.ReactNode;
}) {
  return (
    <UnitsContext.Provider value={units}>{children}</UnitsContext.Provider>
  );
}

/** Formatters bound to the active units. Defaults to metric with no provider. */
export function useUnits() {
  const units = useContext(UnitsContext);
  return {
    units,
    fmtDistance: (m: number) => fmtDistance(m, units),
    fmtElevation: (m: number) => fmtElevation(m, units),
    fmtSpeed: (mps: number) => fmtSpeed(mps, units),
  };
}
