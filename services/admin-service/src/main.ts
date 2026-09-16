import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api/admin')
  app.enableCors()
  app.useGlobalPipes(new ValidationPipe({ transform: true }))

  const config = new DocumentBuilder()
    .setTitle('Vocabulary Agent Admin API')
    .setDescription('Backend for admin dashboard')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/admin/docs', app, document)

  const port = process.env.PORT ?? 8001
  await app.listen(port)
  console.log(`admin-service listening on http://localhost:${port}`)
  console.log(`Swagger docs at http://localhost:${port}/api/admin/docs`)
}

bootstrap()