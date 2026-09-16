import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/jwt.guard'

@ApiBearerAuth()
@ApiTags('users')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    return this.service.list(+page, +pageSize)
  }

  @Get('stats')
  stats() {
    return this.service.stats()
  }
}