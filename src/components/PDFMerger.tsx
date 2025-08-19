"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/Card"
import { Input } from "./ui/Input"
import { Progress } from "./ui/Progress"
import PDFSteps from "./PDFSteps"
import { FileText, Download, Upload, X, GripVertical, Scissors, Merge, ImageIcon } from "lucide-react"
import { PDFDocument } from "pdf-lib"

interface FileItem {
  id: string
  file: File
  name: string
  size: string
  type: "pdf" | "image"
}

export default function PDFMerger() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [mode, setMode] = useState<"merge" | "split" | "images-to-pdf">("merge")
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
    const selectedFiles = event.target.files
    if (!selectedFiles) return

    const newFiles: FileItem[] = []
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      if (mode === "images-to-pdf" && file.type.startsWith("image/")) {
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: formatFileSize(file.size),
          type: "image",
        })
      } else if (mode !== "images-to-pdf" && file.type === "application/pdf") {
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: formatFileSize(file.size),
          type: "pdf",
        })
      }
    }

    if (newFiles.length === 0) {
      setError(`Por favor selecciona solo ${mode === "images-to-pdf" ? "imágenes" : "archivos PDF"} válidos`)
      return
    }

    setFiles((prev) => [...prev, ...newFiles])
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // ❌ Eliminar archivo
  const removeFile = (id: string) => setFiles((prev) => prev.filter((file) => file.id !== id))

  // 🖱️ Drag & drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return
    const newFiles = [...files]
    const draggedFile = newFiles[draggedIndex]
    newFiles.splice(draggedIndex, 1)
    newFiles.splice(dropIndex, 0, draggedFile)
    setFiles(newFiles)
    setDraggedIndex(null)
  }

  // ✂️ Separar PDFs
  const splitPDFs = async () => {
    if (files.length === 0) {
      setError("Necesitas al menos 1 archivo PDF para separar")
      return
    }
    setIsProcessing(true)
    setError(null)
    try {
      for (const pdfFile of files) {
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
      setError("Error al procesar los archivos PDF.")
    } finally {
      setIsProcessing(false)
    }
  }

  // 🔗 Unir PDFs
  const mergePDFs = async () => {
    if (files.length < 2) {
      setError("Necesitas al menos 2 archivos PDF para unir")
      return
    }
    setIsProcessing(true)
    setError(null)
    try {
      const mergedPdf = await PDFDocument.create()
      for (const file of files) {
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
      setError("Error al procesar los archivos PDF.")
    } finally {
      setIsProcessing(false)
    }
  }

  // 🖼️ Imágenes a PDF
  const convertImagesToPDF = async () => {
    if (files.length === 0) {
      setError("Necesitas al menos 1 imagen para convertir")
      return
    }
    setIsProcessing(true)
    setError(null)
    try {
      const pdfDoc = await PDFDocument.create()
      for (const imageFile of files) {
        const arrayBuffer = await imageFile.file.arrayBuffer()
        let image
        if (imageFile.file.type.includes("jpeg") || imageFile.file.type.includes("jpg")) {
          image = await pdfDoc.embedJpg(arrayBuffer)
        } else {
          image = await pdfDoc.embedPng(arrayBuffer)
        }
        const page = pdfDoc.addPage()
        const { width, height } = page.getSize()
        const imgAspect = image.width / image.height
        let imgWidth = width - 40
        let imgHeight = imgWidth / imgAspect
        if (imgHeight > height) {
          imgHeight = height - 40
          imgWidth = imgHeight * imgAspect
        }
        page.drawImage(image, {
          x: (width - imgWidth) / 2,
          y: (height - imgHeight) / 2,
          width: imgWidth,
          height: imgHeight,
        })
      }
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "imagenes-convertidas.pdf"
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Error al procesar las imágenes.")
    } finally {
      setIsProcessing(false)
    }
  }

  // 🔘 Procesar
  const processFiles = () => {
    if (mode === "merge") mergePDFs()
    if (mode === "split") splitPDFs()
    if (mode === "images-to-pdf") convertImagesToPDF()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {mode === "merge" ? "Unir PDFs" : mode === "split" ? "Separar PDFs" : "Imágenes a PDF"}
          </h1>
          <p className="text-lg text-gray-600">
            {mode === "merge"
              ? "Combina múltiples archivos PDF en un solo documento"
              : mode === "split"
              ? "Divide archivos PDF en páginas individuales"
              : "Convierte múltiples imágenes en un solo archivo PDF"}
          </p>
        </div>

        {/* Selector de modo */}
        <Card className="mb-6">
  <CardContent className="pt-6">
    <div className="flex flex-col items-center">
      <h1 className="text-sm font-medium mb-4 text-center">Selecciona el modo</h1>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        
        {/* Opción Unir PDFs */}
        <div className="flex-1">
          <input
            type="radio"
            id="merge"
            name="mode"
            value="merge"
            checked={mode === "merge"}
            onChange={(e) => setMode(e.target.value as "merge" | "split" | "images-to-pdf")}
            disabled={isProcessing}
            className="sr-only"
          />
          <label
            htmlFor="merge"
            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all h-20 ${
              mode === "merge"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white hover:border-gray-300"
            } ${isProcessing ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Merge className={`h-5 w-5 flex-shrink-0 ${mode === "merge" ? "text-blue-600" : "text-gray-500"}`} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">Unir PDFs</div>
              <div className="text-xs text-gray-500 mt-1">Combinar múltiples archivos</div>
            </div>
          </label>
        </div>

        {/* Opción Separar PDFs */}
        <div className="flex-1">
          <input
            type="radio"
            id="split"
            name="mode"
            value="split"
            checked={mode === "split"}
            onChange={(e) => setMode(e.target.value as "merge" | "split" | "images-to-pdf")}
            disabled={isProcessing}
            className="sr-only"
          />
          <label
            htmlFor="split"
            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all h-20 ${
              mode === "split"
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-gray-200 bg-white hover:border-gray-300"
            } ${isProcessing ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <Scissors className={`h-5 w-5 flex-shrink-0 ${mode === "split" ? "text-orange-600" : "text-gray-500"}`} />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">Separar PDFs</div>
              <div className="text-xs text-gray-500 mt-1">Dividir en páginas</div>
            </div>
          </label>
        </div>

        {/* Opción Imágenes a PDF */}
        <div className="flex-1">
          <input
            type="radio"
            id="images-to-pdf"
            name="mode"
            value="images-to-pdf"
            checked={mode === "images-to-pdf"}
            onChange={(e) => setMode(e.target.value as "merge" | "split" | "images-to-pdf")}
            disabled={isProcessing}
            className="sr-only"
          />
          <label
            htmlFor="images-to-pdf"
            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all h-20 ${
              mode === "images-to-pdf"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-200 bg-white hover:border-gray-300"
            } ${isProcessing ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <ImageIcon
              className={`h-5 w-5 flex-shrink-0 ${
                mode === "images-to-pdf" ? "text-green-600" : "text-gray-500"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm">Imágenes a PDF</div>
              <div className="text-xs text-gray-500 mt-1">Convertir imágenes</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  </CardContent>
</Card>


        {/* Subida de archivos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {mode === "images-to-pdf" ? "Seleccionar Imágenes" : "Seleccionar Archivos PDF"}
            </CardTitle>
            <CardDescription>
              {mode === "merge" && "Elige los archivos PDF que quieres unir. Puedes arrastrarlos para cambiar el orden."}
              {mode === "split" && "Elige los archivos PDF que quieres separar en páginas individuales."}
              {mode === "images-to-pdf" && "Elige las imágenes que quieres convertir a PDF. Puedes arrastrarlas para cambiar el orden."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Input de archivos */}
              <div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={mode === "images-to-pdf" ? "image/*" : ".pdf"}
                  multiple
                  onChange={handleFileSelect}
                  className="mt-1"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-100 text-red-700 text-sm p-2 rounded-md border border-red-300">{error}</div>
              )}

              {/* Lista */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Archivos seleccionados ({files.length})</h3>
                    <button onClick={() => setFiles([])} disabled={isProcessing} className="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 disabled:opacity-50">
                      Limpiar todo
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {files.map((f, index) => (
                      <div
                        key={f.id}
                        draggable={mode !== "split" && !isProcessing}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          {mode !== "split" && <GripVertical className="h-4 w-4 text-gray-400" />}
                          <div className={`flex items-center justify-center w-8 h-8 rounded text-sm font-medium ${f.type === "image" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                            {index + 1}
                          </div>
                          {f.type === "image" ? <ImageIcon className="h-5 w-5 text-green-600" /> : <FileText className="h-5 w-5 text-red-600" />}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{f.name}</p>
                            <p className="text-xs text-gray-500">{f.size}</p>
                          </div>
                        </div>
                        <button onClick={() => removeFile(f.id)} disabled={isProcessing} className="p-1 rounded hover:bg-gray-200 disabled:opacity-50">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón */}
              <div className="flex gap-3">
                <button
                  onClick={processFiles}
                  disabled={isProcessing || (mode === "merge" && files.length < 2) || (mode !== "merge" && files.length === 0)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? "Procesando..." : mode === "merge" ? "Unir y Descargar PDF" : mode === "split" ? "Separar y Descargar PDFs" : "Convertir y Descargar PDF"}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <PDFSteps mode={mode} />
      </div>
    </div>
  )
}
