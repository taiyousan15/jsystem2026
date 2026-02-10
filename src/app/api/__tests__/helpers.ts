/**
 * Create a mock Request object for API route testing
 */
export function createRequest(
  path: string,
  options: {
    method?: string
    body?: Record<string, unknown>
    searchParams?: Record<string, string>
  } = {}
): Request {
  const { method = 'GET', body, searchParams } = options
  const url = new URL(path, 'http://localhost:3000')

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value)
    }
  }

  const init: RequestInit = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  return new Request(url.toString(), init)
}

/**
 * Parse NextResponse JSON body
 */
export async function parseResponse<T = unknown>(
  response: Response
): Promise<{ status: number; body: T }> {
  const body = (await response.json()) as T
  return { status: response.status, body }
}
