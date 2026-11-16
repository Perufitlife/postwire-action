"use strict";
const fs = require("node:fs");
const { call, link, listOf, networksOf, pick, postBody, outcomeOf } = require("./lib.js");

const input = (name) => String(process.env[`INPUT_${name.toUpperCase()}`] || "").trim();
const esc = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
function output(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (file) fs.appendFileSync(file, `${name}<<__PW_EOF__\n${value}\n__PW_EOF__\n`);
}
function stop(message, fail) {
  console.log(`::${fail ? "error" : "warning"}::${esc(message)}`);
  if (fail) process.exitCode = 1;
}

async function main() {
  const key = input("api_key");
  const text = input("text");
  const photo = input("photo_url");
  const video = input("video_url");
  const fail = input("fail_on_error").toLowerCase() !== "false";
  if (key) console.log(`::add-mask::${key}`);
  if (!key) return stop(`The api_key input is empty. Create a free key at ${link("setup")} and save it as a repository secret.`, true);
  if (!text) return stop("The text input is empty: there is nothing to post.", fail);

  let platforms = listOf(input("platforms"));
  if (!platforms.length) {
    const res = await call(key, "GET", "/api/connections");
    if (res.code === 401) return stop("PostWire did not accept the API key. Check the api_key secret.", true);
    if (res.code !== 200) return stop(`Could not read your connected accounts (PostWire answered ${res.code}).`, fail);
    platforms = pick(networksOf(res.body), video ? "video" : photo ? "photo" : "none");
    if (!platforms.length) return stop(`No connected account can take this post. Connect your social accounts at ${link("connect")}`, fail);
  }

  const out = outcomeOf(await call(key, "POST", "/api/post", postBody(text, platforms, photo, video)));
  output("posted", out.posted.join(","));
  output("url", Object.values(out.urls)[0] || "");
  output("urls", JSON.stringify(out.urls));
  for (const p of out.posted) console.log(`Posted to ${p}${out.urls[p] ? `: ${out.urls[p]}` : ""}`);
  for (const f of out.failed) console.log(`::warning::${esc(f)}`);
  if (out.note) console.log(`::notice::${esc(out.note)}`);
  if (out.problem) stop(out.problem, fail);

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary && out.posted.length) {
    const rows = out.posted.map((p) => `| ${p} | ${out.urls[p] || "published"} |`).join("\n");
    fs.appendFileSync(summary, `### PostWire\n\n| Network | Post |\n| --- | --- |\n${rows}\n`);
  }
}

main().catch((e) => stop(String((e && e.message) || e), true));
