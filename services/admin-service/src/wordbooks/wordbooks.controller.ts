import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { WordbooksService } from './wordbooks.service'
import { CreateWordbookDto, UpdateWordbookDto } from './dto/wordbook.dto'
import { JwtAuthGuard } from '../auth/jwt.guard'

@ApiBearerAuth()
@ApiTags('wordbooks')
@UseGuards(JwtAuthGuard)
@Controller('wordbooks')
export class WordbooksController {
  constructor(private readonly service: WordbooksService) {}

  @Get()
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
  ) {
    return this.service.list(+page, +pageSize, status)
  }

  @Get('stats')
  stats() {
    return this.service.stats()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateWordbookDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWordbookDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}