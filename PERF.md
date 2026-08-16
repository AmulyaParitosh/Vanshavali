# Performance

What was slow, what was done about it, and what the numbers were before and after.
Every figure here was measured — the method is at the bottom so it can be repeated.

## How to measure

Numbers come from a **production build** (`npm run build && npm run start`), never
from `next dev`: dev compiles routes on demand, and its first-load figures (TTFB
of 7.9s on this machine) measure the compiler, not the app.

Three synthetic trees — 102, 502 and 2,000 people — were seeded into the local
stack to see how the app behaves as a family grows. The largest real tree today
is about 70 people; the 2,000 case is there to find the cliff before a user does.

## The four things that were wrong

### 1. Every row in the DOM, and nothing memoised

Members, Households and the canvas rendered every row and every card. At 2,000
people that was **18,706 DOM nodes** on the list and **21,236** on the canvas, to
show the twenty or so a screen can hold. Nothing was wrapped in `React.memo`
(zero uses in the codebase), so selecting one person re-rendered all two thousand
rows.

**Fixed by** windowing the records list (`lib/windowing.ts`,
`hooks/useWindowedRows.ts`) and culling the canvas to the viewport
(`useTreeZoom`'s `onViewport` → `Tree`'s `visible`), plus memoised row and card
components. `RecordsTable` had to change shape to make this work: it takes
`items` + `renderRow` rather than rendered children, because a component can only
skip work it was never handed.

### 2. Naming every relation was quadratic

`GraphManager.findPath` rebuilt the **entire adjacency list from scratch on every
call** (the comment said so: _"Lazy or Cached could be better, but building here
for simplicity"_), used `Array.shift()` as a queue, and copied the whole path
array per neighbour. The Members page called it **once per row, unmemoised,
inside the render body** — so every keystroke in the search box paid for all of
it.

| people | `describeRelation` × every row | one `relationsFrom` walk |
| -----: | -----------------------------: | -----------------------: |
|     71 |                           5 ms |                   0.4 ms |
|    501 |                          95 ms |                   1.0 ms |
|  1,001 |                         401 ms |                   1.9 ms |
|  2,001 |                       1,563 ms |                   3.7 ms |
|  5,001 |                      11,279 ms |                  10.5 ms |

**Fixed by** caching the adjacency per graph, replacing the path-copying BFS with
parent pointers and a head index, and adding `pathsFrom` / `relationsFrom`: one
traversal names the whole tree. `generationMap` had the same two faults (a scan
of every family per person reached, and `shift()`) and got the same treatment —
49 ms → 2 ms at 5,000 people.

### 3. Photographs served at original size

The one photograph in the local database is an **888 KB PNG**, rendered into
circles of 32–72 px. That is roughly a 400× overfetch, repeated on every surface
showing that face, with no `loading="lazy"`, no `decoding="async"`, no intrinsic
`width`/`height`, and `cacheControl: 3600` on immutable content.

**Fixed by** resizing before upload (`lib/images.ts`): each photograph is stored
twice, a 1024 px display copy and a 192 px thumbnail, and the avatars read the
thumbnail. A shared `<Portrait>` component now owns the loading rules, replacing
four hand-rolled copies that had drifted apart. Cache lifetime went to a year,
which is honest because object keys carry the upload timestamp.

### 4. Everything waited on everything

Four sequential stages before content: `profile`+`trees` → `membership` →
`data` → `members`. The whole app was gated on the full tree fetch — including
Settings, which needs none of it — and because the gate swapped the page for a
spinner, **every page remounted the moment data arrived and fetched twice**.
API responses went out **uncompressed**: 518 KB of highly repetitive JSON.

**Fixed by** seeding the tree id from the URL (it was in the address bar all
along), fetching data alongside membership rather than after it (the route
authorises the read either way), removing tree contents from the loading gate,
and compressing API responses (`lib/api.ts`'s `json()` — brotli, else gzip, above
1 KB).

## Results

Production build, local, 2,000-person tree.

| Measure                      |   Before |  After | Change |
| ---------------------------- | -------: | -----: | -----: |
| Members DOM nodes            |   18,706 |    287 |   −98% |
| Canvas DOM nodes             |   21,236 |    240 |   −99% |
| Members blocking time        | 2,941 ms | 104 ms |   −96% |
| Members time to content      | 1,529 ms | 383 ms |   −75% |
| Search keystroke             |   357 ms |  32 ms |   −91% |
| Open a record                | 1,075 ms |  43 ms |   −96% |
| Close a record               | 1,041 ms |  28 ms |   −97% |
| `/data` on the wire          |   518 KB |  35 KB |   −93% |
| Round trips before content   |        4 |      2 |   −50% |
| Duplicate fetches on Members |   2 each | 1 each |      — |

Interaction cost is now **flat in tree size** — 4 people and 2,000 people both
open a record in about 40 ms, where before it scaled linearly.

## Pagination: measured, then not built

The brief asked for pagination on scroll. After windowing and compression, the
numbers no longer support building it:

- The list holds ~17 rows in the DOM whatever the tree's size, so paging would
  not remove any DOM.
- `/data` is 35 KB on the wire at 2,000 people, so paging would not remove
  meaningful bytes.
- Members genuinely needs the whole graph anyway — generations and "relation to
  you" are properties of the tree, not of a page of rows — so a paged endpoint
  would have to recompute both server-side, becoming a second source of truth
  for the same facts.

What would actually pay at the next order of magnitude (10,000+) is different
work: parsing and graph construction on the main thread is what remains of the
104 ms, and the answer there is a worker or an incremental parse, not paging.
Left undone deliberately, and recorded here rather than silently skipped.

## Still open

- **Fit hits the zoom floor on a large tree.** At 2,000 people, Fit clamps at the
  minimum zoom and still shows a fraction of the tree. A scale issue, not a
  perf one, but a real one.
- **The records table header doesn't stick.** `.records-table` has
  `overflow: hidden`, which makes it the containing block for its own
  `position: sticky` header, so the header scrolls away with the page. Pre-dates
  this work.
- **Main-thread JSON parse + graph build** is the whole of the remaining 104 ms
  at 2,000 people.
- **The other API routes are uncompressed.** Only `/tree/[id]/data` was switched
  to `json()`; the rest are small enough that it doesn't currently matter.

## Repeating the measurements

```
# a production build, isolated from the dev server's .next
git worktree add /tmp/perf HEAD && ln -s "$PWD/node_modules" /tmp/perf/node_modules
cd /tmp/perf && NEXT_PUBLIC_ENV=local npm run build && NEXT_PUBLIC_ENV=local PORT=3002 npm run start
```

The synthetic trees are seeded by a script that writes `tree_perf_*` rows
directly to the local stack, and removed with the same script's `drop` argument.
Nothing in `tests/` depends on them.
