# PostWire: Post to Social Media

Announce a release, a new blog post or a changelog on all your social accounts from a GitHub workflow. One step, one API key: PostWire sends the post to LinkedIn, Bluesky, Mastodon, Threads, Telegram, Discord, Slack, Facebook Pages, Instagram, TikTok, YouTube and more.

You connect your social accounts once at [postwire.io](https://postwire.io/dashboard.html?from=github_action_readme), so the workflow needs no per-network tokens, app registrations or OAuth secrets.

## Quick start

1. Create a free account at [postwire.io](https://postwire.io/dashboard.html?from=github_action_readme) and connect the social accounts you want to post to.
2. Copy your API key from the dashboard and save it in your repository as a secret named `POSTWIRE_API_KEY` (Settings, Secrets and variables, Actions).
3. Add the step to a workflow.

### Announce every release

```yaml
name: Announce release
on:
  release:
    types: [published]

jobs:
  announce:
    runs-on: ubuntu-latest
    steps:
      - uses: Perufitlife/postwire-action@v1
        with:
          api_key: ${{ secrets.POSTWIRE_API_KEY }}
          text: |
            ${{ github.event.repository.name }} ${{ github.event.release.tag_name }} is out.

            ${{ github.event.release.html_url }}
```

### Post to chosen networks, with a picture

```yaml
      - uses: Perufitlife/postwire-action@v1
        with:
          api_key: ${{ secrets.POSTWIRE_API_KEY }}
          platforms: bluesky, linkedin, mastodon
          text: "New on the blog: how we cut our build time in half. https://example.com/blog/build-time"
          photo_url: https://example.com/blog/build-time/cover.png
```

### Use the links of the published posts

```yaml
      - id: post
        uses: Perufitlife/postwire-action@v1
        with:
          api_key: ${{ secrets.POSTWIRE_API_KEY }}
          text: "We just shipped dark mode."
      - run: echo "Published at ${{ steps.post.outputs.url }}"
```

## Inputs

| Input | Required | What it does |
| --- | --- | --- |
| `api_key` | yes | Your PostWire API key. Keep it in a repository secret. |
| `text` | yes | The post. |
| `platforms` | no | Networks separated by commas, for example `bluesky, linkedin`. Empty posts to every connected account that can take the post. |
| `photo_url` | no | Public link to a picture to attach. |
| `video_url` | no | Public link to a video to attach. |
| `fail_on_error` | no | `true` (default) fails the step when nothing was posted. `false` only warns, so a release is never blocked by a social post. |

Networks that only take video (TikTok, YouTube) are skipped when the post has no video, and networks that need a picture or video (Instagram) are skipped for text-only posts, unless you name them in `platforms`.

## Outputs

| Output | What it holds |
| --- | --- |
| `posted` | Networks the post went out to, separated by commas. |
| `url` | Link to the first published post. |
| `urls` | JSON object with the link of the post on each network. |

The step also writes a table with the links to the job summary.

## Good to know

- The free PostWire plan sends one post to two networks. When a post is held back for that reason the step says so in a notice; it does not fail.
- The action has no dependencies and sends your key only to `https://postwire.io`.
- API reference: [postwire.io/docs](https://postwire.io/docs). Questions: support@postwire.io.

## License

MIT
