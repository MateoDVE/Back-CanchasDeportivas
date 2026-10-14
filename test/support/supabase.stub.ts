// Frontera de persistencia para pruebas unitarias: no abre conexiones.
export function supabaseStub() {
  const response: {
    data: unknown;
    error: { message: string; code?: string } | null;
  } = { data: null, error: null };
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    not: jest.fn(),
    gt: jest.fn(),
    lt: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    or: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    maybeSingle: jest.fn(),
    single: jest.fn(),
    then: (resolve: (value: typeof response) => unknown) =>
      Promise.resolve(response).then(resolve),
  };
  for (const method of Object.values(query)) {
    if (jest.isMockFunction(method)) method.mockReturnValue(query);
  }
  const client = {
    from: jest.fn(() => query),
    rpc: jest.fn(() => Promise.resolve(response)),
  };
  return { response, query, client };
}
