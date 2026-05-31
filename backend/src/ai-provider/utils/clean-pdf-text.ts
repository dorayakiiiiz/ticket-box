export function cleanPdfText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')             // Chuẩn hóa newline về \n
    .replace(/[^\S\n]+/g, ' ')          // Collapse khoảng trắng (trừ newline)
    .replace(/\n{3,}/g, '\n\n')         // Tối đa 2 newline liên tiếp
    .trim()
    .slice(0, 8000);                    // Giới hạn ~2000 tokens để tiết kiệm quota
}
