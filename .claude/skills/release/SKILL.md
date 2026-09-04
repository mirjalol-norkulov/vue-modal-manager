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

## Step 2: Verify the build actually emits everything

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

Also sanity-check that `uuid` is still in `devDependencies` and not `dependencies` — it is
bundled on purpose so the package ships with no runtime deps beyond the Vue peer.

## Step 3: Bump, commit and tag in one command

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

## Step 4: Push commits and the tag

`pnpm version` creates the tag locally only, and a plain `git push` does not send tags.
Every release so far is tagged on the remote (`v0.0.2` through `v0.0.11`, all annotated) —
keep that unbroken:

```sh
git push && git push --tags
```

## Step 5: Publish

Publishing is outward-facing and irreversible for a given version number, so confirm with
the user before running it unless they already said to publish:

```sh
npm publish
```

`files: ["dist"]` means only `dist/` ships. Verify that with `npm pack --dry-run` first if
anything about the packaging changed in this release.

## Report back

State the new version, that the tag exists, whether it was pushed, and whether you
published or stopped short of publishing. Do not describe a release as done if the tag or
the push is missing.
