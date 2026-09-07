import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RegisterClientUseCase } from '../../application/use-cases/register-client.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { VerifyEmailUseCase, VerifyEmailOutputDto } from '../../application/use-cases/verify-email.use-case';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';
import { VerifyEmailDto } from '../dtos/verify-email.dto';
import { AuthResponseDto, UserResponseDto } from '../dtos/auth-response.dto';
import { Public } from '../../../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly registerClientUseCase: RegisterClientUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
  ) {}

  /**
   * @reference HU-CLI-01 Registro de cliente
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return this.registerClientUseCase.execute(dto);
  }

  /**
   * @reference HU-CLI-02 Validación de correo electrónico
   */
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<VerifyEmailOutputDto> {
    return this.verifyEmailUseCase.execute(dto);
  }

  /**
   * @reference HU-CLI-03 Inicio de sesión (Cliente)
   * @reference HU-SEC-01 Iniciar sesión (Secretaria)
   * @reference HU-ADM-01 Iniciar sesión (Admin)
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.loginUseCase.execute(dto);
  }

  /**
   * Obtener perfil del usuario autenticado
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<AuthenticatedUser> {
    return user;
  }
}
