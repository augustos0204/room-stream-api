import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

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

  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'RoomStream API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      tagsSorter: 'alpha', // Ordenar tags alfabeticamente
      operationsSorter: 'alpha', // Ordenar operações alfabeticamente
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
    `🔌 WebSocket namespace: ${process.env.WEBSOCKET_NAMESPACE || '/room'}`,
  );
}
bootstrap();
