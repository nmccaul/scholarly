import { requireInstructor, SessionError } from '@/lib/lti/session'
import { listCourseMaterials } from '@/lib/materials/repository'
import MaterialsClient from './MaterialsClient'

export const dynamic = 'force-dynamic'

export default async function CourseMaterialsPage() {
  let session
  try {
    session = await requireInstructor()
  } catch (e) {
    if (e instanceof SessionError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-8">
          <p className="text-[#6B7280]">Session expired. Please re-launch from Canvas.</p>
        </div>
      )
    }
    throw e
  }

  const materials = await listCourseMaterials(session.courseId)

  return (
    <MaterialsClient
      initialMaterials={materials.map((m) => ({
        id: m.id,
        title: m.title,
        content: m.content,
        pdfStoragePath: m.pdfStoragePath,
        createdAt: m.createdAt,
      }))}
    />
  )
}
