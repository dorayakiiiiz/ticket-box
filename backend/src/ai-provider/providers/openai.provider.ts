import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderService } from '../ai-provider.interface';

// Stub — chưa implement, thêm package 'openai' khi cần dùng
@Injectable()
export class OpenAiProvider implements AiProviderService {
  constructor(private readonly configService: ConfigService) {}

  async summarize(_text: string): Promise<string | null> {
    throw new Error('OpenAI provider chưa được cài đặt. Cần npm i openai và implement.');
  }
}
