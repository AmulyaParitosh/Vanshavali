import { describe, expect, it } from "vitest";
import { formatError } from "@/lib/formatError";

describe("formatError", () => {
  it("unpacks non-enumerable supabase-style fields", () => {
    // supabase-js / PostgREST errors stash useful fields as non-enumerable.
    // The whole point of formatError is to surface them anyway.
    const err = {};
    Object.defineProperty(err, "message", {
      value: 'infinite recursion detected in policy for relation "trees"',
      enumerable: false,
    });
    Object.defineProperty(err, "code", { value: "42P17", enumerable: false });
    Object.defineProperty(err, "details", { value: null, enumerable: false });
    Object.defineProperty(err, "hint", { value: null, enumerable: false });

    // A naive console.error(err) would print {}; formatError should not.
    expect(JSON.stringify(err)).toBe("{}");

    const formatted = formatError(err);
    expect(formatted["message"]).toBe('infinite recursion detected in policy for relation "trees"');
    expect(formatted["code"]).toBe("42P17");
  });

  it("falls back to Error.message for plain Errors", () => {
    const e = new Error("oops");
    expect(formatError(e)["message"]).toBe("oops");
  });

  it("includes status / statusCode when present (fetch-style)", () => {
    const fetchish = { status: 429, statusCode: 429, message: "Too Many Requests" };
    const formatted = formatError(fetchish);
    expect(formatted["status"]).toBe(429);
    expect(formatted["statusCode"]).toBe(429);
    expect(formatted["message"]).toBe("Too Many Requests");
  });

  it("wraps non-object errors so they don't get lost in {error}", () => {
    expect(formatError("plain string")).toEqual({ error: "plain string" });
    expect(formatError(42)).toEqual({ error: 42 });
    expect(formatError(null)).toEqual({ error: null });
    expect(formatError(undefined)).toEqual({ error: undefined });
  });

  it("returns undefined for missing fields rather than throwing", () => {
    const minimal = { message: "boom" };
    const formatted = formatError(minimal);
    expect(formatted["message"]).toBe("boom");
    expect(formatted["code"]).toBeUndefined();
    expect(formatted["details"]).toBeUndefined();
  });
});
