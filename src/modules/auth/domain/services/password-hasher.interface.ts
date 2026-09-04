export const PASSWORD_HASHER = 'IPasswordHasher';

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}
