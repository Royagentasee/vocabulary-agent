import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Wordbook } from './entities/wordbook.entity'
import { CreateWordbookDto, UpdateWordbookDto } from './dto/wordbook.dto'

@Injectable()
export class WordbooksService {
  constructor(
    @InjectRepository(Wordbook)
    private readonly repo: Repository<Wordbook>,
  ) {}

  async list(page = 1, pageSize = 20, status?: string) {
    const where = status ? { status: status as any } : {}
    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })
    return { items, total, page, pageSize }
  }

  async findOne(id: string) {
    const wb = await this.repo.findOne({ where: { id } })
    if (!wb) throw new NotFoundException(`Wordbook ${id} not found`)
    return wb
  }

  async create(dto: CreateWordbookDto) {
    const existing = await this.repo.findOne({ where: { id: dto.id } })
    if (existing) throw new NotFoundException(`Wordbook ${dto.id} already exists`)
    const wb = this.repo.create(dto)
    return this.repo.save(wb)
  }

  async update(id: string, dto: UpdateWordbookDto) {
    const wb = await this.findOne(id)
    Object.assign(wb, dto)
    return this.repo.save(wb)
  }

  async remove(id: string) {
    const wb = await this.findOne(id)
    await this.repo.remove(wb)
    return { id }
  }

  async stats() {
    const rows = await this.repo
      .createQueryBuilder('wb')
      .select('wb.examTag', 'examTag')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(wb.wordCount)', 'totalWords')
      .groupBy('wb.examTag')
      .getRawMany()
    return rows
  }
}