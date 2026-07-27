import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseDataProvider } from "@/services/supabase/SupabaseDataProvider";

/**
 * The Supabase data provider can't be fully exercised without a live Supabase
 * project, but the session-check guard + delegated /api/tree/create call in
 * createTree are pure control-flow and critical (this is the front line of
 * the RLS-bypass workaround we use to survive misconfigured JWT validation
 * in newer Supabase projects). Verify against a mocked client + stubbed fetch.
 *
 * Coverage for the actual Supabase queries lives in integration tests against
 * a real project (not in this suite).
 */

interface MockClientOptions {
  sessionUid: string | null;
  accessToken?: string;
}

function makeClient({ sessionUid, accessToken = "tok_xyz" }: MockClientOptions): SupabaseClient {
  const session = sessionUid ? { user: { id: sessionUid }, access_token: accessToken } : null;
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    },
    from: vi.fn(),
  } as unknown as SupabaseClient;
  return client;
}

let originalFetch: typeof globalThis.fetch;
beforeEach(() => {
  originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("SupabaseDataProvider.createTree — session guard", () => {
  it("throws a clear error when the supabase-js client has no active session", async () => {
    const client = makeClient({ sessionUid: null });
    const provider = new SupabaseDataProvider(client);

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    await expect(provider.createTree("uid_owner", "n")).rejects.toThrow(
      /no active Supabase session/
    );

    // The route MUST NOT have been called — otherwise we'd send a request that
    // the server would reject as Unauthorized, but the friendlier error is the
    // right one for the "I'm signed out" case.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws when ownerUid doesn't match the session uid (stale React state)", async () => {
    const client = makeClient({ sessionUid: "uid_real" });
    const provider = new SupabaseDataProvider(client);

    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    await expect(provider.createTree("uid_stale", "n")).rejects.toThrow(
      /does not match session uid/
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts to /api/tree/create with the bearer token and returns the route's tree meta", async () => {
    const client = makeClient({ sessionUid: "uid_real", accessToken: "tok_xyz" });
    const provider = new SupabaseDataProvider(client);

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          tree: {
            id: "tree_xyz",
            name: "Sharma tree",
            ownerUid: "uid_real",
            visibility: "private",
            createdAt: 123,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const meta = await provider.createTree("uid_real", "Sharma tree");
    expect(meta.id).toBe("tree_xyz");
    expect(meta.ownerUid).toBe("uid_real");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/tree/create",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tok_xyz",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ name: "Sharma tree" }),
      })
    );
  });

  it("surfaces the route's error message when the response is non-2xx", async () => {
    const client = makeClient({ sessionUid: "uid_real" });
    const provider = new SupabaseDataProvider(client);

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "Failed to create tree" }), { status: 500 })
      ) as unknown as typeof globalThis.fetch;

    await expect(provider.createTree("uid_real", "n")).rejects.toThrow(/Failed to create tree/);
  });
});
