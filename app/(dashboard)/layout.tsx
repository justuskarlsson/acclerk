import { ActionBar } from "@/components/pdf/ActionBar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <ActionBar />
      <main className="flex-1">{children}</main>
    </div>
  )
}

