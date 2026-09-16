import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL') ?? 'postgres://vocab:vocab@localhost:5432/vocab_agent',
        autoLoadEntities: true,
        synchronize: false,  // 用 migrations 管理
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}