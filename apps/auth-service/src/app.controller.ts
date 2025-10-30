import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './app.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.login')
  async login(@Payload() data: any) {
    return this.authService.login(data);
  }

  @MessagePattern('auth.register')
  async register(@Payload() data: any) {
    return this.authService.register(data);
  }

  @MessagePattern('auth.validate')
  async validateToken(@Payload() data: any) {
    return this.authService.validateToken(data.token);
  }

  @MessagePattern('auth.verify')
  async verifyUser(@Payload() data: any) {
    return this.authService.verifyUser(data);
  }
}
