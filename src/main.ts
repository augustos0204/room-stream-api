import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AsyncApiModule, AsyncApiDocumentBuilder } from 'nestjs-asyncapi';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as ejs from 'ejs';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SupabaseService } from './supabase/supabase.service';
import {
  StartupConfig,
  printBanner,
  printStartupSummary,
} from './common/utils/startup.util';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../package.json');

async function bootstrap() {
  const startTime = Date.now();
  const logger = new Logger('Bootstrap');

  // Collect startup configuration
  const startupConfig: StartupConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development',
    wsNamespace: process.env.WEBSOCKET_NAMESPACE || '/ws/rooms',
    startTime,
    auth: {
      apiKey: !!process.env.API_KEY,
      supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      appKeys: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    },
    features: {
      ejsCache: process.env.NODE_ENV === 'production',
      cors: process.env.CORS_ORIGIN || '*',
    },
  };

  // Create NestJS application
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger:
      startupConfig.environment === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Configure EJS template engine
  app.setBaseViewsDir([
    path.join(__dirname, 'platform'),
    path.join(__dirname, 'platform', 'pages'),
    path.join(__dirname, 'platform', 'components'),
    path.join(__dirname, 'platform', 'public'),
  ]);
  app.setViewEngine('ejs');

  // Disable EJS cache in development for hot-reload
  if (!startupConfig.features.ejsCache) {
    app.set('view cache', false);
  }

  // Configure CORS
  app.enableCors({
    origin: startupConfig.features.cors,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'Accept'],
    credentials: true,
  });

  // Enable global validation for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Apply global guards based on configuration
  const reflector = app.get(Reflector);

  if (startupConfig.auth.apiKey) {
    app.useGlobalGuards(new ApiKeyGuard(reflector));
  }

  if (startupConfig.auth.supabase) {
    const supabaseService = app.get(SupabaseService);
    app.useGlobalGuards(new SupabaseAuthGuard(supabaseService, reflector));
  }

  // Configure Swagger
  const swaggerDescription = `
Real-time WebSocket API for creating and managing chat rooms. Built with NestJS and Socket.IO.

## Documentation

- 📡 **[WebSocket Events (AsyncAPI)](/async-api-docs)** - Full WebSocket events documentation with payloads
- 📖 **[Integration Guide](/platform/guide)** - Step-by-step guide with code examples
- 🧪 **[WebSocket Tester](/platform/public/app-key-test.ejs)** - Test your Application Key connections

## Quick Start

WebSocket namespace: \`${startupConfig.wsNamespace}\`
`;

  const configBuilder = new DocumentBuilder()
    .setTitle('RoomStream API')
    .setDescription(swaggerDescription)
    .setVersion(packageJson.version)
    .setExternalDoc('WebSocket Guide', '/platform/guide')
    .addTag('rooms', 'Chat room management endpoints')
    .addTag('applications', 'Application/API Key management')
    .addTag('github', 'GitHub profile integration')
    .addTag('health', 'Service health check')
    .addTag('metrics', 'System monitoring and observability');

  if (startupConfig.auth.apiKey) {
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

  if (startupConfig.auth.supabase) {
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

  // Configure AsyncAPI for WebSocket documentation
  const asyncApiOptions = new AsyncApiDocumentBuilder()
    .setTitle('RoomStream WebSocket API')
    .setDescription(
      'Real-time WebSocket events for chat room management using Socket.IO',
    )
    .setVersion(packageJson.version)
    .setDefaultContentType('application/json')
    .addServer('production', {
      url: `wss://your-domain.com${startupConfig.wsNamespace}`,
      protocol: 'wss',
      description: 'Production WebSocket server',
    })
    .addServer('development', {
      url: `ws://localhost:${startupConfig.port}${startupConfig.wsNamespace}`,
      protocol: 'ws',
      description: 'Development WebSocket server',
    })
    .build();

  const asyncApiDocument = AsyncApiModule.createDocument(app, asyncApiOptions);

  // Try to setup full HTML documentation, fallback to custom EJS page with JSON/YAML endpoints
  try {
    await AsyncApiModule.setup('/async-api-docs', app, asyncApiDocument);
    logger.log('AsyncAPI HTML documentation available at /async-api-docs');
  } catch {
    // HTML generation failed, setup custom EJS page with JSON/YAML endpoints
    const httpAdapter = app.getHttpAdapter();

    const yamlDocument = yaml.dump(asyncApiDocument);
    const jsonDocument = JSON.stringify(asyncApiDocument, null, 2);

    // Load the EJS template
    const templatePath = path.join(
      __dirname,
      'platform',
      'public',
      'asyncapi.ejs',
    );

    httpAdapter.get('/async-api-docs', (req: any, res: any) => {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const html = ejs.render(templateContent, {
        version: packageJson.version,
      });
      res.type('text/html');
      res.send(html);
    });

    httpAdapter.get('/async-api-docs-json', (req: any, res: any) => {
      res.type('application/json');
      res.send(jsonDocument);
    });

    httpAdapter.get('/async-api-docs-yaml', (req: any, res: any) => {
      res.type('text/yaml');
      res.send(yamlDocument);
    });

    logger.log(
      'AsyncAPI documentation available at /async-api-docs (JSON/YAML mode)',
    );
  }

  // Start the server
  await app.listen(startupConfig.port);

  // Print banner and startup summary after everything is ready
  const isDev = startupConfig.environment !== 'production';
  printBanner(isDev);
  printStartupSummary(startupConfig);

  logger.log('Application started successfully');
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
