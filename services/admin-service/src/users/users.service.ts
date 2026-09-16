import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository('users')  // 假设已有用户表
    private readonly repo: Repository<any>,
  ) {}

  async list(page = 1, pageSize = 20) {
    const [items, total] = await this.repo.findAndCount({
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { items, total, page, pageSize }
  }

  async stats() {
    const total = await this.repo.count()
    const today = await this.repo
      .createQueryBuilder('u')
      .where('u.created_at > CURRENT_DATE')
      .getCount()
      .catch(() => 0)
    return { total, todayNew: today }
  }
}