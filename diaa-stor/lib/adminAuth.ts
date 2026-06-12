import type { NextApiRequest, NextApiResponse } from 'next'

export function withAdminAuth(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.headers.authorization?.replace('Bearer ', '').trim()
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' })
    }
    if (!token || token !== adminPassword) {
      return res.status(401).json({ error: 'Non autorisé' })
    }
    return handler(req, res)
  }
}
