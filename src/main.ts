import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AsyncApiModule, AsyncApiDocumentBuilder } from 'nestjs-asyncapi';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
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
    console.log('⚠️  Supabase authentication disabled');
  }

  // Configurar Swagger
  const wsNamespace = process.env.WEBSOCKET_NAMESPACE || '/ws/rooms';

  const swaggerDescription = `
Real-time WebSocket API for creating and managing chat rooms. Built with NestJS and Socket.IO.

## Documentation

- 📡 **[WebSocket Events (AsyncAPI)](/async-api-docs)** - Full WebSocket events documentation with payloads
- 📖 **[Integration Guide](/platform/guide)** - Step-by-step guide with code examples
- 🧪 **[WebSocket Tester](/platform/public/app-key-test.ejs)** - Test your Application Key connections

## Quick Start

WebSocket namespace: \`${wsNamespace}\`
`;

  const configBuilder = new DocumentBuilder()
    .setTitle('RoomStream API')
    .setDescription(swaggerDescription)
    .setVersion('0.0.1')
    .setExternalDoc('WebSocket Guide', '/platform/guide')
    .addTag('rooms', 'Chat room management endpoints')
    .addTag('applications', 'Application/API Key management')
    .addTag('github', 'GitHub profile integration')
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

  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'RoomStream API Documentation',
    customfavIcon: '/platform/assets/media/favicon.svg',
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  // Configurar AsyncAPI para WebSocket documentation
  const asyncApiOptions = new AsyncApiDocumentBuilder()
    .setTitle('RoomStream WebSocket API')
    .setDescription(
      'Real-time WebSocket events for chat room management using Socket.IO',
    )
    .setVersion('1.0.0')
    .setDefaultContentType('application/json')
    .addServer('production', {
      url: `wss://your-domain.com${wsNamespace}`,
      protocol: 'wss',
      description: 'Production WebSocket server',
    })
    .addServer('development', {
      url: `ws://localhost:${process.env.PORT || 3000}${wsNamespace}`,
      protocol: 'ws',
      description: 'Development WebSocket server',
    })
    .build();

  const asyncApiDocument = AsyncApiModule.createDocument(app, asyncApiOptions);
  await AsyncApiModule.setup('/async-api-docs', app, asyncApiDocument);

  // Usar porta do ambiente ou padrão 3000
  if (!process.env.PORT) console.log('PORT não definida, usando padrão 3000');
  const port = process.env.PORT || 3000;

  await app.listen(port);

  console.log(`🚀 Aplicação rodando na porta ${port}`);
  console.log(`📱 Interface de teste: http://localhost:${port}/platform`);
  console.log(`📚 REST API Docs: http://localhost:${port}/api-docs`);
  console.log(`📡 WebSocket Docs: http://localhost:${port}/async-api-docs`);
  console.log(
    `🔌 WebSocket namespace: ${process.env.WEBSOCKET_NAMESPACE || '/ws/rooms'}`,
  );
}
bootstrap().catch((err) => console.error('Erro ao iniciar aplicação:', err));
