import { useState } from "react"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (value: boolean) => void
  disabled?: boolean
}

export function Switch({ checked = false, onCheckedChange, disabled }: SwitchProps) {
  const [isOn, setIsOn] = useState(checked)

  const toggle = () => {
    if (disabled) return
    const newState = !isOn
    setIsOn(newState)
    onCheckedChange?.(newState)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
        isOn ? "bg-blue-600" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full shadow-md transform transition ${
          isOn ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  )
}
