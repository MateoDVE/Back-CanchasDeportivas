import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';
import { Roles, ROLES_KEY } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Roles('ADMIN')
class ProtectedController {
  @Public()
  @Roles('SECRETARIA', 'ADMIN')
  route(this: void, @CurrentUser() user: unknown) {
    return user;
  }
}

function context(user?: unknown): ExecutionContext {
  return {
    getHandler: () => ProtectedController.prototype.route,
    getClass: () => ProtectedController,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('Decoradores y control de acceso', () => {
  afterEach(() => jest.restoreAllMocks());

  it('publica metadatos y prioriza los roles del método sobre la clase', () => {
    const reflector = new Reflector();
    expect(
      reflector.get(IS_PUBLIC_KEY, ProtectedController.prototype.route),
    ).toBe(true);
    expect(reflector.get(ROLES_KEY, ProtectedController)).toEqual(['ADMIN']);
    expect(
      new RolesGuard(reflector).canActivate(context({ role: 'SECRETARIA' })),
    ).toBe(true);
  });

  it.each([undefined, { id: 'client-1', role: 'CLIENTE' }])(
    'extrae el usuario de la petición: %p',
    (user) => {
      const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        ProtectedController,
        'route',
      ) as Record<
        string,
        { factory: (data: unknown, ctx: ExecutionContext) => unknown }
      >;
      expect(Object.values(metadata)[0].factory(undefined, context(user))).toBe(
        user,
      );
    },
  );

  it.each([undefined, []])(
    'permite rutas sin restricciones de rol: %p',
    (roles) => {
      const reflector = new Reflector();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
      expect(new RolesGuard(reflector).canActivate(context())).toBe(true);
    },
  );

  it.each([undefined, {}, { role: 'CLIENTE' }])(
    'rechaza usuarios sin rol autorizado: %p',
    (user) => {
      expect(() =>
        new RolesGuard(new Reflector()).canActivate(context(user)),
      ).toThrow(ForbiddenException);
    },
  );

  it('omite Passport en rutas públicas', () => {
    const passport = jest.spyOn(AuthGuard('jwt').prototype, 'canActivate');
    expect(new JwtAuthGuard(new Reflector()).canActivate(context())).toBe(true);
    expect(passport).not.toHaveBeenCalled();
  });

  it('delega la autenticación de rutas privadas a Passport', async () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const passport = jest
      .spyOn(AuthGuard('jwt').prototype, 'canActivate')
      .mockResolvedValue(false);
    const ctx = context();
    await expect(new JwtAuthGuard(reflector).canActivate(ctx)).resolves.toBe(
      false,
    );
    expect(passport).toHaveBeenCalledWith(ctx);
  });
});
