import { InMemoryCourtRepository } from '../../infrastructure/repositories/in-memory-court.repository';
import { InMemoryComplexRepository } from '../../../complexes/infrastructure/repositories/in-memory-complex.repository';
import { Court } from '../../domain/entities/court.entity';
import { Complex } from '../../../complexes/domain/entities/complex.entity';
import { CalculateReservationCostUseCase } from './calculate-reservation-cost.use-case';
import { GetCourtsByComplexUseCase } from './get-courts-by-complex.use-case';
import { ToggleCourtStatusUseCase } from './toggle-court-status.use-case';
import { UpdateCourtPriceUseCase } from './update-court-price.use-case';
import { ToggleComplexStatusUseCase } from '../../../complexes/application/use-cases/toggle-complex-status.use-case';
import { UpdateBusinessInfoUseCase } from '../../../complexes/application/use-cases/update-business-info.use-case';
import { GetComplexQrUseCase } from '../../../complexes/application/use-cases/get-complex-qr.use-case';

describe('Administración de canchas y complejos', () => {
  let courts: InMemoryCourtRepository;
  let complexes: InMemoryComplexRepository;
  beforeEach(async () => {
    courts = new InMemoryCourtRepository();
    complexes = new InMemoryComplexRepository();
    await complexes.save(
      new Complex(1, 'Complejo', 'La Paz', '70000000', 'qr.png'),
    );
    await courts.save(new Court(1, 1, 'Norte', 'Futsal', 100));
    await courts.save(new Court(2, 1, 'Sur', 'Tenis', 80, false));
  });
  it.each([NaN, Infinity, 0, 0.25, 0.75])(
    'rechaza duración inválida %s',
    async (duration) => {
      await expect(
        new CalculateReservationCostUseCase(courts).execute(1, duration),
      ).rejects.toThrow('duración');
    },
  );
  it('cotiza media hora y rechaza cancha ausente', async () => {
    const useCase = new CalculateReservationCostUseCase(courts);
    expect(await useCase.execute(1, 0.5)).toMatchObject({
      totalPrice: 50,
      advanceRequired: 12.5,
      pendingBalance: 37.5,
    });
    await expect(useCase.execute(99, 1)).rejects.toThrow('no existe');
  });
  it('filtra canchas activas y permite consultar todas las del complejo', async () => {
    const useCase = new GetCourtsByComplexUseCase(courts, complexes);
    expect((await useCase.execute(1)).map((c) => c.id)).toEqual([1]);
    expect((await useCase.execute(1, false)).map((c) => c.id)).toEqual([1, 2]);
    await expect(useCase.execute(99)).rejects.toThrow('no existe');
  });
  it('alterna disponibilidad de cancha y complejo y rechaza identificadores ausentes', async () => {
    const court = new ToggleCourtStatusUseCase(courts);
    expect(await court.execute(1)).toMatchObject({ isActive: false });
    expect(await court.execute(1)).toMatchObject({ isActive: true });
    await expect(court.execute(99)).rejects.toThrow('no existe');
    const complex = new ToggleComplexStatusUseCase(complexes);
    expect(await complex.execute(1)).toMatchObject({ isActive: false });
    expect(await complex.execute(1)).toMatchObject({ isActive: true });
    await expect(complex.execute(99)).rejects.toThrow('no existe');
  });
  it.each([0, -1, NaN])(
    'rechaza tarifa %s sin cambiar la vigente',
    async (price) => {
      await expect(
        new UpdateCourtPriceUseCase(courts).execute({
          courtId: 1,
          newPricePerHour: price,
        }),
      ).rejects.toThrow('precio');
      expect((await courts.findById(1))?.pricePerHour).toBe(100);
    },
  );
  it('actualiza y redondea tarifa y rechaza cancha ausente', async () => {
    const useCase = new UpdateCourtPriceUseCase(courts);
    expect(
      await useCase.execute({ courtId: 1, newPricePerHour: 80.256 }),
    ).toMatchObject({ pricePerHour: 80.26 });
    await expect(
      useCase.execute({ courtId: 99, newPricePerHour: 80 }),
    ).rejects.toThrow('no existe');
  });
  it('actualiza datos comerciales y consulta QR sin alterar su valor', async () => {
    const info = new UpdateBusinessInfoUseCase(complexes);
    expect(
      await info.execute({
        complexId: 1,
        businessName: ' Nuevo ',
        location: ' Centro ',
        contactInfo: ' 71111111 ',
      }),
    ).toMatchObject({
      name: 'Nuevo',
      location: 'Centro',
      contactInfo: '71111111',
      paymentQrUrl: 'qr.png',
    });
    await expect(
      info.execute({
        complexId: 99,
        businessName: '',
        location: '',
        contactInfo: '',
      }),
    ).rejects.toThrow('no fue encontrado');
    const qr = new GetComplexQrUseCase(complexes);
    expect(await qr.execute(1)).toEqual({
      complexId: 1,
      complexName: 'Nuevo',
      contactInfo: '71111111',
      paymentQrUrl: 'qr.png',
    });
    await expect(qr.execute(99)).rejects.toThrow('no existe');
  });
});
