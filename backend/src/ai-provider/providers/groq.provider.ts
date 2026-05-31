import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { AiProviderService } from '../ai-provider.interface';

@Injectable()
export class GroqProvider implements AiProviderService {
  // Llama 3 70B — nhanh, chất lượng tốt, free tier rộng rãi
  private readonly model = 'llama-3.3-70b-versatile';

  constructor(private readonly configService: ConfigService) {}

  async summarize(text: string): Promise<string | null> {
    const groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });

    const response = await groq.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: this.systemPrompt() },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: 512,
    });

    const bio = response.choices[0]?.message?.content?.trim();
    if (!bio || bio === 'INSUFFICIENT_DATA') return null;
    return bio;
  }

  private systemPrompt(): string {
    return `Bạn là biên tập viên nội dung cho nền tảng bán vé concert Việt Nam.

Từ tài liệu press kit người dùng gửi, hãy viết một đoạn giới thiệu nghệ sĩ/sự kiện:
- Độ dài: 100-150 từ tiếng Việt
- Tone: Hấp dẫn, tạo cảm giác muốn đến xem
- Format: 1 đoạn văn liền mạch, KHÔNG dùng bullet point
- Nếu không tìm thấy thông tin: chỉ trả về đúng chuỗi "INSUFFICIENT_DATA"`;
  }
}
