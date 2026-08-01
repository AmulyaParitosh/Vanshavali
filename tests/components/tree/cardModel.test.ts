import { describe, it, expect } from "vitest";
import { cardModel, cardHeight, yearSpan } from "@/components/tree/cardModel";
import type { GraphNode } from "@/types/graph";
import type { Person } from "@/types/person";

function person(id: string, sex: "M" | "F", events: Person["events"] = []): Person {
  return { id, name: { official_name: id }, sex, events };
}

describe("yearSpan", () => {
  it("open dash for a living person, both dates for a deceased one, empty for neither", () => {
    const living = person("a", "M", [{ type: "birth", date: "1968-05-02" }]);
    const dead = person("b", "M", [
      { type: "birth", date: "1944" },
      { type: "death", date: "2011-01-01" },
    ]);
    expect(yearSpan(living)).toEqual({ years: "1968–", deceased: false });
    expect(yearSpan(dead)).toEqual({ years: "1944–2011", deceased: true });
    expect(yearSpan(person("c", "F"))).toEqual({ years: "", deceased: false });
  });
});

describe("cardModel", () => {
  const born = new Set(["root", "son", "daughter"]);

  it("a single born-in man: one row, red ring, red spine", () => {
    const node = person("root", "M", [{ type: "birth", date: "1950" }]) as unknown as GraphNode;
    const m = cardModel(node, born, null);
    expect(m.rows).toHaveLength(1);
    expect(m.rows[0]!.ring).toBe("born");
    expect(m.spine).toBe("born");
    expect(cardHeight(m.rows.length)).toBe(44);
  });

  it("a son's household: head born (red), spouse married (marigold), red spine", () => {
    const node = {
      id: "fam1",
      isPartnerGroup: true,
      husband: person("son", "M", [{ type: "birth", date: "1975" }]),
      wife: person("wife", "F", [{ type: "birth", date: "1978" }]),
    } as unknown as GraphNode;
    const m = cardModel(node, born, null);
    expect(m.rows.map((r) => r.person.id)).toEqual(["son", "wife"]);
    expect(m.rows[0]!.ring).toBe("born");
    expect(m.rows[1]!.ring).toBe("married");
    expect(m.spine).toBe("born");
    expect(cardHeight(m.rows.length)).toBe(88);
  });

  it("a daughter's household: the born-in daughter heads it, spine turns marigold", () => {
    const node = {
      id: "fam2",
      isPartnerGroup: true,
      // Husband listed first, but the wife is the one born into the line.
      husband: person("inlaw", "M", [{ type: "birth", date: "1974" }]),
      wife: person("daughter", "F", [{ type: "birth", date: "1979" }]),
    } as unknown as GraphNode;
    const m = cardModel(node, born, null);
    expect(m.rows[0]!.person.id).toBe("daughter");
    expect(m.rows[0]!.ring).toBe("born");
    expect(m.spine).toBe("married");
  });

  it("marks the signed-in viewer's own row", () => {
    const me = person("root", "M", [{ type: "birth", date: "1990" }]);
    me.userId = "uid-1";
    const m = cardModel(me as unknown as GraphNode, born, "uid-1");
    expect(m.rows[0]!.isSelf).toBe(true);
  });
});
