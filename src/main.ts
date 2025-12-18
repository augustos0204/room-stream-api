import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as fs from 'fs';
import * as path from 'path';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SupabaseService } from './supabase/supabase.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configurar EJS como template engine
  // Configurar múltiplos diretórios de views para suportar a nova estrutura:
  // - pages/: Páginas (file-based routing)
  // - components/: Componentes reutilizáveis
  // - public/: Arquivos estáticos e páginas de erro
  // - partials/: Legacy partials (para compatibilidade)
  app.setBaseViewsDir([
    path.join(__dirname, 'platform'),
    path.join(__dirname, 'platform', 'pages'),
    path.join(__dirname, 'platform', 'components'),
    path.join(__dirname, 'platform', 'public'),
  ]);
  app.setViewEngine('ejs');

  // Desabilitar cache do EJS em desenvolvimento para hot-reload
  if (process.env.NODE_ENV !== 'production') {
    app.set('view cache', false);
    console.log('🔥 EJS cache desabilitado para hot-reload');
  }

  // Configurar CORS para permitir ferramentas externas
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization', // Supabase JWT tokens
      'x-api-key', // API Key authentication
      'Accept',
    ],
    credentials: true,
  });

  // Habilitar validação global para DTOs em REST API
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Transforma payloads em DTOs
      whitelist: true, // Remove propriedades não definidas no DTO
      forbidNonWhitelisted: true, // Rejeita propriedades extras
      transformOptions: {
        enableImplicitConversion: true, // Converte tipos automaticamente
      },
    }),
  );

  // Apply global guards
  const reflector = app.get(Reflector);

  // Aplicar filtro global de exceções (captura TODAS as exceções, incluindo erros não-HTTP)
  app.useGlobalFilters(new AllExceptionsFilter());

  if (process.env.API_KEY) {
    app.useGlobalGuards(new ApiKeyGuard(reflector));
    console.log('🔐 API Key authentication enabled');
  } else {
    console.log(
      '⚠️  API Key authentication disabled - set API_KEY env var to enable',
    );
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    const supabaseService = app.get(SupabaseService);
    app.useGlobalGuards(new SupabaseAuthGuard(supabaseService, reflector));
    console.log('🔑 Supabase authentication enabled');
  } else {
    console.log(
      '⚠️  Supabase authentication disabled',
    );
  }

  // Configurar Swagger
  const configBuilder = new DocumentBuilder()
    .setTitle('RoomStream API')
    .setDescription(
      'Real-time WebSocket API for creating and managing chat rooms. Built with NestJS and Socket.IO.',
    )
    .setVersion('0.0.1')
    .addTag('rooms', 'Chat room management endpoints')
    .addTag('health', 'Service health check')
    .addTag('metrics', 'System monitoring and observability');

  if (process.env.API_KEY) {
    configBuilder.addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API key for authentication',
      },
      'api-key',
    );
  }

  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    configBuilder.addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase JWT token for authentication',
      },
      'supabase-token',
    );
  }

  const config = configBuilder.build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  const customCssPath = path.join(
    __dirname,
    'platform',
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
    customfavIcon: '/platform/assets/media/favicon.svg',
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
  console.log(`📱 Interface de teste: http://localhost:${port}/platform`);
  console.log(`📚 Documentação API: http://localhost:${port}/api-docs`);
  console.log(
    `🔌 WebSocket namespace: ${process.env.WEBSOCKET_NAMESPACE || '/ws/rooms'}`,
  );
}
bootstrap().catch((err) => console.error('Erro ao iniciar aplicação:', err));
