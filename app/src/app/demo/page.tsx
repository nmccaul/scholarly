import { redirect } from 'next/navigation'
import { getSession } from '@/lib/lti/session'
import DemoLoginClient from './DemoLoginClient'

export const dynamic = 'force-dynamic'

export default async function DemoPage() {
  // In dev mode getSession() always returns a session — skip the form and go straight in
  const session = await getSession()
  if (session) redirect('/dashboard')

  return <DemoLoginClient />
}
