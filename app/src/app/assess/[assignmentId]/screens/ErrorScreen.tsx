import { Centered } from './Centered'

export function ErrorScreen({ message }: { message: string | null }) {
  return (
    <Centered>
      <div className="text-center max-w-sm">
        <div className="text-[#2563A6] text-xl font-semibold mb-2">Something went wrong</div>
        <div className="text-[#6B7280] text-sm mb-6">{message}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#2563A6] text-white rounded-lg text-sm hover:bg-[#1E518B]"
        >
          Try Again
        </button>
      </div>
    </Centered>
  )
}
