import { authenticator } from 'otplib';

export class OTPUtil {
  static generate(): string {
    // Generate a 6-digit OTP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static generateSecret(): string {
    return authenticator.generateSecret();
  }

  static verify(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }

  static generateTOTP(secret: string): string {
    return authenticator.generate(secret);
  }
}
