import { Router } from 'express'
import { promises as dns } from 'dns'
import { z } from 'zod'
import prisma from '../../prisma/client'
import { addCustomHostname, getCustomHostnameStatus } from '../../lib/cloudflare'

const router = Router()

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/^https?:\/\//i, '').replace(/\/+$/g, ''))
  .refine((value) => /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(value), {
    message: 'Enter a valid domain name.',
  })

const initiateSchema = z.object({
  domain: domainSchema,
})

const CNAME_TARGET = process.env.CLOUDFLARE_CNAME_TARGET ?? 'websites.schoolos.ng'

function getHostLabel(domain: string) {
  return domain.startsWith('www.') ? 'www' : '@'
}

function mapLookupFailureReason(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code &&
    ['ENODATA', 'ENOTFOUND', 'ETIMEOUT', 'ESERVFAIL'].includes((error as { code?: string }).code as string)
  ) {
    return 'DNS_NOT_PROPAGATED' as const
  }

  return 'LOOKUP_FAILED' as const
}

function mapSslStatus(status: string) {
  const normalized = status.toLowerCase()

  if (['active', 'issued', 'ready'].includes(normalized)) {
    return 'active' as const
  }

  if (['pending_validation', 'pending_deployment', 'initializing', 'pending_issuance'].includes(normalized)) {
    return 'provisioning' as const
  }

  return 'failed' as const
}

router.post('/initiate', async (req, res, next) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { domain } = initiateSchema.parse(req.body)

    const existingOwner = await prisma.schoolWebsite.findFirst({
      where: {
        customDomain: domain,
        tenantId: {
          not: req.user.tenantId,
        },
      },
      select: {
        id: true,
      },
    })

    if (existingOwner) {
      return res.status(409).json({ error: 'This domain is already in use by another school.' })
    }

    await prisma.schoolWebsite.upsert({
      where: {
        tenantId: req.user.tenantId,
      },
      create: {
        tenantId: req.user.tenantId,
        customDomain: domain,
        customDomainVerified: false,
      },
      update: {
        customDomain: domain,
        customDomainVerified: false,
      },
    })

    return res.json({
      success: true,
      cnameTarget: CNAME_TARGET,
      host: getHostLabel(domain),
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/verify', async (req, res, next) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const website = await prisma.schoolWebsite.findUnique({
      where: {
        tenantId: req.user.tenantId,
      },
      select: {
        customDomain: true,
        customDomainVerified: true,
      },
    })

    if (!website?.customDomain) {
      return res.status(404).json({ error: 'No pending custom domain found.' })
    }

    let resolvedCnames: string[]

    try {
      resolvedCnames = await dns.resolveCname(website.customDomain)
    } catch (error) {
      return res.json({
        verified: false,
        reason: mapLookupFailureReason(error),
      })
    }

    const matchesTarget = resolvedCnames.some((entry) => entry.toLowerCase().includes('schoolos.ng'))

    if (!matchesTarget) {
      return res.json({
        verified: false,
        reason: 'WRONG_TARGET' as const,
      })
    }

    await addCustomHostname(website.customDomain)

    await prisma.schoolWebsite.update({
      where: {
        tenantId: req.user.tenantId,
      },
      data: {
        customDomainVerified: true,
      },
    })

    return res.json({
      verified: true,
      domain: website.customDomain,
      sslStatus: 'provisioning' as const,
    })
  } catch (error) {
    return next(error)
  }
})

router.get('/ssl-status', async (req, res, next) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const website = await prisma.schoolWebsite.findUnique({
      where: {
        tenantId: req.user.tenantId,
      },
      select: {
        customDomain: true,
      },
    })

    if (!website?.customDomain) {
      return res.status(404).json({ error: 'No custom domain found for this school.' })
    }

    const cloudflareStatus = await getCustomHostnameStatus(website.customDomain)

    return res.json({
      sslStatus: mapSslStatus(cloudflareStatus.ssl_status),
      domain: website.customDomain,
    })
  } catch (error) {
    return next(error)
  }
})

export default router
