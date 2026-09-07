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

    let buffer: Buffer;
    let contentType = 'image/png';
    let extension = 'png';

    // Verificar si es un Data URL: data:image/jpeg;base64,/9j/4AAQSk...
    const dataUrlMatch = trimmedData.match(/^data:([a-zA-Z0-9\+\-\.\/]+);base64,(.+)$/s);

    if (dataUrlMatch && dataUrlMatch.length === 3) {
      contentType = dataUrlMatch[1];
      const base64Body = dataUrlMatch[2];
      buffer = Buffer.from(base64Body, 'base64');

      const mimeSubtype = contentType.split('/')[1];
      if (mimeSubtype) {
        extension = mimeSubtype === 'jpeg' ? 'jpg' : mimeSubtype.replace(/\+xml$/, '').split(';')[0];
      }
    } else {
      // Base64 plano sin prefijo data:
      buffer = Buffer.from(trimmedData, 'base64');
      // Detección simple por magic bytes en buffer
      if (buffer.length >= 4) {
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
          contentType = 'image/jpeg';
          extension = 'jpg';
        } else if (
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47
        ) {
          contentType = 'image/png';
          extension = 'png';
        } else if (
          buffer[0] === 0x52 &&
          buffer[1] === 0x49 &&
          buffer[2] === 0x46 &&
          buffer[3] === 0x46
        ) {
          contentType = 'image/webp';
          extension = 'webp';
        }
      }
    }

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filename = customFilename || `receipt-${uniqueId}.${extension}`;
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
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
}
