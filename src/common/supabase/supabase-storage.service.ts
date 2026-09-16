import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase.provider';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient | null,
  ) {}

  /**
   * Sube un archivo a un bucket de Supabase Storage y retorna la URL pública.
   * Soporta Data URLs en formato Base64 (data:image/...;base64,...), Base64 puro, o URLs existentes.
   */
  async uploadFile(
    bucket: string,
    folder: string,
    fileData: string,
    customFilename?: string,
  ): Promise<string> {
    if (!fileData) {
      throw new Error('No se proporcionaron datos de archivo para subir.');
    }

    const trimmedData = fileData.trim();

    // Si ya es una URL web completa (http o https), devolverla intacta
    if (trimmedData.startsWith('http://') || trimmedData.startsWith('https://')) {
      return trimmedData;
    }

    // Si el cliente de Supabase no está configurado (modo In-Memory o pruebas locales)
    if (!this.supabase) {
      this.logger.warn('Supabase no está configurado. Retornando URL simulada de almacenamiento.');
      return `https://storage.mock.local/${bucket}/${folder}/${customFilename || Date.now()}.png`;
    }

    const { buffer, contentType, extension } = this.decodeFile(trimmedData);

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filename = customFilename || `receipt-${uniqueId}.${extension}`;
    const cleanFolder = this.trimFolderSlashes(folder);
    const storagePath = `${cleanFolder}/${filename}`;

    this.logger.log(
      `Subiendo comprobante a Supabase Storage: bucket='${bucket}', ruta='${storagePath}', mime='${contentType}', tamaño=${buffer.length} bytes`,
    );

    const { error: uploadError } = await this.supabase.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      this.logger.error(`Error al subir a Supabase Storage: ${uploadError.message}`);
      throw new Error(`Error al subir imagen a Supabase Storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('No se pudo obtener la URL pública de la imagen en Supabase Storage.');
    }

    this.logger.log(`Comprobante almacenado con éxito: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
  }

  private trimFolderSlashes(folder: string): string {
    let start = 0;
    let end = folder.length;
    while (start < end && folder[start] === '/') start++;
    while (end > start && folder[end - 1] === '/') end--;
    return folder.slice(start, end);
  }

  private decodeFile(fileData: string): {
    buffer: Buffer;
    contentType: string;
    extension: string;
  } {
    const dataUrlMatch = fileData.match(/^data:([a-zA-Z0-9\+\-\.\/]+);base64,(.+)$/s);
    if (dataUrlMatch && dataUrlMatch.length === 3) {
      const contentType = dataUrlMatch[1];
      return {
        buffer: Buffer.from(dataUrlMatch[2], 'base64'),
        contentType,
        extension: this.extensionFromMime(contentType),
      };
    }

    const buffer = Buffer.from(fileData, 'base64');
    return { buffer, ...this.detectImageType(buffer) };
  }

  private extensionFromMime(contentType: string): string {
    const subtype = contentType.split('/')[1];
    if (!subtype) return 'png';
    return subtype === 'jpeg' ? 'jpg' : subtype.replace(/\+xml$/, '').split(';')[0];
  }

  private detectImageType(buffer: Buffer): { contentType: string; extension: string } {
    // Se conserva la detección histórica, incluido el mínimo de cuatro bytes.
    const signatures = [
      { bytes: [0xff, 0xd8, 0xff], contentType: 'image/jpeg', extension: 'jpg' },
      { bytes: [0x89, 0x50, 0x4e, 0x47], contentType: 'image/png', extension: 'png' },
      { bytes: [0x52, 0x49, 0x46, 0x46], contentType: 'image/webp', extension: 'webp' },
    ];
    if (buffer.length >= 4) {
      const match = signatures.find(({ bytes }) =>
        bytes.every((byte, index) => buffer[index] === byte),
      );
      if (match) return { contentType: match.contentType, extension: match.extension };
    }
    return { contentType: 'image/png', extension: 'png' };
  }
}
