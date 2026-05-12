// LTI tools run inside Canvas's white iframe — pin light mode regardless of system preference.
export default function AssessLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#18202A]">
      {children}
    </div>
  )
}
