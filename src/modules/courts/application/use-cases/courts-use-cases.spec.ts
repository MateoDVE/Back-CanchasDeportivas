import { GetAllCourtsUseCase } from './get-all-courts.use-case';
import { GetCourtByIdUseCase } from './get-court-by-id.use-case';
import { Court } from '../../domain/entities/court.entity';
import { InMemoryCourtRepository } from '../../infrastructure/repositories/in-memory-court.repository';

describe('Courts Use Cases', () => {
  let courtRepo: InMemoryCourtRepository;
  let getAllCourtsUseCase: GetAllCourtsUseCase;
  let getCourtByIdUseCase: GetCourtByIdUseCase;

  beforeEach(async () => {
    courtRepo = new InMemoryCourtRepository();
    await courtRepo.save(new Court(1, 1, "Cancha de prueba", "Futsal", 100, true));
    getAllCourtsUseCase = new GetAllCourtsUseCase(courtRepo);
    getCourtByIdUseCase = new GetCourtByIdUseCase(courtRepo);
  });

  it('should return all active courts', async () => {
    const courts = await getAllCourtsUseCase.execute(true);
    expect(courts.length).toBeGreaterThan(0);
    expect(courts[0]).toHaveProperty('id');
    expect(courts[0]).toHaveProperty('name');
    expect(courts[0]).toHaveProperty('pricePerHour');
  });

  it('should return a court by its id', async () => {
    const court = await getCourtByIdUseCase.execute(1);
    expect(court).toBeDefined();
    expect(court.id).toBe(1);
    expect(court.name).toContain('Cancha');
  });

  it('should throw error if court does not exist', async () => {
    await expect(getCourtByIdUseCase.execute(9999)).rejects.toThrow();
  });
});
