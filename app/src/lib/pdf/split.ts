import { PDFDocument } from 'pdf-lib'

export interface PageRange {
  startPage: number  // 1-indexed
  endPage: number    // 1-indexed, inclusive
}

export async function splitPdfByPageRanges(
  buffer: Buffer,
  ranges: PageRange[]
): Promise<Buffer[]> {
  const sourcePdf = await PDFDocument.load(buffer)
  const results: Buffer[] = []

  for (const range of ranges) {
    const newDoc = await PDFDocument.create()
    const pageIndices = Array.from(
      { length: range.endPage - range.startPage + 1 },
      (_, i) => range.startPage - 1 + i
    )
    const copiedPages = await newDoc.copyPages(sourcePdf, pageIndices)
    copiedPages.forEach((page) => newDoc.addPage(page))
    const bytes = await newDoc.save()
    results.push(Buffer.from(bytes))
  }

  return results
}
