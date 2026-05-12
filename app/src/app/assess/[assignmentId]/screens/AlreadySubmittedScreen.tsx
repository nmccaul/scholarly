import Link from 'next/link'
import { Centered } from './Centered'
import type { AssignmentId } from '@/types/domain'

interface Props {
  assignmentId: AssignmentId
  isInstructor: boolean
  resetting: boolean
  onReset: () => void
}

export function AlreadySubmittedScreen({ assignmentId, isInstructor, resetting, onReset }: Props) {
  return (
    <Centered>
      <div className="text-center max-w-sm">
        <div className="text-xl font-semibold text-[#24313F] mb-2">Already Submitted</div>
        <div className="text-[#6B7280] text-sm mb-6">
          You&rsquo;ve already submitted this assignment.
        </div>
        <div className="flex flex-col gap-3">
          {isInstructor && (
            <button
              onClick={onReset}
              disabled={resetting}
              className="block w-full px-5 py-2.5 bg-[#2563A6] text-white text-sm font-semibold rounded-lg hover:bg-[#1E518B] disabled:opacity-50 transition-colors"
            >
              {resetting ? 'Resetting…' : 'Try Again (Instructor Reset)'}
            </button>
          )}
          <Link
            href={`/dashboard/${assignmentId}`}
            className="block px-5 py-2.5 border border-[#E3E0D8] text-[#374151] text-sm font-semibold rounded-lg hover:bg-[#FAF9F6] transition-colors"
          >
            View Submissions
          </Link>
          <Link
            href="/dashboard"
            className="block px-5 py-2.5 border border-[#E3E0D8] text-[#374151] text-sm font-semibold rounded-lg hover:bg-[#FAF9F6] transition-colors"
          >
            All Assignments
          </Link>
        </div>
      </div>
    </Centered>
  )
}
