import { SupabaseScheduleRepository } from './supabase-schedule.repository';

describe('Weekly schedule persistence', () => {
  const row = (day: number) => ({ id: day, court_id: 1, day_of_week: day, specific_date: null, open_time: '08:00', close_time: '23:00' });
  function setup(results: any[]) {
    const calls: any[] = [];
    const db = { from: jest.fn(() => {
      const result = results.shift();
      const chain: any = { then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject) };
      for (const method of ['select', 'eq', 'not', 'update', 'insert', 'delete', 'in', 'order', 'limit']) chain[method] = jest.fn(() => chain);
      chain.single = chain.maybeSingle = () => Promise.resolve(result);
      calls.push(chain);
      return chain;
    }) };
    return { repo: new SupabaseScheduleRepository(db as any), calls };
  }
  it('closes Monday only after saving Tuesday through Sunday, retaining their IDs', async () => {
    const all = Array.from({ length: 7 }, (_, i) => row(i + 1));
    const { repo, calls } = setup([{ data: all, error: null }, ...all.slice(1).map(data => ({ data, error: null })), { error: null }]);
    const result = await repo.setWeeklySchedules(1, all.slice(1).map(r => ({ dayOfWeek: r.day_of_week, openTime: r.open_time, closeTime: r.close_time })));
    expect(result.map(r => r.dayOfWeek)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(calls[7].in).toHaveBeenCalledWith('id', [1]);
    expect(calls.slice(0, 7).every(call => call.delete.mock.calls.length === 0)).toBe(true);
  });
  it('assigns an ID for legacy schemas without a generated default', async () => {
    const { repo, calls } = setup([
      { data: [], error: null }, { data: null, error: { code: '23502', message: 'null value in column "id"' } },
      { data: { id: 10 }, error: null }, { data: { ...row(1), id: 11 }, error: null },
    ]);
    await repo.setWeeklySchedules(1, [{ dayOfWeek: 1, openTime: '08:00', closeTime: '23:00' }]);
    expect(calls[3].insert).toHaveBeenCalledWith(expect.objectContaining({ id: 11, day_of_week: 1 }));
  });
  it('does not delete existing days when saving a new day fails', async () => {
    const { repo, calls } = setup([{ data: [row(1)], error: null }, { data: null, error: { code: '23514', message: 'Invalid schedule' } }]);
    await expect(repo.setWeeklySchedules(1, [{ dayOfWeek: 2, openTime: '08:00', closeTime: '23:00' }])).rejects.toThrow();
    expect(calls.every(call => call.delete.mock.calls.length === 0)).toBe(true);
  });
  it('recovers from an out-of-sync ID sequence and retries a concurrent ID collision', async () => {
    const collision = { code: '23505', message: 'duplicate key value violates unique constraint "court_schedules_pkey"' };
    const { repo, calls } = setup([
      { data: [], error: null }, { data: null, error: collision },
      { data: { id: 35 }, error: null }, { data: null, error: collision },
      { data: { id: 36 }, error: null }, { data: { ...row(1), id: 37 }, error: null },
    ]);
    const saved = await repo.setWeeklySchedules(1, [{ dayOfWeek: 1, openTime: '08:00', closeTime: '23:00' }]);
    expect(calls[3].insert).toHaveBeenCalledWith(expect.objectContaining({ id: 36 }));
    expect(calls[5].insert).toHaveBeenCalledWith(expect.objectContaining({ id: 37 }));
    expect(saved).toHaveLength(1);
  });
  it('does not retry unique constraints unrelated to IDs', async () => {
    const { repo, calls } = setup([
      { data: [], error: null },
      { data: null, error: { code: '23505', message: 'duplicate key violates unique constraint "court_day_unique"' } },
    ]);
    await expect(repo.setWeeklySchedules(1, [{ dayOfWeek: 1, openTime: '08:00', closeTime: '23:00' }])).rejects.toThrow();
    expect(calls).toHaveLength(2);
  });
});
