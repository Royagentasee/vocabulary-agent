import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { JwtAuthGuard } from '../auth/jwt.guard'

@ApiBearerAuth()
@ApiTags('analytics')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  overview() {
    return this.service.overview()
  }

  @Get('active-users')
  activeUsers(@Query('days') days = '30') {
    return this.service.activeUsers(+days)
  }
}