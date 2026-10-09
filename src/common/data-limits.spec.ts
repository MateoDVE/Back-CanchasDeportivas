import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FinalPaymentDto } from '../modules/payments/presentation/dtos/final-payment.dto';
import { CloseCashShiftDto } from '../modules/cash-shifts/presentation/dtos/close-cash-shift.dto';
import { CreateComplexDto } from '../modules/complexes/presentation/dtos/create-complex.dto';
import { CreateStaffDto } from '../modules/users/presentation/dtos/create-staff.dto';

describe('Physical data bounds at the API', () => {
  it('rejects fractional cents and out-of-range money before PostgreSQL can round it', async () => {
    for (const amount of [1.001, 100000000, Infinity, NaN]) {
      const errors = await validate(plainToInstance(FinalPaymentDto, { amount, paymentMethod: 'EFECTIVO' }));
      expect(errors.some(e => e.property === 'amount')).toBe(true);
    }
    expect((await validate(plainToInstance(FinalPaymentDto, { amount: 12.25, paymentMethod: 'EFECTIVO' }))).some(e => e.property === 'amount')).toBe(false);
    const cash = await validate(plainToInstance(CloseCashShiftDto, { totalDeclaredCash: 1.001 }));
    expect(cash.some(e => e.property === 'totalDeclaredCash')).toBe(true);
  });
  it('aligns complex field limits with varchar sizes', async () => {
    const dto = plainToInstance(CreateComplexDto, { name: 'x'.repeat(101), location: 'x'.repeat(256), contactInfo: 'x'.repeat(256) });
    expect((await validate(dto)).map(e => e.property).sort()).toEqual(['contactInfo', 'location', 'name']);
  });
  it('accepts staff without CI and rejects collecting CI through the API', async () => {
    const input = { name: 'María Pérez', email: 'maria@example.test', phone: '70000000', password: 'Password123', role: 'SECRETARIA' };
    expect(await validate(plainToInstance(CreateStaffDto, input))).toHaveLength(0);
    const errors = await validate(plainToInstance(CreateStaffDto, { ...input, ci: '1234567' }), { whitelist: true, forbidNonWhitelisted: true });
    expect(errors.some(e => e.property === 'ci')).toBe(true);
  });
});
