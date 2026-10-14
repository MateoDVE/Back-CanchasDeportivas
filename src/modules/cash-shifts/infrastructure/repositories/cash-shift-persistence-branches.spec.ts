import { supabaseStub } from '../../../../../test/support/supabase.stub';
import { SupabaseCashShiftRepository } from './supabase-cash-shift.repository';
import { CashShift } from '../../domain/entities/cash-shift.entity';

describe('Persistencia de cierres: compatibilidad y errores', () => {
  let stub: ReturnType<typeof supabaseStub>;
  let repo: SupabaseCashShiftRepository;
  const row = {
    id: 1,
    secretary_id: 'staff',
    shift_date: '2026-10-14',
    total_system_cash: '100',
    total_system_qr: '50',
    total_system: '150',
    total_declared_cash: '99',
    difference: '-1',
    notes: 'Faltante',
    is_closed: true,
    closed_at: '2026-10-14T12:00:00Z',
    created_at: '2026-10-14T10:00:00Z',
  };
  beforeEach(() => {
    stub = supabaseStub();
    repo = new SupabaseCashShiftRepository(stub.client as never);
  });
  it.each(['id', 'secretary'] as const)(
    'busca por %s, devuelve null sin registro y traduce fallos',
    async (kind) => {
      const find = () =>
        kind === 'id'
          ? repo.findById(1)
          : repo.findBySecretaryAndDate('staff', '2026-10-14');
      stub.response.data = row;
      expect(await find()).toMatchObject({
        totalSystemCash: 100,
        totalSystemQr: 50,
        totalSystem: 150,
        totalDeclaredCash: 99,
        difference: -1,
        isClosed: true,
        closedAt: new Date(row.closed_at),
      });
      stub.response.data = null;
      expect(await find()).toBeNull();
      stub.response.error = { message: 'fallo' };
      await expect(find()).rejects.toThrow('fallo');
    },
  );
  it.each(['PGRST204', '42703', '42P01', '23505', 'OTHER'])(
    'traduce código %s',
    async (code) => {
      stub.response.error = { code, message: 'fallo' };
      await expect(repo.findById(1)).rejects.toThrow(
        code === '23505'
          ? 'Ya existe un cierre'
          : code === 'OTHER'
            ? 'fallo'
            : 'requiere actualizar la base de datos',
      );
    },
  );
  it('interpreta campos históricos, fechas alternativas y totales ausentes', async () => {
    stub.response.data = {
      id: 1,
      secretary_id: 'staff',
      shift_date: '2026-10-14',
    };
    expect(await repo.findById(1)).toMatchObject({
      totalSystemCash: 0,
      totalSystemQr: 0,
      totalSystem: 0,
      totalDeclaredCash: 0,
      difference: 0,
      isClosed: false,
      closedAt: null,
      createdAt: new Date('2026-10-14'),
    });
    stub.response.data = {
      id: 1,
      secretary_id: 'staff',
      shift_date: '2026-10-14',
      total_declared: '25',
      closed_at: row.closed_at,
    };
    expect(await repo.findById(1)).toMatchObject({
      totalDeclaredCash: 25,
      isClosed: true,
      createdAt: new Date(row.closed_at),
    });
  });
  it.each(['all', 'range'] as const)(
    'lista %s y conserva resultados vacíos ante error',
    async (kind) => {
      const find = () =>
        kind === 'all'
          ? repo.findAll()
          : repo.findByDateRange('2026-10-01', '2026-10-31');
      stub.response.data = [row];
      expect(await find()).toEqual([
        expect.objectContaining({ id: 1, difference: -1 }),
      ]);
      stub.response.data = null;
      expect(await find()).toEqual([]);
      stub.response.error = { message: 'fallo' };
      expect(await find()).toEqual([]);
    },
  );
  it('guarda y actualiza turnos abiertos y cerrados, sin aceptar respuestas incompletas', async () => {
    const shift = new CashShift(1, 'staff', '2026-10-14', 100, 50, 150, 99, -1);
    stub.response.data = row;
    expect(await repo.save(shift)).toMatchObject({
      id: 1,
      totalDeclaredCash: 99,
    });
    expect(stub.query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ closed_at: null, is_closed: false }),
    );
    await repo.update(shift);
    expect(stub.query.update).toHaveBeenCalledWith(
      expect.objectContaining({ closed_at: null }),
    );
    shift.close(100);
    await repo.save(shift);
    await repo.update(shift);
    expect(stub.query.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        closed_at: shift.closedAt!.toISOString(),
        is_closed: true,
      }),
    );
    stub.response.data = null;
    await expect(repo.save(shift)).rejects.toThrow('no devolvió');
    stub.response.error = { message: 'fallo' };
    await expect(repo.save(shift)).rejects.toThrow('fallo');
    await expect(repo.update(shift)).rejects.toThrow('fallo');
  });
});
