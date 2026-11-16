// The PostWire API (https://postwire.io/docs). No dependencies: runs on the Node that GitHub's runner ships.
"use strict";

const SITE = "https://postwire.io";
const SOURCE = "github_action";
const link = (where) => `${SITE}/dashboard.html?from=github_action_${where}`;

async function call(key, method, path, body, fetchFn = fetch) {
  try {
    const res = await fetchFn(SITE + path, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-PostWire-Source": SOURCE },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = (await res.json()) || {}; } catch { data = {}; }
    return { code: res.status, body: data };
  } catch (e) {
    return { code: 0, body: { error: String((e && e.message) || e) } };
  }
}

// "bluesky, LinkedIn ,," -> ["bluesky", "linkedin"]
function listOf(raw) {
  return [...new Set(String(raw || "").split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

// One entry per connected network, with what it needs to take a post.
function networksOf(body) {
  const seen = new Map();
  for (const c of Array.isArray(body && body.connections) ? body.connections : []) {
    if (!c || typeof c.platform !== "string" || seen.has(c.platform)) continue;
    seen.set(c.platform, c.needs === "video" || c.needs === "photo_or_video" ? c.needs : "text");
  }
  return [...seen].map(([platform, needs]) => ({ platform, needs }));
}

// With no list given: every connected network that can take this post (text only, picture or video).
function pick(networks, media) {
  return networks
    .filter((n) => (n.needs === "video" ? media === "video" : n.needs === "photo_or_video" ? media !== "none" : true))
    .map((n) => n.platform);
}

function postBody(text, platforms, photo, video) {
  const body = { platforms, text: String(text).trim() };
  if (photo) body.photo_url = photo;
  if (video) body.video_url = video;
  return body;
}

// Reads PostWire's answer to POST /api/post.
function outcomeOf(res) {
  const b = res.body || {};
  const results = (Array.isArray(b.results) ? b.results : []).filter((r) => r && typeof r.platform === "string");
  const good = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok).map((r) => `${r.platform}: ${String(r.error || "not posted").slice(0, 200)}`);
  const urls = {};
  for (const r of good) if (typeof r.url === "string" && /^https?:\/\//.test(r.url)) urls[r.platform] = r.url;
  const said = [b.held_message, b.upgrade_message, b.message_for_user, b.error].find((m) => typeof m === "string" && m) || "";
  let problem = "";
  if (!good.length) {
    if (res.code === 401) problem = "PostWire did not accept the API key. Check the api_key secret.";
    else if (res.code === 0) problem = `Could not reach PostWire${said ? `: ${said}` : ""}`;
    else problem = bad.join(" · ") || said || `PostWire answered ${res.code}`;
  }
  return { posted: good.map((r) => r.platform), urls, failed: bad, note: good.length ? said : "", problem };
}

module.exports = { SITE, link, call, listOf, networksOf, pick, postBody, outcomeOf };
