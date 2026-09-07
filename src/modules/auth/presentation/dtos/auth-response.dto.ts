export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  ci: string;
  role: string;
  status: string;
  createdAt: Date;
}

export class AuthResponseDto {
  accessToken: string;
  user: UserResponseDto;
}
