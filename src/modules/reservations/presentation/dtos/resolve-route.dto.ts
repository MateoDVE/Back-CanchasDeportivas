import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
export class ResolveRouteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  token: string;
}
