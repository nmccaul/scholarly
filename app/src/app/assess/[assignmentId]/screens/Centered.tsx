export function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="text-[#6B7280] text-base">{children}</div>
    </div>
  )
}
