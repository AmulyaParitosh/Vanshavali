import type { DataProvider } from "./types";

/**
 * DataProvider methods that mutate server state. After any of these resolves,
 * the wrapped provider calls `bump()` so the UI re-fetches — this replaces
 * realtime now that there are no live channels (see withRefresh).
 */
const MUTATIONS: ReadonlySet<string> = new Set<keyof DataProvider>([
  "createTree",
  "deleteTree",
  "saveTreeData",
  "patchPerson",
  "updateOwnRecord",
  "linkUserToPerson",
  "updateMemberRole",
  "removeMember",
  "leaveTree",
  "createInvite",
  "acceptInvite",
  "revokeInvite",
  "addSuggestion",
  "updateSuggestionStatus",
]);

/**
 * Wrap a DataProvider so every mutating call bumps `bump` once it resolves.
 * Read/subscribe methods pass through untouched. `bump` increments a nonce in
 * AppContext that every subscribe* hook includes in its effect deps, so the
 * user's own writes trigger a re-fetch without live updates.
 */
export function withRefresh(provider: DataProvider, bump: () => void): DataProvider {
  return new Proxy(provider, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;
      const fn = value.bind(target) as (...args: unknown[]) => unknown;
      if (!MUTATIONS.has(prop as string)) return fn;
      return (...args: unknown[]) => {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.then((resolved) => {
            bump();
            return resolved;
          });
        }
        bump();
        return result;
      };
    },
  }) as DataProvider;
}
