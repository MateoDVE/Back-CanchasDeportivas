import { Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseStorageService } from './supabase-storage.service';

describe('SupabaseStorageService: contrato de almacenamiento', () => {
  const publicUrl = 'https://example.test/receipt';
  const upload = jest.fn();
  const getPublicUrl = jest.fn();
  const from = jest.fn();
  let service: SupabaseStorageService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    upload.mockReset().mockResolvedValue({ error: null });
    getPublicUrl.mockReset().mockReturnValue({ data: { publicUrl } });
    from.mockReset().mockReturnValue({ upload, getPublicUrl });
    service = new SupabaseStorageService({ storage: { from } } as unknown as SupabaseClient);
  });

  afterEach(() => jest.restoreAllMocks());

  it('rechaza datos vacíos antes de acceder a Storage', async () => {
    await expect(service.uploadFile('receipts', 'folder', '')).rejects.toThrow(
      'No se proporcionaron datos de archivo',
    );
    expect(from).not.toHaveBeenCalled();
  });

  it.each(['http://example.test/a', 'https://example.test/a'])(
    'conserva una URL existente: %s',
    async (url) => {
      await expect(service.uploadFile('receipts', 'folder', ` ${url} `)).resolves.toBe(url);
      expect(from).not.toHaveBeenCalled();
    },
  );

  it('conserva el modo local cuando no hay cliente configurado', async () => {
    const local = new SupabaseStorageService(null);
    await expect(local.uploadFile('receipts', 'folder', 'YQ==', 'demo')).resolves.toBe(
      'https://storage.mock.local/receipts/folder/demo.png',
    );
  });

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/svg+xml', 'svg'],
    ['application/pdf', 'pdf'],
    ['image', 'png'],
  ])('decodifica Data URL %s y conserva extensión %s', async (mime, extension) => {
    await expect(service.uploadFile('receipts', 'folder', `data:${mime};base64,YQ==`))
      .resolves.toBe(publicUrl);
    expect(from).toHaveBeenCalledWith('receipts');
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^folder/receipt-.*\\.${extension}$`)),
      Buffer.from('a'),
      { contentType: mime, upsert: true },
    );
  });

  it.each([
    [[0xff, 0xd8, 0xff, 0x00], 'image/jpeg', 'jpg'],
    [[0x89, 0x50, 0x4e, 0x47], 'image/png', 'png'],
    [[0x52, 0x49, 0x46, 0x46], 'image/webp', 'webp'],
    [[0xff, 0xd8, 0xff], 'image/png', 'png'],
    [[0x00, 0x01, 0x02, 0x03], 'image/png', 'png'],
  ] as const)('conserva la detección de bytes %j', async (bytes, mime, extension) => {
    const buffer = Buffer.from(bytes);
    await service.uploadFile('receipts', 'folder', buffer.toString('base64'));
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`\\.${extension}$`)),
      buffer,
      { contentType: mime, upsert: true },
    );
  });

  it('respeta el nombre personalizado y las barras interiores', async () => {
    await service.uploadFile('receipts', '///a//b///', 'YQ==', 'custom.jpg');
    expect(upload).toHaveBeenCalledWith('a//b/custom.jpg', Buffer.from('a'), {
      contentType: 'image/png', upsert: true,
    });
  });

  it('propaga un error de subida sin pedir la URL pública', async () => {
    upload.mockResolvedValue({ error: { message: 'denegado' } });
    await expect(service.uploadFile('receipts', 'folder', 'YQ==')).rejects.toThrow(
      'Error al subir imagen a Supabase Storage: denegado',
    );
    expect(getPublicUrl).not.toHaveBeenCalled();
  });

  it.each([null, {}])('rechaza una respuesta sin URL pública: %j', async (data) => {
    getPublicUrl.mockReturnValue({ data });
    await expect(service.uploadFile('receipts', 'folder', 'YQ==')).rejects.toThrow(
      'No se pudo obtener la URL pública',
    );
  });
});
