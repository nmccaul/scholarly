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

  let courseMaterials: Array<{ id: string; title: string; content: string }> = []
  try {
    const session = await requireInstructor()
    const materials = await listCourseMaterials(session.courseId)
    courseMaterials = materials.map((m) => ({ id: m.id, title: m.title, content: m.content }))
  } catch (e) {
    if (e instanceof SessionError || e instanceof ForbiddenError) {
      // No valid instructor session — builder renders without pre-loaded library
    } else {
      throw e
    }
  }

  return (
    <BuilderClient
      returnUrl={returnUrl ?? 'http://localhost:3000'}
      dlData={dlData}
      isDevMode={DEV_MODE}
      courseMaterials={courseMaterials}
    />
  )
}
