"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/Card"
import { Input } from "./ui/Input"
import { Progress } from "./ui/Progress"
import { Switch } from "./ui/Switch"
import PDFSteps from "./PDFSteps"
import { FileText, Download, Upload, X, GripVertical, Scissors, Merge } from "lucide-react"
import { PDFDocument } from "pdf-lib"

interface PDFFile {
  id: string
  file: File
  name: string
  size: string
}

export default function PDFMerger() {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress] = useState(0) // 👈 lo dejamos fijo, o elimínalo si no mostrarás progreso real
  const [error, setError] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isSplitMode, setIsSplitMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 📦 Formato de tamaño de archivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 📂 Selección de archivos
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newPdfFiles: PDFFile[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type === "application/pdf") {
        newPdfFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: formatFileSize(file.size),
        })
      }
    }

    if (newPdfFiles.length === 0) {
      setError("Por favor selecciona solo archivos PDF válidos")
      return
    }

    setPdfFiles((prev) => [...prev, ...newPdfFiles])
    setError(null)

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ❌ Eliminar archivo
  const removeFile = (id: string) => {
    setPdfFiles((prev) => prev.filter((file) => file.id !== id))
  }

  // 🖱️ Drag & drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }
    const newFiles = [...pdfFiles]
    const draggedFile = newFiles[draggedIndex]
    newFiles.splice(draggedIndex, 1)
    newFiles.splice(dropIndex, 0, draggedFile)
    setPdfFiles(newFiles)
    setDraggedIndex(null)
  }

  // ✂️ Separar PDFs
  const splitPDFs = async () => {
    if (pdfFiles.length === 0) {
      setError("Necesitas al menos 1 archivo PDF para separar")
      return
    }
    setIsProcessing(true)
    setError(null)
    try {
      for (const pdfFile of pdfFiles) {
        const arrayBuffer = await pdfFile.file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const pageCount = pdf.getPageCount()

        for (let i = 0; i < pageCount; i++) {
          const newPdf = await PDFDocument.create()
          const [copiedPage] = await newPdf.copyPages(pdf, [i])
          newPdf.addPage(copiedPage)
          const pdfBytes = await newPdf.save()
          const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })

          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `${pdfFile.name.replace(".pdf", "")}_pagina_${i + 1}.pdf`
          link.click()
          URL.revokeObjectURL(url)
        }
      }
    } catch {
      setError("Error al procesar los archivos PDF. Verifica que sean válidos.")
    } finally {
      setIsProcessing(false)
    }
  }

  // 🔗 Unir PDFs
  const mergePDFs = async () => {
    if (pdfFiles.length < 2) {
      setError("Necesitas al menos 2 archivos PDF para unir")
      return
    }
    setIsProcessing(true)
    setError(null)
    try {
      const mergedPdf = await PDFDocument.create()
      for (const file of pdfFiles) {
        const arrayBuffer = await file.file.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))
      }
      const pdfBytes = await mergedPdf.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "documento-unido.pdf"
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Error al procesar los archivos PDF. Verifica que sean válidos.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {isSplitMode ? "Separar PDFs" : "Unir PDFs"}
          </h1>
          <p className="text-lg text-gray-600">
            {isSplitMode
              ? "Divide archivos PDF en páginas individuales"
              : "Combina múltiples archivos PDF en un solo documento"}
          </p>
        </div>

        {/* Selector de modo */}
        <Card className="mb-6">
          <CardContent className="flex items-center justify-center gap-6 py-4">
            <span className={!isSplitMode ? "text-blue-600 font-semibold" : "text-gray-500"}>
              <Merge className="inline w-5 h-5 mr-1" /> Unir PDFs
            </span>
            <Switch checked={isSplitMode} onCheckedChange={setIsSplitMode} />
            <span className={isSplitMode ? "text-orange-600 font-semibold" : "text-gray-500"}>
              <Scissors className="inline w-5 h-5 mr-1" /> Separar PDFs
            </span>
          </CardContent>
        </Card>

        {/* Subida de archivos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Seleccionar Archivos PDF
            </CardTitle>
            <CardDescription>
              {isSplitMode
                ? "Elige los archivos PDF que quieres separar en páginas individuales."
                : "Elige los archivos PDF que quieres unir. Puedes arrastrarlos para cambiar el orden."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Input de archivos */}
              <div>
                <label htmlFor="pdf-files" className="block text-sm font-medium text-gray-700">
                  Archivos PDF
                </label>
                <Input
                  ref={fileInputRef}
                  id="pdf-files"
                  type="file"
                  accept=".pdf"
                  multiple={!isSplitMode}
                  onChange={handleFileSelect}
                  className="mt-1"
                />
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-100 text-red-700 text-sm p-2 rounded-md border border-red-300">
                  {error}
                </div>
              )}

              {/* Lista de archivos */}
              {pdfFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">
                      Archivos seleccionados ({pdfFiles.length})
                    </h3>
                    <button
                      onClick={() => setPdfFiles([])}
                      disabled={isProcessing}
                      className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-50"
                    >
                      Limpiar todo
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pdfFiles.map((pdfFile, index) => (
                      <div
                        key={pdfFile.id}
                        draggable={!isProcessing && !isSplitMode}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border transition-all duration-200
                          ${!isProcessing && !isSplitMode
                            ? "cursor-move hover:bg-gray-100 hover:shadow-md"
                            : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          {!isProcessing && !isSplitMode && (
                            <GripVertical className="h-4 w-4 text-gray-400" />
                          )}
                          <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded text-red-600 text-sm font-medium">
                            {index + 1}
                          </div>
                          <FileText className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{pdfFile.name}</p>
                            <p className="text-xs text-gray-500">{pdfFile.size}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(pdfFile.id)}
                          disabled={isProcessing}
                          className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Barra de progreso */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Procesando archivos...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {/* Botón procesar */}
              <div className="flex gap-3">
                <button
                  onClick={isSplitMode ? splitPDFs : mergePDFs}
                  disabled={isProcessing || (isSplitMode ? pdfFiles.length === 0 : pdfFiles.length < 2)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSplitMode ? (
                    <>
                      <Scissors className="h-4 w-4 mr-2 inline" />
                      {isProcessing ? "Procesando..." : "Separar y Descargar PDFs"}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2 inline" />
                      {isProcessing ? "Procesando..." : "Unir y Descargar PDF"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <PDFSteps mode={isSplitMode ? "split" : "merge"} />
      </div>
    </div>
  )
}
