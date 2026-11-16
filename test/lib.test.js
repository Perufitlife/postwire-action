"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { call, listOf, networksOf, pick, postBody, outcomeOf } = require("../lib.js");

test("list of networks", () => {
  assert.deepEqual(listOf(" bluesky, LinkedIn ,,bluesky\nmastodon"), ["bluesky", "linkedin", "mastodon"]);
  assert.deepEqual(listOf(""), []);
});

test("pick: only networks that can take the post", () => {
  const n = networksOf({ connections: [{ platform: "bluesky" }, { platform: "bluesky" }, { platform: "tiktok", needs: "video" },
    { platform: "instagram", needs: "photo_or_video" }, null] });
  assert.deepEqual(pick(n, "none"), ["bluesky"]);
  assert.deepEqual(pick(n, "photo"), ["bluesky", "instagram"]);
  assert.deepEqual(pick(n, "video"), ["bluesky", "tiktok", "instagram"]);
});

test("body", () => {
  assert.deepEqual(postBody(" hi ", ["bluesky"], "", ""), { platforms: ["bluesky"], text: "hi" });
  assert.equal(postBody("hi", ["x"], "https://a.b/c.png", "").photo_url, "https://a.b/c.png");
  assert.equal(postBody("hi", ["x"], "", "https://a.b/c.mp4").video_url, "https://a.b/c.mp4");
});

test("outcome", () => {
  const ok = outcomeOf({ code: 200, body: { results: [{ platform: "bluesky", ok: true, url: "https://bsky.app/x" },
    { platform: "tiktok", ok: false, error: "needs video" }], held_message: "2 networks on Free" } });
  assert.deepEqual(ok.posted, ["bluesky"]);
  assert.deepEqual(ok.urls, { bluesky: "https://bsky.app/x" });
  assert.deepEqual(ok.failed, ["tiktok: needs video"]);
  assert.equal(ok.note, "2 networks on Free");
  assert.equal(ok.problem, "");
  assert.match(outcomeOf({ code: 401, body: {} }).problem, /API key/);
  assert.match(outcomeOf({ code: 0, body: {} }).problem, /Could not reach/);
  assert.equal(outcomeOf({ code: 402, body: { upgrade_message: "Upgrade to post more" } }).problem, "Upgrade to post more");
});

test("call sends the key and the source", async () => {
  let seen;
  const res = await call("k", "POST", "/api/post", { a: 1 }, async (url, init) => {
    seen = { url, init };
    return { status: 200, json: async () => ({ ok: true }) };
  });
  assert.equal(res.code, 200);
  assert.equal(seen.url, "https://postwire.io/api/post");
  assert.equal(seen.init.headers.Authorization, "Bearer k");
  assert.equal(seen.init.headers["X-PostWire-Source"], "github_action");
  assert.equal((await call("k", "GET", "/x", null, async () => { throw new Error("down"); })).code, 0);
});

test("the step fails cleanly without a key and writes nothing", () => {
  const out = path.join(os.tmpdir(), `pw-action-${process.pid}.out`);
  fs.writeFileSync(out, "");
  let code = 0, text = "";
  try { execFileSync(process.execPath, [path.join(__dirname, "..", "index.js")], { env: { ...process.env, INPUT_API_KEY: "", INPUT_TEXT: "hi", GITHUB_OUTPUT: out } }); }
  catch (e) { code = e.status; text = String(e.stdout); }
  assert.equal(code, 1);
  assert.match(text, /::error::The api_key input is empty/);
  assert.equal(fs.readFileSync(out, "utf8"), "");
  fs.unlinkSync(out);
});
