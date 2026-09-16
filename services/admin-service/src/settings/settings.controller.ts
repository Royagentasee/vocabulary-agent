import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/jwt.guard'

@ApiBearerAuth()
@ApiTags('settings')
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  list() {
    return this.service.getAll()
  }

  @Put()
  update(@Body() body: Record<string, string>) {
    return this.service.setMany(body)
  }
}