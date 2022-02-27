# Cached effects ☄️

[![npm][npm-img]][npm-url] ![downloads][npm-downloads-img] [![CI][ci-badge]][ci-url] [![GitHub issues][issues-img]][issues-url]

[ci-badge]: https://github.com/kotoyama/cached-fx/actions/workflows/ci.yml/badge.svg
[ci-url]: https://github.com/kotoyama/cached-fx/actions/workflows/ci.yml
[npm-img]: https://img.shields.io/npm/v/cached-fx.svg
[npm-url]: https://www.npmjs.com/package/cached-fx
[npm-downloads-img]: https://img.shields.io/npm/dw/cached-fx.svg
[issues-img]: https://img.shields.io/github/issues/kotoyama/cached-fx.svg
[issues-url]: https://github.com/kotoyama/cached-fx/issues

## Motivation

Sometimes you may need to cache the data you retrieve through API calls, but if you are working with Effector as a state manager, there is no way to do that in a regular Effect out of the box.

This package is a tiny cacheable wrapper over [createEffect](https://effector.dev/docs/api/effector/createeffect) factory. It uses the JS `Map` object to store data under the hood. You need an [effector](https://effector.dev) as a peer-dependency.

> Work in progress. This project is still in alpha version. It may work as you expect, or it may not.

## Installation

```bash
yarn add effector cached-fx
```

## Usage

### `createCachedEffect` with handler

**Arguments**

- `handler` _(Function)_ — function to handle effect calls

```ts
import { createCachedEffect } from 'cached-fx'

async function fetchPhotos({ start, limit }: PaginationRequestParams) {
  const base = 'https://jsonplaceholder.typicode.com'
  const query = `?_start=${start}&_limit=${limit}`
  const response = await fetch(`${base}/photos${query}`)
  return await response.json()
}

const fetchPhotosFx = createCachedEffect(fetchPhotos)

fetchPhotosFx({ start: 0, limit: 10 }) // 💅 set cache
fetchPhotosFx({ start: 0, limit: 10 }) // 👍 resolved from cache
```

### `createCachedEffect` with config

**Arguments**

- `handler` _(`Function`)_ — function to handle effect calls
- `domain?` _(`Domain`)_ — custom domain
- `clearOn?` _(`Event<any>`)_ — clock unit which fires the cache clearing
- `expiresIn?` _(`number`)_ — how long the data will last in the cache (in ms). 5 mins by default

```ts
import { createDomain } from 'effector'
import { createCachedEffect } from 'cached-fx'

async function fetchPhotos({ start, limit }: PaginationRequestParams) {
  const base = 'https://jsonplaceholder.typicode.com'
  const query = `?_start=${start}&_limit=${limit}`
  const response = await fetch(`${base}/photos${query}`)
  return await response.json()
}

const app = createDomain()
const clear = app.createEvent()
const fetchPhotosFx = createCachedEffect({
  domain: app, // 👈 you can provide your own domain
  clearOn: clear,
  expiresIn: 90000,
  handler: fetchPhotos,
})

fetchPhotosFx({ start: 0, limit: 10 }) // 💅 set cache
fetchPhotosFx({ start: 1, limit: 10 }) // 💅 set cache
fetchPhotosFx({ start: 2, limit: 10 }) // 💅 set cache

// after 90000 ms
fetchPhotosFx({ start: 0, limit: 10 }) // 👌 cache has been cleared for provided params, setting a new cache

clear() // ✌ cache has been completely cleared for this effect
```

## Acknowledgment

This project was inspired by Effector (from @zerobias). Special thanks to the effector community and [fry-fx](https://github.com/doasync/fry-fx) package.
