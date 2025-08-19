import type { FC } from "react"

interface ProgressProps {
  value: number // porcentaje entre 0 y 100
  className?: string
}

export const Progress: FC<ProgressProps> = ({ value, className = "" }) => {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-3 overflow-hidden ${className}`}>
      <div
        className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
