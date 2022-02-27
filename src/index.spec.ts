import {
  fork,
  Scope,
  allSettled,
  createStore,
  createEvent,
  createEffect,
  createDomain,
} from 'effector'
import { createCachedEffect } from './index'

describe('createRequestFx', () => {
  test('should be defined', () => {
    expect(createCachedEffect).toBeDefined()
  })

  test('should accept handler', async () => {
    const fetchHandler = jest.fn(() => Promise.resolve('data'))
    const fetchFx = createCachedEffect(fetchHandler)
    const result = await fetchFx(1)
    expect(result).toEqual('data')
  })

  test('should accept config', async () => {
    const fetchHandler = jest.fn(() => Promise.resolve('data'))
    const fetchFx = createCachedEffect({ handler: fetchHandler })
    const result = await fetchFx(1)
    expect(result).toEqual('data')
  })

  test('should accept domain', () => {
    const fetchHandler = jest.fn(() => Promise.resolve())
    const domain = createDomain()
    const fetchFx = createCachedEffect({ domain, handler: fetchHandler })
    expect(domain.history.effects.has(fetchFx)).toBeTruthy()
  })
})

let scope: Scope

describe('createRequestFx (forked scope)', () => {
  beforeEach(() => {
    scope = fork()
  })

  test('should return data from handler', async () => {
    const watcher = jest.fn()
    const fetchHandler = jest.fn(() => Promise.resolve(1))

    const fetchFx = createCachedEffect(fetchHandler)
    const $data = createStore(0).on(fetchFx.doneData, (_, data) => data)

    fetchFx.watch(watcher)

    await allSettled(fetchFx, { scope, params: { id: 1337 } })

    expect(scope.getState($data)).toEqual(1)
    expect(watcher).toHaveBeenCalledWith({ id: 1337 })
  })

  test('should call the handler if there is no cached data', async () => {
    const fetchHandler = jest.fn(() => Promise.resolve(false))
    const fetchFx = createCachedEffect(fetchHandler)

    await allSettled(fetchFx, { scope, params: { offset: 0, limit: 10 } })

    expect(fetchHandler).toHaveBeenCalled()
  })

  test('should re-call the handler if cached data has expired', async () => {
    const params = { offset: 10, limit: 10 }
    const fetchHandler = jest.fn(() => Promise.resolve('kek'))

    const fetchFx = createCachedEffect({
      handler: fetchHandler,
      expiresIn: 1000,
    })
    const sleepFx = createEffect(
      (ms: number) => new Promise((rs) => setTimeout(rs, ms)),
    )

    await allSettled(fetchFx, { scope, params })
    await allSettled(sleepFx, { scope, params: 1000 })
    await allSettled(fetchFx, { scope, params })

    expect(fetchHandler).toHaveBeenCalledTimes(2)
  })

  test('should re-call the handler if params changed', async () => {
    const fetchHandler = jest.fn(() => Promise.resolve('cheburek'))
    const fetchFx = createCachedEffect(fetchHandler)

    await allSettled(fetchFx, { scope, params: { offset: 20, limit: 10 } })
    await allSettled(fetchFx, { scope, params: { offset: 30, limit: 10 } })

    expect(fetchHandler).toHaveBeenCalledTimes(2)
  })

  test('should not re-call the handler if data is cached', async () => {
    const params = { offset: 20, limit: 10 }
    const fetchHandler = jest.fn(() => Promise.resolve('lol'))

    const fetchFx = createCachedEffect(fetchHandler)

    await allSettled(fetchFx, { scope, params })
    await allSettled(fetchFx, { scope, params })

    expect(fetchHandler).toHaveBeenCalledTimes(1)
  })

  test('should have independent caches for multiple effects', async () => {
    const params = { offset: 0, limit: 100 }
    const fetchHandler1 = jest.fn(() => Promise.resolve(123))
    const fetchHandler2 = jest.fn(() => Promise.resolve(456))

    const fetchFx1 = createCachedEffect(fetchHandler1)
    const fetchFx2 = createCachedEffect(fetchHandler2)

    await allSettled(fetchFx1, { scope, params })
    await allSettled(fetchFx2, { scope, params })

    expect(fetchHandler1).toHaveBeenCalled()
    expect(fetchHandler2).toHaveBeenCalled()
  })

  test('should clear the cache by provided clock', async () => {
    const params = { offset: 30, limit: 10 }
    const fetchHandler = jest.fn(() => Promise.resolve('some data'))

    const clear = createEvent()
    const fetchFx = createCachedEffect({
      handler: fetchHandler,
      clearOn: clear,
    })

    await allSettled(fetchFx, { scope, params })
    await allSettled(clear, { scope })
    await allSettled(fetchFx, { scope, params })

    expect(fetchHandler).toHaveBeenCalledTimes(2)
  })
})
