import { createDomain, forward, Event, Domain, Effect } from 'effector'

export type CachedData<Result> = {
  data: Result
  createdAt: number
}

export type Handler<Payload, Result> = (
  params: Payload,
) => Promise<Result> | Result

export interface Config<Payload, Result> {
  handler: Handler<Payload, Result>
  domain?: Domain
  clearOn?: Event<any>
  expiresIn?: number
}

export interface CachedEffect<Payload, Result> extends Effect<Payload, Result> {
  (payload: Payload): Promise<Result>
}

const defaultDomain = createDomain()

const getParams = <Payload, Result>(
  params: Config<Payload, Result> | Handler<Payload, Result>,
): Config<Payload, Result> =>
  typeof params === 'function'
    ? {
        handler: params,
        domain: defaultDomain,
      }
    : params

/**
 * Creates a cached effect
 * @param handler function to handle effect calls
 */
export function createCachedEffect<Payload, Result>(
  handler: Handler<Payload, Result>,
): CachedEffect<Payload, Result>

/**
 * Creates a cached effect
 * @param domain custom domain
 * @param handler function to handle effect calls
 * @param clearOn clock unit which fires the cache clearing
 * @param expiresIn how long the data will last in the cache (in ms). 5 mins by default
 */
export function createCachedEffect<Payload, Result>(
  config: Config<Payload, Result>,
): CachedEffect<Payload, Result>

export function createCachedEffect<Payload, Result>(
  params: Config<Payload, Result> | Handler<Payload, Result>,
): CachedEffect<Payload, Result> {
  const {
    handler,
    clearOn,
    expiresIn = 300000,
    domain = defaultDomain,
  } = getParams<Payload, Result>(params)
  const cache = new Map()
  const clearCache = domain.createEvent()

  function hasExpired(createdAt: number) {
    const currentTime = Date.now()
    return currentTime - expiresIn > createdAt
  }

  function getCache(params: string) {
    if (cache.has(params)) {
      const { data, createdAt } = cache.get(params) as CachedData<Result>
      return hasExpired(createdAt) ? null : data
    }
    return null
  }

  if (clearOn) {
    forward({
      from: clearOn,
      to: clearCache.prepend(() => cache.clear()),
    })
  }

  return domain.createEffect<Payload, Result>({
    handler: async (params: Payload) => {
      const key = JSON.stringify(params)
      const data = getCache(key)
      if (data !== null) {
        return data
      }
      const response = await handler(params)
      cache.set(key, { data: response, createdAt: Date.now() })
      return response
    },
  })
}
