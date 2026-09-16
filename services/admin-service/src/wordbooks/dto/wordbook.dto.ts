import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'

export class CreateWordbookDto {
  @IsString()
  id: string

  @IsString()
  name: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  examTag?: string

  @IsOptional()
  @IsString()
  coverColor?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  wordCount?: number

  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived'
}

export class UpdateWordbookDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  examTag?: string

  @IsOptional()
  @IsString()
  coverColor?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  wordCount?: number

  @IsOptional()
  @IsIn(['draft', 'active', 'archived'])
  status?: 'draft' | 'active' | 'archived'
}