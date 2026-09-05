---
outline: deep
---

# Migration guides

One guide per release that asks you to change code. A release that is not listed here needs
nothing beyond bumping the version — what it changed is in
[`CHANGELOG.md`](https://github.com/mirjalol-norkulov/vue-modal-manager/blob/main/CHANGELOG.md),
and in the annotated git tag it was cut from.

| Guide                                  | Read it if you are on | The headline break                                                                                            |
| -------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`0.0.x` → `0.1.0`](/migration/0-1-0)  | any `0.0.x`           | `props` is inferred from the component you pass and genuinely type-checked, so code that compiled before may not |

Each guide describes the step from its immediate predecessor, so a jump across several
releases means working through them oldest first.

Every guide opens with a **does this affect me?** table listing each break against a
one-line test, so you can size an upgrade before reading the whole page.

## You never arrive at one of these by accident

Below `1.0.0`, npm's caret is an exact pin on the minor: `^0.0.11` never resolves to
`0.1.0`. Every release with a guide is one you upgrade to deliberately, and the version you
were on stays published — so "not yet" is always a valid answer.
