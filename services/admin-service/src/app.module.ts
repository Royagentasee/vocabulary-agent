import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './auth/auth.module'
import { WordbooksModule } from './wordbooks/wordbooks.module'
import { UsersModule } from './users/users.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { SettingsModule } from './settings/settings.module'
import { DatabaseModule } from './database/database.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    WordbooksModule,
    UsersModule,
    AnalyticsModule,
    SettingsModule,
  ],
})
export class AppModule {}