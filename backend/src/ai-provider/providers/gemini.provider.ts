import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AiProviderService } from '../ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProviderService {
  private readonly model = 'gemini-1.5-flash';

  constructor(private readonly configService: ConfigService) {}

  async summarize(text: string): Promise<string | null> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const genAI = new GoogleGenAI({ apiKey });

    const result = await genAI.models.generateContent({
      model: this.model,
      contents: this.buildPrompt(text),
    });

    const bio = result.text?.trim();
    if (!bio || bio === 'INSUFFICIENT_DATA') return null;
    return bio;
  }

  private buildPrompt(text: string): string {
    return `Bạn là biên tập viên nội dung cho nền tảng bán vé concert Việt Nam.

Từ tài liệu press kit dưới đây, hãy viết một đoạn giới thiệu nghệ sĩ/sự kiện:
- Độ dài: 100-150 từ tiếng Việt
- Tone: Hấp dẫn, tạo cảm giác muốn đến xem
- Format: 1 đoạn văn liền mạch, KHÔNG dùng bullet point
- Nếu không tìm thấy thông tin: chỉ trả về đúng chuỗi "INSUFFICIENT_DATA"

--- NỘI DUNG PRESS KIT ---
${text}`;
  }
}
