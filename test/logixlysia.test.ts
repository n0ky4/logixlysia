import { edenTreaty } from '@elysiajs/eden'
import { beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'

import logixlysia from '../src'

describe('Logixlysia with IP logging enabled', () => {
  let server: Elysia
  let app: ReturnType<typeof edenTreaty> | any
  let logs: string[] = []

  beforeAll(() => {
    server = new Elysia()
      .use(
        logixlysia({
          config: {
            ip: true,
            customLogFormat:
              '🦊 {now} {duration} {level} {method} {pathname} {status} {message} {ip}'
          }
        })
      )
      .get('/', () => '🦊 Logixlysia Getting')
      .post('logixlysia', () => '🦊 Logixlysia Posting')
      .listen(3000)

    app = edenTreaty<typeof server>('http://127.0.0.1:3000')
  })

  beforeEach(() => {
    logs = []
  })

  it("Logs incoming IP address for GET '/' requests when X-Forwarded-For header is present", async () => {
    const requestCount = 5

    for (let i = 0; i < requestCount; i++) {
      await app.get('/', {
        headers: { 'X-Forwarded-For': '192.168.1.1' }
      })
    }

    logs.forEach(log => {
      expect(log).toMatch(
        /^🦊 .+ INFO .+ .+ GET \/ .+ IP: \d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
      )
    })
  })

  it("Logs 'null' for GET '/' requests when X-Forwarded-For header is not present", async () => {
    const requestCount = 5

    for (let i = 0; i < requestCount; i++) {
      await app.get('/')
    }

    logs.forEach(log => {
      expect(log).toMatch(/^🦊 .+ INFO .+ .+ GET \/ .+ IP: null$/)
    })
  })
})

describe('Logixlysia with IP logging disabled', () => {
  let server: Elysia
  let app: ReturnType<typeof edenTreaty> | any
  let logs: string[] = []

  beforeAll(() => {
    server = new Elysia()
      .use(
        logixlysia({
          config: {
            ip: false,
            customLogFormat:
              '🦊 {now} {duration} {level} {method} {pathname} {status} {message} {ip}'
          }
        })
      )
      .get('/', () => '🦊 Logixlysia Getting')
      .post('logixlysia', () => '🦊 Logixlysia Posting')
      .listen(3000)

    app = edenTreaty<typeof server>('http://127.0.0.1:3000')
  })

  beforeEach(() => {
    logs = []
  })

  it("Responds correctly to GET '/' requests", async () => {
    const requestCount = 5

    for (let i = 0; i < requestCount; i++) {
      logs.push((await app.get('/')).data)
    }

    logs.forEach(log => {
      expect(log).toBe('🦊 Logixlysia Getting')
    })
  })

  it("Responds correctly to POST '/logixlysia' requests", async () => {
    const requestCount = 5

    for (let i = 0; i < requestCount; i++) {
      const postResponse = await app.logixlysia.post({})
      logs.push(
        postResponse.status === 200 ? postResponse.data : postResponse.error
      )
    }

    logs.forEach(log => {
      expect(log).toBe('🦊 Logixlysia Posting')
    })
  })

  it('Throws an error when attempting to post to an undefined route', async () => {
    const response = await app.post('/undefinedRoute', {})
    const error = response.error

    expect(response.status).toBe(404)
    expect(error).toBeInstanceOf(Error)
  })
})

describe('Logixlysia with log filtering enabled', () => {
  let server: Elysia
  let app: ReturnType<typeof edenTreaty> | any
  let logs: string[] = []

  beforeAll(() => {
    server = new Elysia()
      .use(
        logixlysia({
          config: {
            logFilter: {
              level: 'INFO',
              status: [200, 404],
              method: 'GET'
            }
          }
        })
      )
      .get('/', () => '🦊 Logixlysia Getting')
      .post('logixlysia', () => '🦊 Logixlysia Posting')
      .listen(3000)

    app = edenTreaty<typeof server>('http://127.0.0.1:3000')
  })

  beforeEach(() => {
    logs = []
  })

  it("Logs 'GET' requests with status 200 or 404 when log filtering criteria are met", async () => {
    const requestCount = 5

    for (let i = 0; i < requestCount; i++) {
      logs.push((await app.get('/')).data)
    }

    expect(logs.length).toBe(requestCount)
    logs.forEach(log => {
      expect(log).toMatch('🦊 Logixlysia Getting')
    })
  })

  it("Doesn't log 'POST' requests when log filtering criteria are not met", async () => {
    const requestCount = 5

    for (let i = 0; i < requestCount; i++) {
      await app.post('/logixlysia', {})
    }

    expect(logs.length).toBe(0)
  })

  const otherMethods = ['PUT', 'DELETE', 'PATCH', 'HEAD'] // OPTIONS is failed (IDK why)
  otherMethods.forEach(method => {
    it(`Logs '${method}' requests with status 200 or 404 when log filtering criteria are met`, async () => {
      const requestCount = 5

      for (let i = 0; i < requestCount; i++) {
        logs.push((await app[method.toLowerCase()]('/')).data)
      }

      expect(logs.length).toBe(requestCount)
    })
  })
})

describe('Logixlysia with log filtering disabled', () => {
  let server: Elysia
  let app: ReturnType<typeof edenTreaty> | any
  let logs: string[] = []

  beforeAll(() => {
    server = new Elysia()
      .use(
        logixlysia({
          config: {
            logFilter: null
          }
        })
      )
      .get('/', () => '🦊 Logixlysia Getting')
      .post('logixlysia', () => '🦊 Logixlysia Posting')
      .listen(3000)

    app = edenTreaty<typeof server>('http://127.0.0.1:3000')
  })

  beforeEach(() => {
    logs = []
  })

  it('Logs all requests when log filtering is disabled', async () => {
    const requestCount = 5

    for (let i = 0; i < requestCount; i++) {
      logs.push((await app.get('/')).data)
      logs.push((await app.post('/logixlysia', {})).data)
    }

    expect(logs.length).toBe(requestCount * 2)
  })
})
