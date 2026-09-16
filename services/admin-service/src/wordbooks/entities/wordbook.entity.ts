import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type WordbookStatus = 'draft' | 'active' | 'archived'

@Entity('wordbooks')
export class Wordbook {
  @PrimaryColumn()
  id: string

  @Column()
  name: string

  @Column({ default: '' })
  description: string

  @Column({ default: 'GENERAL' })
  examTag: string

  @Column({ default: '#3b82f6' })
  coverColor: string

  @Column({ type: 'int', default: 0 })
  wordCount: number

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'archived'],
    default: 'draft',
  })
  status: WordbookStatus

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}