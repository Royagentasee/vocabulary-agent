import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

interface SystemSetting {
  key: string
  value: string
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository('system_settings')
    private readonly repo: Repository<SystemSetting>,
  ) {}

  async getAll() {
    const rows = await this.repo.find().catch(() => [])
    const result: Record<string, string> = {}
    rows.forEach((r) => (result[r.key] = r.value))
    return result
  }

  async set(key: string, value: string) {
    const existing = await this.repo.findOne({ where: { key } }).catch(() => null)
    if (existing) {
      existing.value = value
      await this.repo.save(existing)
    } else {
      await this.repo.save({ key, value })
    }
    return { key, value }
  }

  async setMany(settings: Record<string, string>) {
    for (const [k, v] of Object.entries(settings)) {
      await this.set(k, v)
    }
    return this.getAll()
  }
}