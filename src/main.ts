import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SupabaseService } from './supabase/supabase.service';
import { DocsService } from './docs/docs.service';
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

  // Setup documentation (Swagger and AsyncAPI)
  const docsService = app.get(DocsService);
  await docsService.setup(app, {
    port: startupConfig.port,
    wsNamespace: startupConfig.wsNamespace,
    version: packageJson.version,
    auth: {
      apiKey: startupConfig.auth.apiKey,
      supabase: startupConfig.auth.supabase,
    },
  });

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
