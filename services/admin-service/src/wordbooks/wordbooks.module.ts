import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Wordbook } from './entities/wordbook.entity'
import { WordbooksService } from './wordbooks.service'
import { WordbooksController } from './wordbooks.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [TypeOrmModule.forFeature([Wordbook]), AuthModule],
  controllers: [WordbooksController],
  providers: [WordbooksService],
  exports: [WordbooksService],
})
export class WordbooksModule {}