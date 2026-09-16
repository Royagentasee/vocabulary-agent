import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SettingsService } from './settings.service'
import { SettingsController } from './settings.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [TypeOrmModule.forFeature([]), AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}