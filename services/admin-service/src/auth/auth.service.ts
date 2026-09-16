import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { AdminUser } from './entities/admin-user.entity'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly userRepo: Repository<AdminUser>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email, active: true } })
    if (!user) throw new UnauthorizedException('账号或密码错误')

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('账号或密码错误')

    user.lastLoginAt = new Date()
    await this.userRepo.save(user)

    const payload = { sub: user.id, email: user.email, role: user.role }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    }
  }

  async createUser(email: string, password: string, name: string, role: string) {
    const passwordHash = await bcrypt.hash(password, 10)
    const user = this.userRepo.create({ email, passwordHash, name, role: role as any })
    return this.userRepo.save(user)
  }

  async validateToken(token: string) {
    try {
      return this.jwtService.verify(token)
    } catch {
      throw new UnauthorizedException('无效的令牌')
    }
  }
}