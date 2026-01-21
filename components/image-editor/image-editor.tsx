"use client"

import React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Upload,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Sun,
  Contrast,
  Palette,
  Undo2,
  Redo2,
  Download,
  X,
  Check,
  Maximize2,
  ImageIcon,
} from "lucide-react"

interface ImageState {
  brightness: number
  contrast: number
  saturation: number
  rotation: number
  flipH: boolean
  flipV: boolean
  filter: string
  crop: { x: number; y: number; width: number; height: number } | null
}

const defaultState: ImageState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  rotation: 0,
  flipH: false,
  flipV: false,
  filter: "none",
  crop: null,
}

const filters = [
  { name: "None", value: "none", css: "" },
  { name: "Grayscale", value: "grayscale", css: "grayscale(100%)" },
  { name: "Sepia", value: "sepia", css: "sepia(100%)" },
  { name: "Invert", value: "invert", css: "invert(100%)" },
  { name: "Blur", value: "blur", css: "blur(2px)" },
  { name: "Vintage", value: "vintage", css: "sepia(50%) contrast(90%) brightness(90%)" },
  { name: "Cool", value: "cool", css: "hue-rotate(180deg) saturate(80%)" },
  { name: "Warm", value: "warm", css: "sepia(30%) saturate(140%)" },
]

export function ImageEditor() {
  const [image, setImage] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [imageState, setImageState] = useState<ImageState>(defaultState)
  const [history, setHistory] = useState<ImageState[]>([defaultState])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isCropping, setIsCropping] = useState(false)
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null)
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null)
  const [resizeWidth, setResizeWidth] = useState<number>(0)
  const [resizeHeight, setResizeHeight] = useState<number>(0)
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 })
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const updateState = useCallback(
    (newState: Partial<ImageState>) => {
      const updatedState = { ...imageState, ...newState }
      setImageState(updatedState)
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(updatedState)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    },
    [imageState, history, historyIndex]
  )

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setImageState(history[historyIndex - 1])
    }
  }, [historyIndex, history])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setImageState(history[historyIndex + 1])
    }
  }, [historyIndex, history])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setImage(dataUrl)
        setOriginalImage(dataUrl)
        setImageState(defaultState)
        setHistory([defaultState])
        setHistoryIndex(0)

        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height })
          setResizeWidth(img.width)
          setResizeHeight(img.height)
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setImage(dataUrl)
        setOriginalImage(dataUrl)
        setImageState(defaultState)
        setHistory([defaultState])
        setHistoryIndex(0)

        const img = new window.Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height })
          setResizeWidth(img.width)
          setResizeHeight(img.height)
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const getFilterCss = () => {
    const filter = filters.find((f) => f.value === imageState.filter)
    const baseFilters = `brightness(${imageState.brightness}%) contrast(${imageState.contrast}%) saturate(${imageState.saturation}%)`
    return filter?.css ? `${baseFilters} ${filter.css}` : baseFilters
  }

  const getTransform = () => {
    let transform = `rotate(${imageState.rotation}deg)`
    if (imageState.flipH) transform += " scaleX(-1)"
    if (imageState.flipV) transform += " scaleY(-1)"
    return transform
  }

  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCropStart({ x, y })
    setCropEnd({ x, y })
  }

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropping || !cropStart) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setCropEnd({ x, y })
  }

  const handleCropMouseUp = () => {
    if (!cropStart || !cropEnd) return
  }

  const applyCrop = () => {
    if (!cropStart || !cropEnd || !image || !containerRef.current) return

    const imgElement = containerRef.current.querySelector("img")
    if (!imgElement) return

    const rect = imgElement.getBoundingClientRect()
    const scaleX = originalDimensions.width / rect.width
    const scaleY = originalDimensions.height / rect.height

    const cropX = Math.min(cropStart.x, cropEnd.x) * scaleX
    const cropY = Math.min(cropStart.y, cropEnd.y) * scaleY
    const cropWidth = Math.abs(cropEnd.x - cropStart.x) * scaleX
    const cropHeight = Math.abs(cropEnd.y - cropStart.y) * scaleY

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = cropWidth
    canvas.height = cropHeight

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
      const croppedDataUrl = canvas.toDataURL("image/png")
      setImage(croppedDataUrl)
      setOriginalImage(croppedDataUrl)
      setOriginalDimensions({ width: cropWidth, height: cropHeight })
      setResizeWidth(cropWidth)
      setResizeHeight(cropHeight)
      setIsCropping(false)
      setCropStart(null)
      setCropEnd(null)
    }
    img.src = image
  }

  const cancelCrop = () => {
    setIsCropping(false)
    setCropStart(null)
    setCropEnd(null)
  }

  const handleResize = () => {
    if (!image) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = resizeWidth
    canvas.height = resizeHeight

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      ctx.drawImage(img, 0, 0, resizeWidth, resizeHeight)
      const resizedDataUrl = canvas.toDataURL("image/png")
      setImage(resizedDataUrl)
      setOriginalImage(resizedDataUrl)
      setOriginalDimensions({ width: resizeWidth, height: resizeHeight })
    }
    img.src = image
  }

  const handleWidthChange = (value: string) => {
    const newWidth = parseInt(value) || 0
    setResizeWidth(newWidth)
    if (maintainAspectRatio && originalDimensions.width > 0) {
      const ratio = originalDimensions.height / originalDimensions.width
      setResizeHeight(Math.round(newWidth * ratio))
    }
  }

  const handleHeightChange = (value: string) => {
    const newHeight = parseInt(value) || 0
    setResizeHeight(newHeight)
    if (maintainAspectRatio && originalDimensions.height > 0) {
      const ratio = originalDimensions.width / originalDimensions.height
      setResizeWidth(Math.round(newHeight * ratio))
    }
  }

  const exportImage = (format: "png" | "jpeg" | "webp") => {
    if (!image) return

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const radians = (imageState.rotation * Math.PI) / 180
      const sin = Math.abs(Math.sin(radians))
      const cos = Math.abs(Math.cos(radians))
      const newWidth = img.width * cos + img.height * sin
      const newHeight = img.width * sin + img.height * cos

      canvas.width = newWidth
      canvas.height = newHeight

      ctx.translate(newWidth / 2, newHeight / 2)
      ctx.rotate(radians)
      if (imageState.flipH) ctx.scale(-1, 1)
      if (imageState.flipV) ctx.scale(1, -1)

      ctx.filter = getFilterCss()
      ctx.drawImage(img, -img.width / 2, -img.height / 2)

      const mimeType = `image/${format}`
      const quality = format === "jpeg" ? 0.92 : undefined
      const dataUrl = canvas.toDataURL(mimeType, quality)

      const link = document.createElement("a")
      link.download = `edited-image.${format}`
      link.href = dataUrl
      link.click()
    }
    img.src = image
  }

  const resetAll = () => {
    if (originalImage) {
      setImage(originalImage)
      setImageState(defaultState)
      setHistory([defaultState])
      setHistoryIndex(0)
    }
  }

  const getCropRect = () => {
    if (!cropStart || !cropEnd) return null
    return {
      left: Math.min(cropStart.x, cropEnd.x),
      top: Math.min(cropStart.y, cropEnd.y),
      width: Math.abs(cropEnd.x - cropStart.x),
      height: Math.abs(cropEnd.y - cropStart.y),
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-semibold text-foreground">Pixel Studio</h1>
          <p className="text-sm text-muted-foreground">Image Editor</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="adjust" className="w-full">
            <TabsList className="w-full grid grid-cols-4 bg-secondary/50 rounded-none border-b border-border">
              <TabsTrigger value="adjust" className="text-xs data-[state=active]:bg-accent">
                <Sun className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="transform" className="text-xs data-[state=active]:bg-accent">
                <RotateCw className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="filters" className="text-xs data-[state=active]:bg-accent">
                <Palette className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="resize" className="text-xs data-[state=active]:bg-accent">
                <Maximize2 className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="adjust" className="p-4 space-y-6 mt-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Brightness
                    </Label>
                    <span className="text-xs text-muted-foreground">{imageState.brightness}%</span>
                  </div>
                  <Slider
                    value={[imageState.brightness]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={([v]) => updateState({ brightness: v })}
                    disabled={!image}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-2">
                      <Contrast className="h-4 w-4" />
                      Contrast
                    </Label>
                    <span className="text-xs text-muted-foreground">{imageState.contrast}%</span>
                  </div>
                  <Slider
                    value={[imageState.contrast]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={([v]) => updateState({ contrast: v })}
                    disabled={!image}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Saturation
                    </Label>
                    <span className="text-xs text-muted-foreground">{imageState.saturation}%</span>
                  </div>
                  <Slider
                    value={[imageState.saturation]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={([v]) => updateState({ saturation: v })}
                    disabled={!image}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transform" className="p-4 space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-sm">Rotate</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateState({ rotation: imageState.rotation - 90 })}
                    disabled={!image}
                    className="flex flex-col items-center py-3"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="text-[10px] mt-1">-90°</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateState({ rotation: imageState.rotation + 90 })}
                    disabled={!image}
                    className="flex flex-col items-center py-3"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span className="text-[10px] mt-1">+90°</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateState({ flipH: !imageState.flipH })}
                    disabled={!image}
                    className={`flex flex-col items-center py-3 ${imageState.flipH ? "bg-accent" : ""}`}
                  >
                    <FlipHorizontal className="h-4 w-4" />
                    <span className="text-[10px] mt-1">Flip H</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => updateState({ flipV: !imageState.flipV })}
                    disabled={!image}
                    className={`flex flex-col items-center py-3 ${imageState.flipV ? "bg-accent" : ""}`}
                  >
                    <FlipVertical className="h-4 w-4" />
                    <span className="text-[10px] mt-1">Flip V</span>
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fine Rotation</Label>
                  <span className="text-xs text-muted-foreground">{imageState.rotation}°</span>
                </div>
                <Slider
                  value={[imageState.rotation]}
                  min={-180}
                  max={180}
                  step={1}
                  onValueChange={([v]) => updateState({ rotation: v })}
                  disabled={!image}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm">Crop</Label>
                {!isCropping ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsCropping(true)}
                    disabled={!image}
                    className="w-full"
                  >
                    <Crop className="h-4 w-4 mr-2" />
                    Start Cropping
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Click and drag on the image to select crop area
                    </p>
                    <div className="flex gap-2">
                      <Button variant="default" size="sm" onClick={applyCrop} className="flex-1">
                        <Check className="h-4 w-4 mr-1" />
                        Apply
                      </Button>
                      <Button variant="secondary" size="sm" onClick={cancelCrop} className="flex-1">
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="filters" className="p-4 mt-0">
              <div className="space-y-2">
                <Label className="text-sm">Filter Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {filters.map((filter) => (
                    <Button
                      key={filter.value}
                      variant="secondary"
                      size="sm"
                      onClick={() => updateState({ filter: filter.value })}
                      disabled={!image}
                      className={`${imageState.filter === filter.value ? "bg-accent ring-1 ring-foreground/20" : ""}`}
                    >
                      {filter.name}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="resize" className="p-4 space-y-4 mt-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Width (px)</Label>
                  <input
                    type="number"
                    value={resizeWidth}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    disabled={!image}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Height (px)</Label>
                  <input
                    type="number"
                    value={resizeHeight}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    disabled={!image}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintainAspectRatio}
                    onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="text-sm">Maintain aspect ratio</span>
                </label>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleResize}
                  disabled={!image}
                  className="w-full"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Apply Resize
                </Button>

                {originalDimensions.width > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Original: {originalDimensions.width} × {originalDimensions.height}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
              className="flex-1"
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Undo
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="flex-1"
            >
              <Redo2 className="h-4 w-4 mr-1" />
              Redo
            </Button>
          </div>

          <Button variant="secondary" size="sm" onClick={resetAll} disabled={!image} className="w-full">
            Reset All
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" disabled={!image} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => exportImage("png")}>
                Export as PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportImage("jpeg")}>
                Export as JPEG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportImage("webp")}>
                Export as WebP
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            {image && originalDimensions.width > 0 && (
              <span className="text-sm text-muted-foreground">
                {originalDimensions.width} × {originalDimensions.height} px
              </span>
            )}
          </div>

          {image && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>History: {historyIndex + 1}/{history.length}</span>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          className="flex-1 flex items-center justify-center p-8 bg-background overflow-hidden"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {!image ? (
            <div
              className="w-full max-w-2xl aspect-video border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-muted-foreground transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">Drop an image here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports PNG, JPG, GIF, WebP
              </p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative max-w-full max-h-full"
              onMouseDown={handleCropMouseDown}
              onMouseMove={handleCropMouseMove}
              onMouseUp={handleCropMouseUp}
              onMouseLeave={handleCropMouseUp}
              style={{ cursor: isCropping ? "crosshair" : "default" }}
            >
              <img
                src={image || "/placeholder.svg"}
                alt="Editing"
                className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-lg shadow-2xl"
                style={{
                  filter: getFilterCss(),
                  transform: getTransform(),
                }}
                draggable={false}
              />

              {/* Crop Overlay */}
              {isCropping && cropStart && cropEnd && (
                <>
                  <div className="absolute inset-0 bg-background/60 pointer-events-none" />
                  <div
                    className="absolute border-2 border-foreground bg-transparent pointer-events-none"
                    style={getCropRect() ? {
                      left: getCropRect()!.left,
                      top: getCropRect()!.top,
                      width: getCropRect()!.width,
                      height: getCropRect()!.height,
                    } : {}}
                  >
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-foreground rounded-full" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-foreground rounded-full" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-foreground rounded-full" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-foreground rounded-full" />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
