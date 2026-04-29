const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'

function getCloudflareConfig() {
  const token = process.env.CLOUDFLARE_API_TOKEN
  const zoneId = process.env.CLOUDFLARE_ZONE_ID

  if (!token || !zoneId) {
    throw new Error('Cloudflare custom hostname env vars are not configured.')
  }

  return { token, zoneId }
}

async function cloudflareRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = getCloudflareConfig()

  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const payload = (await response.json()) as {
    success: boolean
    errors?: Array<{ message?: string }>
    result?: T
  }

  if (!response.ok || !payload.success || !payload.result) {
    const message = payload.errors?.[0]?.message ?? 'Cloudflare request failed.'
    throw new Error(message)
  }

  return payload.result
}

export async function addCustomHostname(domain: string): Promise<{ id: string; status: string }> {
  const { zoneId } = getCloudflareConfig()

  const result = await cloudflareRequest<{ id: string; status: string }>(
    `/zones/${zoneId}/custom_hostnames`,
    {
      method: 'POST',
      body: JSON.stringify({
        hostname: domain,
        ssl: {
          method: 'http',
          type: 'dv',
          settings: {
            min_tls_version: '1.2',
          },
        },
      }),
    },
  )

  return { id: result.id, status: result.status }
}

export async function getCustomHostnameStatus(
  domain: string,
): Promise<{ ssl_status: string; status: string }> {
  const { zoneId } = getCloudflareConfig()

  const result = await cloudflareRequest<{
    result: Array<{ status: string; ssl?: { status?: string } }>
  }>(`/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(domain)}`)

  const firstMatch = result.result[0]

  if (!firstMatch) {
    throw new Error('Custom hostname not found in Cloudflare.')
  }

  return {
    ssl_status: firstMatch.ssl?.status ?? 'initializing',
    status: firstMatch.status,
  }
}
