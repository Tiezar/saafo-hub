import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from '../controllers/auth.controller';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'temp-development-secret-for-saafo-hub-key-32chars',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy],
})
export class AuthModule {}
