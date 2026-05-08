import { requireInstructor, SessionError, ForbiddenError } from '@/lib/lti/session'
import { listCourseMaterials } from '@/lib/materials/repository'
import { BuilderClient } from './BuilderClient'

const DEV_MODE = process.env.LTI_DEV_MODE === 'true'

export default async function BuilderNewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const returnUrl = typeof params.return_url === 'string' ? params.return_url : null
  const dlData = typeof params.dl_data === 'string' ? params.dl_data : undefined

  let session = null
  let sessionError = false
  let courseMaterials: Array<{ id: string; title: string; content: string }> = []
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError || e instanceof ForbiddenError) {
      sessionError = true
    } else {
      throw e
    }
  }

  if (session) {
    try {
      const materials = await listCourseMaterials(session.courseId)
      courseMaterials = materials.map((m) => ({ id: m.id, title: m.title, content: m.content }))
    } catch (e) {
      console.error('Failed to load course materials:', e)
      // Proceed with empty materials rather than crashing the page
    }
  }

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

  return (
    <BuilderClient
      returnUrl={returnUrl ?? ''}
      dlData={dlData}
      isDevMode={DEV_MODE || isDemo}
      courseMaterials={courseMaterials}
    />
  )
}
