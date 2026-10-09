export const EMAIL_VERIFICATION = Symbol('EMAIL_VERIFICATION');

export interface IEmailVerification {
  send(userId: string, email: string): Promise<void>;
  verify(token: string, userId: string, email: string): Promise<boolean>;
}
