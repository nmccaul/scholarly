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

  if (!returnUrl && !DEV_MODE) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="max-w-md text-center">
          <p className="text-sm font-medium text-red-600">Invalid launch</p>
          <p className="mt-1 text-sm text-slate-500">
            This page must be opened from Canvas. Please re-launch the assignment builder.
          </p>
        </div>
      </div>
    )
  }

  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
          <p className="text-sm text-slate-500">Session expired. Please re-launch from Canvas.</p>
        </div>
      )
    }
    throw e
  }

  const db = createServiceClient()
  const { data } = await db
    .from('assignment_type_requests')
    .select('assignment_type')
    .eq('user_id', session.userId)

  const initialRequested = (data ?? []).map(
    (r: { assignment_type: string }) => r.assignment_type
  )

  return (
    <TypePickerClient
      returnUrl={returnUrl ?? 'http://localhost:3000'}
      dlData={dlData}
      initialRequested={initialRequested}
    />
  )
}
