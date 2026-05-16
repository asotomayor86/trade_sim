import webpush from "web-push"
import { prisma } from "@/lib/db/prisma"

function initWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com"
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  return true
}

export async function sendPushToUser(userId: string, title: string, body: string) {
  if (!initWebPush()) return

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
        JSON.stringify({ title, body })
      )
    )
  )
}
