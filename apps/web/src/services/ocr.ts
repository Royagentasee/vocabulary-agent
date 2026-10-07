/**
 * 拍照翻译：图片 OCR + AI 翻译
 */
import { config, fetchWithFallback } from '../config'

export interface OcrResult {
  ok: boolean
  text: string
  wordCount: number
  lineCount: number
  confidence: number
  quality: 'good' | 'fair' | 'poor'
}

export interface TranslateResult {
  translation: string
  summary: string
  vocabulary: { word: string; meaning: string }[]
}

/** 把手机原图压到适合上传的大小（长边 <= maxSide），显著加快上传 */
export async function compressImage(
  file: File,
  maxSide = 1800,
  quality = 0.85,
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), 'image/jpeg', quality),
    )
    // 压缩后反而更大（原图很小）就用原图
    return blob && blob.size < file.size ? blob : file
  } catch (e) {
    console.warn('[OCR] 图片压缩失败，改用原图', e)
    return file
  }
}

export async function ocrStatus(): Promise<{ available: boolean }> {
  const path = '/api/ocr/status'
  try {
    const resp = await fetchWithFallback(path, config.aiGateway ? `${config.aiGateway}${path}` : path, {
      method: 'GET',
    })
    if (!resp.ok) return { available: false }
    return resp.json()
  } catch {
    return { available: false }
  }
}

export async function recognizeImage(blob: Blob): Promise<OcrResult> {
  const path = '/api/ocr'
  const fd = new FormData()
  fd.append('file', blob, 'photo.jpg')

  const resp = await fetchWithFallback(path, config.aiGateway ? `${config.aiGateway}${path}` : path, {
    method: 'POST',
    body: fd,
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`识别失败 ${resp.status}: ${body.slice(0, 100)}`)
  }
  return resp.json()
}

export async function translateText(text: string): Promise<TranslateResult> {
  const path = '/api/ocr/translate'
  const resp = await fetchWithFallback(path, config.aiGateway ? `${config.aiGateway}${path}` : path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`翻译失败 ${resp.status}: ${body.slice(0, 100)}`)
  }
  return resp.json()
}
