import { SupabaseCashShiftRepository } from './supabase-cash-shift.repository';
import { CashShift } from '../../domain/entities/cash-shift.entity';

describe('Cash shift persistence', () => {
  function repository(result: any) {
    const query: any = {};
    for (const method of ['insert', 'select', 'eq']) query[method] = jest.fn(() => query);
    query.single = jest.fn(async () => result);
    query.maybeSingle = jest.fn(async () => result);
    return { repo: new SupabaseCashShiftRepository({ from: () => query } as any), query };
  }
  const shift = () => new CashShift(0, 'secretary', '2026-09-08', 100, 50, 150, 100, 0, 'Sin novedades', true, new Date());

  it('reports a missing schema as actionable 503 instead of a generic 500', async () => {
    const { repo } = repository({ data: null, error: { code: 'PGRST204', message: 'Column not found' } });
    await expect(repo.save(shift())).rejects.toMatchObject({ status: 503 });
  });
  it('does not interpret a failed read as a missing shift', async () => {
    const { repo } = repository({ data: null, error: { code: '42703', message: 'Missing column' } });
    await expect(repo.findBySecretaryAndDate('secretary', '2026-09-08')).rejects.toMatchObject({ status: 503 });
  });
  it('saves the cash and QR breakdown and reads back the closed state', async () => {
    const { repo, query } = repository({ error: null, data: {
      id: 1, secretary_id: 'secretary', shift_date: '2026-09-08', total_system_cash: 100,
      total_system_qr: 50, total_system: 150, total_declared_cash: 100, difference: 0,
      notes: 'Sin novedades', is_closed: true, closed_at: '2026-09-09T02:00:00Z', created_at: '2026-09-09T02:00:00Z',
    } });
    const saved = await repo.save(shift());
    expect(saved.isClosed).toBe(true);
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ total_system_cash: 100, total_system_qr: 50, total_declared_cash: 100, difference: 0 }));
  });
});
