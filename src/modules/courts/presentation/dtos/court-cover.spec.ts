import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateCourtDto } from './update-court.dto';
import { Court } from '../../domain/entities/court.entity';
import { InMemoryCourtRepository } from '../../infrastructure/repositories/in-memory-court.repository';
import { UpdateCourtUseCase } from '../../application/use-cases/update-court.use-case';

describe('Court covers and padel', () => {
  it('normalizes Pádel and accepts a supported image', async () => {
    const dto = plainToInstance(UpdateCourtDto, { courtType: 'Pádel', images: ['data:image/png;base64,aGVsbG8='] });
    expect(dto.courtType).toBe('Padel');
    expect(await validate(dto)).toHaveLength(0);
  });
  it('rejects unsafe image schemes and multiple covers', async () => {
    for (const images of [['javascript:alert(1)'], ['data:image/svg+xml;base64,AAAA'], ['https://example.com/a.png', 'https://example.com/b.png']]) {
      expect((await validate(plainToInstance(UpdateCourtDto, { images }))).length).toBeGreaterThan(0);
    }
  });
  it('persists a cover, preserves it during price updates, and removes it explicitly', async () => {
    const repo = new InMemoryCourtRepository();
    await repo.save(new Court(1, 1, "Cancha de prueba", "Futsal", 100, true));
    const update = new UpdateCourtUseCase(repo);
    await update.execute({ id: 1, images: ['https://example.com/court.jpg'], courtType: 'Padel' });
    const priced = await update.execute({ id: 1, pricePerHour: 150 });
    expect(priced.images).toEqual(['https://example.com/court.jpg']);
    expect(priced.courtType).toBe('Padel');
    expect((await update.execute({ id: 1, images: [] })).images).toEqual([]);
  });
});
