import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS para permitir ferramentas externas
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Configurar Swagger
  const config = new DocumentBuilder()
    .setTitle('RoomStream API')
    .setDescription(
      'Real-time WebSocket API for creating and managing chat rooms. Built with NestJS and Socket.IO.',
    )
    .setVersion('0.0.1')
    .addTag('rooms', 'Chat room management endpoints')
    .addTag('health', 'Service health check')
    .addTag('metrics', 'System monitoring and observability')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      methodKey,
  });

  const customCssPath = path.join(
    __dirname,
    'views',
    'public',
    'styles',
    'swagger.css',
  );
  const customCss = fs.existsSync(customCssPath)
    ? fs.readFileSync(customCssPath, 'utf8')
    : '';

  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'RoomStream API Documentation',
    customCss,
    customfavIcon: '/admin/assets/media/favicon.svg',
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  // Usar porta do ambiente ou padrão 3000
  if (!process.env.PORT) console.log('PORT não definida, usando padrão 3000');
  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`🚀 Aplicação rodando na porta ${port}`);
  console.log(`📱 Interface de teste: http://localhost:${port}/admin`);
  console.log(`📚 Documentação API: http://localhost:${port}/api-docs`);
  console.log(
    `🔌 WebSocket namespace: ${process.env.WEBSOCKET_NAMESPACE || '/ws/rooms'}`,
  );
}
bootstrap();
