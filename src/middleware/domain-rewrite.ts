import { Request, Response, NextFunction } from 'express'
import prisma from '../prisma/client'

declare global {
  namespace Express {
    interface Request {
      schoolSlug?: string
    }
  }
}

const SCHOOL_OS_HOST_SUFFIX = '.schoolos.ng'

function isBypassHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith(SCHOOL_OS_HOST_SUFFIX)
  )
}

export async function domainRewriteMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const hostname = req.hostname.toLowerCase()

    if (isBypassHost(hostname)) {
      return next()
    }

    const website = await prisma.schoolWebsite.findFirst({
      where: {
        customDomain: hostname,
        customDomainVerified: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            subdomain: true,
          },
        },
      },
    })

    if (!website) {
      return res.status(404).json({ error: 'Website not found for this domain' })
    }

    req.schoolSlug = website.tenant.subdomain ?? website.tenant.id
    req.tenantId = website.tenant.id
    req.headers['x-tenant-id'] = website.tenant.id

    return next()
  } catch (error) {
    return next(error)
  }
}
