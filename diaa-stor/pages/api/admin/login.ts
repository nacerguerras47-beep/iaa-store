import type { NextApiRequest, NextApiResponse } from 'next'

const RATE_LIMIT = 5
const WINDOW_MS = 15 * 60 * 1000

const attempts = new Map<string, { count: number; firstAttempt: number }>()

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
  const now = Date.now()

  const record = attempts.get(ip)
  if (record) {
    if (now - record.firstAttempt > WINDOW_MS) {
      attempts.set(ip, { count: 1, firstAttempt: now })
    } else if (record.count >= RATE_LIMIT) {
      const retryAfter = Math.ceil((record.firstAttempt + WINDOW_MS - now) / 1000)
      res.setHeader('Retry-After', String(retryAfter))
      return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans ' + Math.ceil(retryAfter / 60) + ' min.' })
    }
  }

  const { password } = req.body
  if (!password) {
    return res.status(400).json({ error: 'Mot de passe requis' })
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    if (record) {
      attempts.set(ip, { count: record.count + 1, firstAttempt: record.firstAttempt })
    } else {
      attempts.set(ip, { count: 1, firstAttempt: now })
    }
    return res.status(401).json({ error: 'Mot de passe incorrect' })
  }

  return res.status(200).json({ success: true })
}
