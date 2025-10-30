import * as QRCode from 'qrcode';

export class QRCodeUtil {
  static async generate(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data);
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  static async generateBuffer(data: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(data);
    } catch (error) {
      throw new Error(`Failed to generate QR code buffer: ${error.message}`);
    }
  }
}
