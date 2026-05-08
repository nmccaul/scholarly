import { requireInstructor, SessionError } from '@/lib/lti/session'
import { createServiceClient } from '@/lib/supabase/client'
import TypePickerClient from './TypePickerClient'

const DEV_MODE = process.env.LTI_DEV_MODE === 'true'

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const returnUrl = typeof params.return_url === 'string' ? params.return_url : null
  const dlData = typeof params.dl_data === 'string' ? params.dl_data : undefined

  let session = null
  let sessionError = false
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) {
      sessionError = true
    } else {
      throw e
    }
  }

  // No return_url + no dev mode + no valid session = not a legitimate launch
  if (!returnUrl && !DEV_MODE && !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md text-center">
          <p className="text-sm font-medium text-red-600">
            {sessionError ? 'Session expired' : 'Invalid launch'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {sessionError
              ? 'Your session has expired. Please re-launch the assignment builder from Canvas.'
              : 'This page must be opened from Canvas. Please re-launch the assignment builder.'}
          </p>
        </div>
      </div>
    )
  }

  const isDemo = !returnUrl && !DEV_MODE

  const initialRequested: string[] = []
  if (session) {
    const db = createServiceClient()
    const { data } = await db
      .from('assignment_type_requests')
      .select('assignment_type')
      .eq('user_id', session.userId)
    initialRequested.push(
      ...(data ?? []).map((r: { assignment_type: string }) => r.assignment_type)
    )
  }

  return (
    <TypePickerClient
      returnUrl={returnUrl ?? ''}
      dlData={dlData}
      isDemo={isDemo}
      initialRequested={initialRequested}
    />
  )
}
