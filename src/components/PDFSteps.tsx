import type { FC } from "react"

interface Step {
  num: number
  title: string
  text: string
}

interface PDFStepsProps {
  mode: "merge" | "split" | "images-to-pdf"
}

const PDFSteps: FC<PDFStepsProps> = ({ mode }) => {
  const isSplit = mode === "split"
  const isImages = mode === "images-to-pdf"

  const steps: Step[] =
    mode === "merge"
      ? [
          { num: 1, title: "Selecciona archivos", text: "Elige múltiples archivos PDF desde tu dispositivo" },
          { num: 2, title: "Organiza el orden", text: "Arrastra los archivos para cambiar su orden antes de unirlos" },
          { num: 3, title: "Descarga el resultado", text: "Obtén tu PDF unificado listo para usar" },
        ]
      : mode === "split"
      ? [
          { num: 1, title: "Selecciona archivo", text: "Elige el archivo PDF que quieres separar" },
          { num: 2, title: "Procesa automáticamente", text: "Cada página se convierte en un PDF individual" },
          { num: 3, title: "Descarga los resultados", text: "Obtén cada página como un archivo PDF separado" },
        ]
      : [
          { num: 1, title: "Sube imágenes", text: "Selecciona una o varias imágenes desde tu dispositivo" },
          { num: 2, title: "Organiza el orden", text: "Arrastra las imágenes para establecer el orden de las páginas" },
          { num: 3, title: "Genera tu PDF", text: "Convierte las imágenes en un archivo PDF listo para descargar" },
        ]

  const circleColor = isSplit
    ? "bg-orange-100 text-orange-600"
    : isImages
    ? "bg-green-100 text-green-600"
    : "bg-blue-100 text-blue-600"

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4 text-center">¿Cómo funciona?</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div
            key={step.num}
            className="bg-white shadow-md rounded-xl p-6 flex flex-col items-center text-center hover:shadow-lg transition"
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold mb-3 ${circleColor}`}
            >
              {step.num}
            </div>
            <h4 className="font-medium text-base mb-2">{step.title}</h4>
            <p className="text-gray-600 text-sm">{step.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PDFSteps
