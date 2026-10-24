// Changelog source selection self-check.
// Run: node src/shared/components/changelogSourcesSelfCheck.mjs
// No framework, no deps.
import {
  CHANGELOG_SOURCES,
  GO_SOURCE,
  NODE_SOURCE,
  DECOLUA_SOURCE,
  DEFAULT_CHANGELOG_SOURCE,
  availableChangelogSources,
  pickChangelogSource,
} from "./changelogSources.js";

const results = [];
function run(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, err: err.message });
  }
}
const assert = {
  equal(a, b, msg) { if (a !== b) throw new Error(`${msg || ""} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); },
  ok(v, msg) { if (!v) throw new Error(msg || "expected truthy"); },
  no(v, msg) { if (v) throw new Error(msg || "expected falsy"); },
};

const ALL = { go: "<p>go</p>", node: "<p>node</p>", decolua: "<p>deco</p>" };
const ONLY_GO = { go: "<p>go</p>", node: "", decolua: "" };
const ONLY_DECO = { go: "", node: "", decolua: "<p>deco</p>" };
const NEITHER = { go: "", node: "", decolua: "" };

run("there are three sources, Go core first", () => {
  assert.equal(CHANGELOG_SOURCES.length, 3, "three sources");
  assert.equal(CHANGELOG_SOURCES[0].id, "go", "Go listed first");
  assert.equal(CHANGELOG_SOURCES[1].id, "node", "Node listed second");
  assert.equal(CHANGELOG_SOURCES[2].id, "decolua", "upstream third");
  assert.equal(GO_SOURCE.id, "go", "exported Go id");
  assert.equal(NODE_SOURCE.id, "node", "exported Node id");
  assert.equal(DECOLUA_SOURCE.id, "decolua", "exported upstream id");
});

run("all sources are offered when all have content", () => {
  const available = availableChangelogSources(ALL);
  assert.equal(available.length, 3, "all offered");
  assert.equal(available[0].id, "go", "order preserved");
});

run("Go core opens first by default", () => {
  assert.equal(DEFAULT_CHANGELOG_SOURCE, "go", "default is Go");
  assert.equal(pickChangelogSource(ALL, DEFAULT_CHANGELOG_SOURCE), "go", "default shows Go");
});

run("choosing the upstream source is honoured", () => {
  assert.equal(pickChangelogSource(ALL, "decolua"), "decolua", "switched");
});

run("a source with no content is not offered as a tab", () => {
  assert.equal(availableChangelogSources(ONLY_GO).length, 1, "one tab");
  assert.equal(availableChangelogSources(ONLY_GO)[0].id, "go", "the one with content");
  assert.equal(availableChangelogSources(ONLY_DECO)[0].id, "decolua", "same the other way");
  assert.equal(availableChangelogSources(NEITHER).length, 0, "no tabs when neither loaded");
});

run("a selection pointing at an empty source falls back to what exists", () => {
  assert.equal(pickChangelogSource(ONLY_GO, "decolua"), "go", "falls back to Go");
  assert.equal(pickChangelogSource(ONLY_DECO, "go"), "decolua", "falls back to upstream");
});

run("with nothing loaded at all it still names a source", () => {
  assert.equal(pickChangelogSource(NEITHER, "decolua"), DEFAULT_CHANGELOG_SOURCE, "never undefined");
  assert.ok(pickChangelogSource(null, null), "null input still resolves");
  assert.ok(pickChangelogSource(undefined, undefined), "undefined input still resolves");
  assert.equal(availableChangelogSources(null).length, 0, "null offers nothing");
});

run("an unknown source id is not trusted", () => {
  assert.equal(pickChangelogSource(ALL, "someone-else"), "go", "falls back rather than rendering nothing");
});

run("whitespace-only content counts as empty", () => {
  assert.equal(availableChangelogSources({ go: "   ", decolua: "<p>x</p>" }).length, 1, "blank ignored");
});

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "  ok  " : "  FAIL"} ${r.name}${r.err ? ` — ${r.err}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
