import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_PROVIDER, AiProviderService } from './ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { GroqProvider } from './providers/groq.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: (configService: ConfigService): AiProviderService => {
        const provider = configService.get<string>('AI_PROVIDER', 'groq');
        switch (provider) {
          case 'gemini':
            return new GeminiProvider(configService);
          case 'openai':
            return new OpenAiProvider(configService);
          case 'groq':
          default:
            return new GroqProvider(configService);
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiProviderModule {}
