import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository('user_word_progress')
    private readonly progressRepo: Repository<any>,
    @InjectRepository('words')
    private readonly wordsRepo: Repository<any>,
  ) {}

  async overview() {
    const totalUsers = await this.progressRepo
      .createQueryBuilder('p')
      .select('COUNT(DISTINCT p.user_id)', 'count')
      .getRawOne()
      .catch(() => ({ count: 0 }))

    const todayReviews = await this.progressRepo
      .createQueryBuilder('p')
      .where('p.last_reviewed_at > CURRENT_DATE')
      .getCount()
      .catch(() => 0)

    const totalWords = await this.wordsRepo.count().catch(() => 0)

    return {
      totalUsers: totalUsers?.count || 0,
      todayReviews,
      totalWords,
      timestamp: new Date().toISOString(),
    }
  }

  async activeUsers(days = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const data = await this.progressRepo
      .createQueryBuilder('p')
      .select("DATE(p.last_reviewed_at)", 'date')
      .addSelect('COUNT(DISTINCT p.user_id)', 'count')
      .where('p.last_reviewed_at > :since', { since })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany()
      .catch(() => [])

    return data
  }
}