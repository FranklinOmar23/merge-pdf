import type { ReactNode } from "react"

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-red-100 text-red-700 border border-red-300 text-sm">
      {children}
    </div>
  )
}
