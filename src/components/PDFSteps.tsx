import type { FC } from "react"

interface Step {
  num: number
  title: string
  text: string
}

interface PDFStepsProps {
  mode: "merge" | "split"
}

const PDFSteps: FC<PDFStepsProps> = ({ mode }) => {
  const isSplit = mode === "split"

  const steps: Step[] =
    mode === "merge"
      ? [
          { num: 1, title: "Selecciona archivos", text: "Elige múltiples archivos PDF desde tu dispositivo" },
          { num: 2, title: "Organiza el orden", text: "Arrastra los archivos para cambiar su orden antes de unirlos" },
          { num: 3, title: "Descarga el resultado", text: "Obtén tu PDF unificado listo para usar" },
        ]
      : [
          { num: 1, title: "Selecciona archivos", text: "Elige el archivo PDF que quieres separar" },
          { num: 2, title: "Procesa automáticamente", text: "Cada página se convierte en un PDF individual" },
          { num: 3, title: "Descarga los resultados", text: "Obtén cada página como un archivo PDF separado" },
        ]

  const circleColor = isSplit ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"

  return (
    <div className="mt-8 bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">¿Cómo funciona?</h2>
      <div className="grid md:grid-cols-3 gap-6 text-sm">
        {steps.map((step) => (
          <div key={step.num} className="flex items-start gap-3">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full font-semibold ${circleColor}`}
            >
              {step.num}
            </div>
            <div>
              <h4 className="font-medium mb-1">{step.title}</h4>
              <p className="text-gray-600">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PDFSteps
