import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiDataProvider } from "@/services/ApiDataProvider";

/**
 * ApiDataProvider is a thin HTTP client over the /api/* routes. These tests
 * pin the wire contract: the bearer token is attached, the right path/method/
 * body go out, the JSON response is returned, and route errors surface as
 * thrown Errors. The actual data logic lives server-side (services +
 * repositories) and is covered against real Postgres there.
 */

function makeClient(
  session: { access_token: string; user: { id: string } } | null
): SupabaseClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    },
  } as unknown as SupabaseClient;
}

let originalFetch: typeof globalThis.fetch;
beforeEach(() => {
  originalFetch = globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("ApiDataProvider", () => {
  it("posts to /api/tree/create with the bearer token and returns the tree", async () => {
    const client = makeClient({ access_token: "tok_xyz", user: { id: "uid_real" } });
    const provider = new ApiDataProvider(client);

    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          tree: {
            id: "tree_1",
            name: "Sharma",
            ownerUid: "uid_real",
            visibility: "private",
            createdAt: 1,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const tree = await provider.createTree("uid_real", "Sharma");
    expect(tree.id).toBe("tree_1");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/tree/create",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tok_xyz",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ name: "Sharma" }),
      })
    );
  });

  it("throws 'Not signed in.' and never calls fetch when there is no session", async () => {
    const provider = new ApiDataProvider(makeClient(null));
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    await expect(provider.createTree("uid", "n")).rejects.toThrow(/Not signed in/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("surfaces the route's error message on a non-2xx response", async () => {
    const provider = new ApiDataProvider(makeClient({ access_token: "t", user: { id: "u" } }));
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "You don't have permission to edit this tree." }), {
        status: 403,
      })
    ) as unknown as typeof globalThis.fetch;

    await expect(provider.saveTreeData("tree_1", { people: [], families: [] })).rejects.toThrow(
      /don't have permission/
    );
  });

  it("sends a DELETE with the bearer and no body for deleteTree", async () => {
    const provider = new ApiDataProvider(makeClient({ access_token: "tok", user: { id: "u" } }));
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    await provider.deleteTree("tree_9");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/tree/tree_9",
      expect.objectContaining({ method: "DELETE" })
    );
    // No body → no Content-Type header.
    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(init.body).toBeUndefined();
  });
});
