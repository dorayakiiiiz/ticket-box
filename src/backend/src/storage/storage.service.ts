import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly supabase: SupabaseClient;

  constructor(
    @InjectPinoLogger(StorageService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    // Khởi tạo Supabase client 1 lần duy nhất (singleton), tái sử dụng cho mọi request
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey = configService.getOrThrow<string>('SUPABASE_SECRET_KEY');
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        // Đảm bảo mọi request (kể cả Storage delete) đều gửi đúng Authorization header
        headers: { Authorization: `Bearer ${supabaseKey}` },
      },
    });
  }

  /**
   * Upload buffer lên Supabase Storage.
   * Tự tạo bucket nếu chưa tồn tại (idempotent).
   * Trả về public CDN URL của file đã upload.
   */
  async uploadImage(
    bucket: string,
    fileName: string,
    file: Express.Multer.File,
  ): Promise<string> {
    await this.ensureBucket(bucket);

    const { error: uploadErr } = await this.supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadErr) {
      this.logger.error(
        { uploadErr, bucket, fileName },
        'Failed to upload image to Supabase',
      );
      throw new InternalServerErrorException('Upload ảnh thất bại');
    }

    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  /**
   * Xóa file trên Supabase theo public URL.
   * Best-effort: không throw nếu file không tồn tại hoặc URL không hợp lệ.
   */
  async deleteImage(bucket: string, publicUrl: string): Promise<void> {
    // Lấy fileName từ URL pattern:
    // "https://xxx.supabase.co/storage/v1/object/public/{bucket}/{fileName}"
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIdx = publicUrl.indexOf(marker);
    if (markerIdx === -1) {
      this.logger.warn(
        { publicUrl, bucket },
        'GC: cannot parse fileName from publicUrl — skipping delete',
      );
      return;
    }

    const fileName = decodeURIComponent(
      publicUrl.slice(markerIdx + marker.length),
    );
    if (!fileName) return;

    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([fileName]);
    if (error) {
      // Không throw — log warning để trace, không block upload ảnh mới
      this.logger.warn(
        { error, bucket, fileName },
        'GC: failed to delete old image',
      );
    } else {
      this.logger.info(
        { bucket, fileName },
        'GC: old image deleted from Supabase',
      );
    }
  }

  /** Tạo bucket nếu chưa tồn tại (idempotent). */
  private async ensureBucket(bucket: string): Promise<void> {
    const { data: existingBucket } =
      await this.supabase.storage.getBucket(bucket);
    if (!existingBucket) {
      const { error: bucketErr } = await this.supabase.storage.createBucket(
        bucket,
        {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
          ],
        },
      );
      if (bucketErr) {
        this.logger.error(
          { bucketErr, bucket },
          'Failed to create Supabase bucket',
        );
        throw new InternalServerErrorException('Không thể tạo bucket storage');
      }
    }
  }
}
