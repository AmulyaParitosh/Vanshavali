"use client";
import { useMemo } from "react";
import { ProviderFactory } from "../services/ProviderFactory";
import type { ProviderConfig } from "../services/types";

/**
 * Resolves the Supabase provider set from the factory and memoizes it for the
 * component's lifetime. Stable identity means downstream hooks' effect deps
 * see the same reference across renders.
 */
export function useProviders(): ProviderConfig {
  return useMemo(() => ProviderFactory.getProviders(), []);
}
