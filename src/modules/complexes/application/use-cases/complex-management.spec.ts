import { InMemoryComplexRepository } from '../../infrastructure/repositories/in-memory-complex.repository';
import { CreateComplexUseCase } from './create-complex.use-case';
import { UpdateComplexUseCase } from './update-complex.use-case';
import { DeactivateComplexUseCase } from './deactivate-complex.use-case';
import { GetActiveComplexesUseCase } from './get-active-complexes.use-case';

it('edits complexes and preserves inactive records for administration', async () => {
  const repository = new InMemoryComplexRepository();
  const created = await new CreateComplexUseCase(repository).execute({ name: 'Sede', location: 'Calle 1', contactInfo: '70000000' });
  await new UpdateComplexUseCase(repository).execute({ id: created.id, name: 'Sede Norte' });
  const remove = new DeactivateComplexUseCase(repository);
  await remove.execute(created.id);
  await remove.execute(created.id);
  expect(await new GetActiveComplexesUseCase(repository).execute()).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id })]));
  expect(await new GetActiveComplexesUseCase(repository).execute(false)).toEqual(expect.arrayContaining([expect.objectContaining({ id: created.id, name: 'Sede Norte', isActive: false })]));
  await expect(remove.execute(-1)).rejects.toThrow();
});
