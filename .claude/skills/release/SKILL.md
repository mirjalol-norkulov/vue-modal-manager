---
name: release
description: Cut and publish a new version of vue-modal-manager to npm. Use this whenever the user wants to release, publish, ship, cut, tag, or bump a version - "release a patch", "publish to npm", "bump the version", "ship this fix", "cut 0.0.12", "tag a release". Use it even for a release that looks like a one-line version bump, because this repo's release is a specific two-commit sequence with a build-output check and a tag push that are easy to skip.
---

# Cut a release

This repo's history has a deliberate shape: a conventional commit carrying the change,
then a separate bare-version commit (`0.0.11`) carrying only the `package.json` bump,
plus an annotated `vX.Y.Z` tag whose message is the bare version.

Do not squash those into one commit. The bare-version commits are what `pnpm version`
produces, and keeping them separate is what makes `git log --oneline` readable as an
alternating change/release rhythm.

## Step 1: Land the change first

The change and the version bump are different commits. Commit the change under a
conventional prefix matching the history (`feat:`, `fix:`, `fix(build):`, `fix(types):`,
`docs:`).

**Never include a `Co-Authored-By` or any other attribution trailer.** This is a hard
repo rule.

## Step 2: Write the changelog entry

`CHANGELOG.md` at the repo root is in [Keep a Changelog](https://keepachangelog.com/)
format, newest version first. Add the entry for the version you are about to cut, **before**
the bump — a `pnpm version` run with no entry written is how a changelog goes stale, and
catching it after the tag means an untagging dance.

- Group the entry into `Added` / `Changed` / `Fixed`.
- Mark every breaking item explicitly with a leading `**BREAKING**`, and every change of
  runtime behaviour under an unchanged signature with `**BEHAVIOURAL**`.
- If the release has a migration guide under `docs/migration/`, link it from the top of the
  entry rather than restating it.

`CHANGELOG.md` is in `package.json`'s `files` array, so it ships to npm. Do not remove it
from there: npm's always-included set covers `package.json`, the README and the LICENSE,
but not a changelog.

The changelog belongs in the *change* commit from step 1, not in the bare-version commit —
`pnpm version` must produce a commit touching only `package.json`.

## Step 3: Verify the build actually emits everything

Run this before bumping, not after — a broken build caught after the tag means an
untagging dance:

```sh
pnpm build
```

Then confirm all four published files exist, because the `exports` map in `package.json`
points at every one of them and a missing file is only discovered by consumers:

```sh
ls dist/vue-modal-manager.js dist/vue-modal-manager.umd.cjs dist/index.d.ts dist/index.d.cts
```

`dist/index.d.cts` is the fragile one — it is byte-copied from `index.d.ts` by the inline
`emit-cts-declarations` plugin in `vite.config.ts`, and it is what `require()` consumers
on node16/nodenext resolve. Two past releases (`0.0.5`, `0.0.6`) were `fix(types):`
commits cleaning up exactly this area, so treat it as the known-fragile spot.

Also sanity-check that `dependencies` is still absent from `package.json` — the package
ships with no runtime deps beyond the Vue peer, and `vue` must remain the only entry in
`rollupOptions.external`.

## Step 4: Bump, commit and tag in one command

```sh
pnpm version patch
```

This creates the bare-version commit and the annotated `vX.Y.Z` tag together, which is
how the existing history was made. Use `minor` instead of `patch` only if the user asked
for one; this project is still on `0.0.x`, so features have been shipping as patches.

Then confirm the version commit and its tag both landed:

```sh
git log --oneline -3 && git tag -l --sort=v:refname | tail -3
```

## Step 5: Push commits and the tag

`pnpm version` creates the tag locally only, and a plain `git push` does not send tags.
Every release so far is tagged on the remote (`v0.0.2` through `v0.0.11`, all annotated) —
keep that unbroken:

```sh
git push && git push --tags
```

## Step 6: Publish

Publishing is outward-facing and irreversible for a given version number, so confirm with
the user before running it unless they already said to publish:

```sh
npm publish
```

`files: ["dist", "CHANGELOG.md"]` is what ships. Verify that with `npm pack --dry-run`
first if anything about the packaging changed in this release, and confirm `CHANGELOG.md`
is in the listed contents.

## Report back

State the new version, that the changelog entry and the tag exist, whether it was pushed,
and whether you published or stopped short of publishing. Do not describe a release as done
if the changelog entry, the tag or the push is missing.
