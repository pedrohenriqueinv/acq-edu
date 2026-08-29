import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configura worker do PDF.js para navegadores
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface ParsedDocumentResult {
  fileName: string;
  fileType: 'pdf' | 'docx' | 'txt';
  text: string;
  pageCount?: number;
}

/**
 * Lê e extrai todo o texto de um arquivo PDF ou Word (.docx) ou Texto (.txt)
 */
export async function parseDocumentFile(file: File): Promise<ParsedDocumentResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return {
      fileName: file.name,
      fileType: 'docx',
      text: result.value.trim(),
    };
  }

  if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += `\n--- PÁGINA ${pageNum} ---\n` + pageText;
    }

    return {
      fileName: file.name,
      fileType: 'pdf',
      text: fullText.trim(),
      pageCount: numPages,
    };
  }

  if (extension === 'txt' || extension === 'csv') {
    const text = await file.text();
    return {
      fileName: file.name,
      fileType: 'txt',
      text: text.trim(),
    };
  }

  throw new Error(`Formato de arquivo não suportado (.${extension}). Por favor, envie arquivos em formato .docx (Word), .pdf ou .txt.`);
}
