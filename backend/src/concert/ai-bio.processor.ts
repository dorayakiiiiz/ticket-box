import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import type { Repository } from 'typeorm';
import { Concert } from '../entities/concert.entity';
import { AI_PROVIDER } from '../ai-provider/ai-provider.interface';
import type { AiProviderService } from '../ai-provider/ai-provider.interface';
import { cleanPdfText } from '../ai-provider/utils/clean-pdf-text';

// pdf-parse v1 export default function
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

type PdfBioJobData = { concertId: string; pdfBuffer: string };

@Processor('ticketbox.concert.ai-bio')
export class AiBioProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Concert) private readonly concertRepo: Repository<Concert>,
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProviderService,
  ) {
    super();
  }

  async process(job: Job<PdfBioJobData>) {
    const { concertId, pdfBuffer } = job.data;

    try {
      // pdf-parse v1: pdfParse(buffer) → { text }
      const buffer = Buffer.from(pdfBuffer, 'base64');
      const { text: rawText } = await pdfParse(buffer);
      const cleanText = cleanPdfText(rawText);

      console.log(`[AiBioProcessor] Extracted ${cleanText.length} chars for concert ${concertId}`);

      const bio = await this.aiProvider.summarize(cleanText);

      await this.concertRepo.update(concertId, {
        aiBio: bio ?? undefined,
        aiBioStatus: bio ? 'DONE' : 'FAILED',
      });

      console.log(`[AiBioProcessor] Concert ${concertId} → ${bio ? 'DONE' : 'FAILED'}`);
    } catch (error) {
      console.error(`[AiBioProcessor] Job ${job.id} failed for concert ${concertId}:`, error);
      await this.concertRepo.update(concertId, { aiBioStatus: 'FAILED' });
      throw error;
    }
  }
}

