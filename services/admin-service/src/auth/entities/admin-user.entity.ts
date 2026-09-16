import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  passwordHash: string

  @Column()
  name: string

  @Column({
    type: 'enum',
    enum: AdminRole,
    default: AdminRole.VIEWER,
  })
  role: AdminRole

  @Column({ default: true })
  active: boolean

  @Column({ nullable: true, type: 'timestamp' })
  lastLoginAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}