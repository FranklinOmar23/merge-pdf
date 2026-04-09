import { useEffect, useRef, useState } from "react"
import type { ChangeEvent, DragEvent } from "react"
import {
  Download,
  FileText,
  GripVertical,
  ImageIcon,
  Merge,
  Scissors,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react"
import { PDFDocument } from "pdf-lib"

import PDFSteps from "./PDFSteps"
import { Alert } from "./ui/Alert"
import { Button } from "./ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/Card"
import { Input } from "./ui/Input"
import { Progress } from "./ui/Progress"

type Mode = "merge" | "split" | "images-to-pdf"

interface FileItem {
  id: string
  file: File
  name: string
  sizeLabel: string
  type: "pdf" | "image"
}

interface ModeOption {
  value: Mode
  title: string
  shortTitle: string
  description: string
  inputLabel: string
  inputDescription: string
  accept: string
  minFiles: number
  emptyStateError: string
  invalidTypeLabel: string
  actionLabel: string
  processingLabel: string
  selectedClasses: string
  iconClasses: string
  badgeClasses: string
  icon: LucideIcon
}

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "merge",
    title: "Unir PDFs",
    shortTitle: "Combinar múltiples archivos",
    description: "Combina múltiples archivos PDF en un solo documento.",
    inputLabel: "Seleccionar archivos PDF",
    inputDescription: "Elige los archivos PDF que quieres unir. Puedes arrastrarlos para cambiar el orden.",
    accept: ".pdf,application/pdf",
    minFiles: 2,
    emptyStateError: "Necesitas al menos 2 archivos PDF para unir.",
    invalidTypeLabel: "archivos PDF",
    actionLabel: "Unir y descargar PDF",
    processingLabel: "Uniendo archivos...",
    selectedClasses: "border-blue-500 bg-blue-50 text-blue-700",
    iconClasses: "text-blue-600",
    badgeClasses: "bg-blue-100 text-blue-700",
    icon: Merge,
  },
  {
    value: "split",
    title: "Separar PDFs",
    shortTitle: "Dividir en páginas",
    description: "Divide uno o varios archivos PDF en páginas individuales.",
    inputLabel: "Seleccionar archivos PDF",
    inputDescription: "Elige los archivos PDF que quieres separar en páginas individuales.",
    accept: ".pdf,application/pdf",
    minFiles: 1,
    emptyStateError: "Necesitas al menos 1 archivo PDF para separar.",
    invalidTypeLabel: "archivos PDF",
    actionLabel: "Separar y descargar PDFs",
    processingLabel: "Separando páginas...",
    selectedClasses: "border-orange-500 bg-orange-50 text-orange-700",
    iconClasses: "text-orange-600",
    badgeClasses: "bg-orange-100 text-orange-700",
    icon: Scissors,
  },
  {
    value: "images-to-pdf",
    title: "Imágenes a PDF",
    shortTitle: "Convertir imágenes",
    description: "Convierte varias imágenes en un único archivo PDF.",
    inputLabel: "Seleccionar imágenes",
    inputDescription: "Elige las imágenes que quieres convertir a PDF. Puedes arrastrarlas para cambiar el orden.",
    accept: "image/*",
    minFiles: 1,
    emptyStateError: "Necesitas al menos 1 imagen para convertir.",
    invalidTypeLabel: "imágenes",
    actionLabel: "Convertir y descargar PDF",
    processingLabel: "Generando PDF...",
    selectedClasses: "border-green-500 bg-green-50 text-green-700",
    iconClasses: "text-green-600",
    badgeClasses: "bg-green-100 text-green-700",
    icon: ImageIcon,
  },
]

const createFileId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

const formatFileSize = (bytes: number) => {
  if (bytes === 0) {
    return "0 Bytes"
  }

  const base = 1024
  const units = ["Bytes", "KB", "MB", "GB"]
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1)

  return `${Number.parseFloat((bytes / base ** unitIndex).toFixed(2))} ${units[unitIndex]}`
}

const getFileSignature = (file: File) => `${file.name}:${file.size}:${file.lastModified}`

const isValidFileForMode = (file: File, mode: Mode) =>
  mode === "images-to-pdf" ? file.type.startsWith("image/") : file.type === "application/pdf"

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.click()

  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const createPdfBlob = (pdfBytes: Uint8Array<ArrayBufferLike>) => {
  const normalizedBytes = new Uint8Array(pdfBytes.byteLength)
  normalizedBytes.set(pdfBytes)
  return new Blob([normalizedBytes], { type: "application/pdf" })
}

const getErrorMessage = (fallback: string, error: unknown) => {
  if (error instanceof Error && error.message) {
    return `${fallback} ${error.message}`
  }

  return fallback
}

export default function PDFMerger() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>("merge")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentMode = MODE_OPTIONS.find((option) => option.value === mode) ?? MODE_OPTIONS[0]
  const canReorder = mode !== "split"
  const canProcess = files.length >= currentMode.minFiles

  useEffect(() => {
    setFiles([])
    setError(null)
    setNotice(null)
    setProgress(0)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [mode])

  const updateProgress = (completed: number, total: number) => {
    if (total <= 0) {
      setProgress(0)
      return
    }

    setProgress(Math.round((completed / total) * 100))
  }

  const clearAllFiles = () => {
    setFiles([])
    setError(null)
    setNotice(null)
    setProgress(0)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files
    if (!selectedFiles?.length) {
      return
    }

    const existingFiles = new Set(files.map((item) => getFileSignature(item.file)))
    let invalidCount = 0
    let duplicateCount = 0

    const nextFiles = Array.from(selectedFiles).reduce<FileItem[]>((accumulator, file) => {
      if (!isValidFileForMode(file, mode)) {
        invalidCount += 1
        return accumulator
      }

      const signature = getFileSignature(file)
      if (existingFiles.has(signature)) {
        duplicateCount += 1
        return accumulator
      }

      existingFiles.add(signature)
      accumulator.push({
        id: createFileId(),
        file,
        name: file.name,
        sizeLabel: formatFileSize(file.size),
        type: mode === "images-to-pdf" ? "image" : "pdf",
      })

      return accumulator
    }, [])

    if (!nextFiles.length) {
      const reasons = []

      if (invalidCount > 0) {
        reasons.push(`Se rechazaron ${invalidCount} archivo(s) por no ser ${currentMode.invalidTypeLabel} válidos.`)
      }

      if (duplicateCount > 0) {
        reasons.push(`Se omitieron ${duplicateCount} archivo(s) duplicados.`)
      }

      setError(reasons.join(" ") || `Selecciona solo ${currentMode.invalidTypeLabel} válidos.`)
      setNotice(null)
      event.target.value = ""
      return
    }

    setFiles((previousFiles) => [...previousFiles, ...nextFiles])
    setError(null)
    setNotice(
      invalidCount > 0 || duplicateCount > 0
        ? `Se agregaron ${nextFiles.length} archivo(s).${invalidCount > 0 ? ` ${invalidCount} no eran válidos.` : ""}${duplicateCount > 0 ? ` ${duplicateCount} ya estaban cargados.` : ""}`
        : null,
    )
    event.target.value = ""
  }

  const removeFile = (id: string) => {
    setFiles((previousFiles) => previousFiles.filter((file) => file.id !== id))
    setError(null)
    setNotice(null)
  }

  const handleDragStart = (event: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index)
    event.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, dropIndex: number) => {
    event.preventDefault()

    setFiles((previousFiles) => {
      if (draggedIndex === null || draggedIndex === dropIndex) {
        return previousFiles
      }

      const reorderedFiles = [...previousFiles]
      const [draggedFile] = reorderedFiles.splice(draggedIndex, 1)
      reorderedFiles.splice(dropIndex, 0, draggedFile)
      return reorderedFiles
    })

    setDraggedIndex(null)
  }

  const splitPDFs = async () => {
    if (!canProcess) {
      setError(currentMode.emptyStateError)
      return
    }

    setIsProcessing(true)
    setError(null)
    setNotice(null)
    setProgress(0)

    try {
      let totalPages = 0
      let processedPages = 0
      const sourceDocuments: Array<{ item: FileItem; pdf: PDFDocument; pageCount: number }> = []

      for (const item of files) {
        const pdf = await PDFDocument.load(await item.file.arrayBuffer())
        const pageCount = pdf.getPageCount()
        totalPages += pageCount
        sourceDocuments.push({ item, pdf, pageCount })
      }

      for (const { item, pdf, pageCount } of sourceDocuments) {
        const baseName = item.name.replace(/\.pdf$/i, "")

        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          const newPdf = await PDFDocument.create()
          const [copiedPage] = await newPdf.copyPages(pdf, [pageIndex])
          newPdf.addPage(copiedPage)

          const pdfBytes = await newPdf.save()
          downloadBlob(createPdfBlob(pdfBytes), `${baseName}_pagina_${pageIndex + 1}.pdf`)

          processedPages += 1
          updateProgress(processedPages, totalPages)
        }
      }

      setNotice(`Se generaron ${processedPages} PDF(s) a partir de ${files.length} archivo(s).`)
    } catch (processingError) {
      setError(getErrorMessage("No se pudieron separar los PDF.", processingError))
    } finally {
      setIsProcessing(false)
    }
  }

  const mergePDFs = async () => {
    if (!canProcess) {
      setError(currentMode.emptyStateError)
      return
    }

    setIsProcessing(true)
    setError(null)
    setNotice(null)
    setProgress(0)

    try {
      const mergedPdf = await PDFDocument.create()
      let processedFiles = 0

      for (const item of files) {
        const pdf = await PDFDocument.load(await item.file.arrayBuffer())
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))

        processedFiles += 1
        updateProgress(processedFiles, files.length)
      }

      const pdfBytes = await mergedPdf.save()
      downloadBlob(createPdfBlob(pdfBytes), "documento-unido.pdf")
      setNotice("PDF combinado generado correctamente.")
    } catch (processingError) {
      setError(getErrorMessage("No se pudieron unir los PDF.", processingError))
    } finally {
      setIsProcessing(false)
    }
  }

  const convertImagesToPDF = async () => {
    if (!canProcess) {
      setError(currentMode.emptyStateError)
      return
    }

    setIsProcessing(true)
    setError(null)
    setNotice(null)
    setProgress(0)

    try {
      const pdfDoc = await PDFDocument.create()
      let processedFiles = 0

      for (const item of files) {
        const fileBytes = await item.file.arrayBuffer()
        const mimeType = item.file.type.toLowerCase()

        const embeddedImage = mimeType.includes("png")
          ? await pdfDoc.embedPng(fileBytes)
          : mimeType.includes("jpeg") || mimeType.includes("jpg")
            ? await pdfDoc.embedJpg(fileBytes)
            : null

        if (!embeddedImage) {
          throw new Error(`Formato de imagen no compatible: ${item.name}`)
        }

        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height])
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: embeddedImage.width,
          height: embeddedImage.height,
        })

        processedFiles += 1
        updateProgress(processedFiles, files.length)
      }

      const pdfBytes = await pdfDoc.save()
      downloadBlob(createPdfBlob(pdfBytes), "imagenes-convertidas.pdf")
      setNotice("PDF generado correctamente a partir de las imágenes seleccionadas.")
    } catch (processingError) {
      setError(getErrorMessage("No se pudieron convertir las imágenes.", processingError))
    } finally {
      setIsProcessing(false)
    }
  }

  const processFiles = async () => {
    switch (mode) {
      case "merge":
        await mergePDFs()
        break
      case "split":
        await splitPDFs()
        break
      case "images-to-pdf":
        await convertImagesToPDF()
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">{currentMode.title}</h1>
          <p className="text-lg text-gray-600">{currentMode.description}</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <h2 className="mb-4 text-center text-sm font-medium">Selecciona el modo</h2>

              <div className="flex w-full max-w-3xl flex-col gap-4 sm:flex-row">
                {MODE_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isActive = option.value === mode

                  return (
                    <div key={option.value} className="flex-1">
                      <input
                        type="radio"
                        id={option.value}
                        name="mode"
                        value={option.value}
                        checked={isActive}
                        onChange={() => setMode(option.value)}
                        disabled={isProcessing}
                        className="sr-only"
                      />
                      <label
                        htmlFor={option.value}
                        className={`flex h-20 cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                          isActive ? option.selectedClasses : "border-gray-200 bg-white hover:border-gray-300"
                        } ${isProcessing ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? option.iconClasses : "text-gray-500"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{option.title}</div>
                          <div className="mt-1 text-xs text-gray-500">{option.shortTitle}</div>
                        </div>
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {currentMode.inputLabel}
            </CardTitle>
            <CardDescription>{currentMode.inputDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept={currentMode.accept}
                multiple
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="mt-1"
              />

              {error && <Alert>{error}</Alert>}
              {notice && <Alert variant="info">{notice}</Alert>}

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{currentMode.processingLabel}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {files.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-gray-900">Archivos seleccionados ({files.length})</h3>
                    <button
                      type="button"
                      onClick={clearAllFiles}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Limpiar todo
                    </button>
                  </div>

                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={file.id}
                        draggable={canReorder && !isProcessing}
                        onDragStart={(event) => handleDragStart(event, index)}
                        onDragEnd={() => setDraggedIndex(null)}
                        onDragOver={handleDragOver}
                        onDrop={(event) => handleDrop(event, index)}
                        className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {canReorder && <GripVertical className="h-4 w-4 flex-shrink-0 text-gray-400" />}

                          <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-sm font-medium ${currentMode.badgeClasses}`}
                          >
                            {index + 1}
                          </div>

                          {file.type === "image" ? (
                            <ImageIcon className="h-5 w-5 flex-shrink-0 text-green-600" />
                          ) : (
                            <FileText className="h-5 w-5 flex-shrink-0 text-red-600" />
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{file.sizeLabel}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          disabled={isProcessing}
                          className="rounded p-1 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Eliminar ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={() => void processFiles()}
                disabled={isProcessing || !canProcess}
                className="flex w-full items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isProcessing ? currentMode.processingLabel : currentMode.actionLabel}
              </Button>
            </div>
          </CardContent>
        </Card>

        <PDFSteps mode={mode} />
      </div>
    </div>
  )
}
