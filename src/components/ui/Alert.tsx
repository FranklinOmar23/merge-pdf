import type { ReactNode } from "react"

interface AlertProps {
  children: ReactNode
  variant?: "error" | "info"
}

const variantClasses = {
  error: "border-red-300 bg-red-100 text-red-700",
  info: "border-blue-300 bg-blue-100 text-blue-700",
}

export function Alert({ children, variant = "error" }: AlertProps) {
  return <div className={`rounded-lg border p-3 text-sm ${variantClasses[variant]}`}>{children}</div>
}
