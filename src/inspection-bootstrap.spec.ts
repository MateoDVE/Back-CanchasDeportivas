import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { SUPABASE_CLIENT } from './common/supabase/supabase.provider';
import { RESERVATION_REPOSITORY } from './modules/reservations/domain/repositories/reservation.repository.interface';

describe('Arranque de módulos después de la inspección', () => {
  it('resuelve las dependencias sin conectarse a Supabase remoto', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_CLIENT)
      .useValue(null)
      .compile();
    try {
      await module.init();
      expect(module.get(RESERVATION_REPOSITORY)).toBeDefined();
    } finally {
      await module.close();
    }
  });
});
