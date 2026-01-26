import { Injectable, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { AsyncApiModule, AsyncApiDocumentBuilder } from 'nestjs-asyncapi';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as ejs from 'ejs';
import { DocsConfig } from './interfaces';

@Injectable()
export class DocsService {
  private readonly logger = new Logger(DocsService.name);
  private swaggerDocument: OpenAPIObject;
  private asyncApiDocument: any;
  private asyncApiInitialized = false;
  private asyncApiInitializing = false;

  /**
   * Setup all documentation endpoints (Swagger and AsyncAPI)
   * AsyncAPI is now lazy-loaded for faster startup
   */
  async setup(app: NestExpressApplication, config: DocsConfig): Promise<void> {
    this.setupSwagger(app, config);
    this.setupAsyncApiLazy(app, config); // Lazy loading - não bloqueia startup
    this.setupDocsExplorer(app, config);
  }

  /**
   * Setup Swagger/OpenAPI documentation at /docs/api
   */
  private setupSwagger(app: NestExpressApplication, config: DocsConfig): void {
    const description = `
Real-time WebSocket API for creating and managing chat rooms. Built with NestJS and Socket.IO.

## Documentation

- 📡 **[WebSocket Events (AsyncAPI)](/docs/async-api)** - Full WebSocket events documentation with payloads
- 📖 **[Documentation Explorer](/docs)** - Interactive unified documentation
- 🧪 **[WebSocket Tester](/platform/public/app-key-test.ejs)** - Test your Application Key connections

## Quick Start

WebSocket namespace: \`${config.wsNamespace}\`
`;

    const configBuilder = new DocumentBuilder()
      .setTitle('RoomStream API')
      .setDescription(description)
      .setVersion(config.version)
      .setExternalDoc('Documentation Explorer', '/docs')
      .addTag('rooms', 'Chat room management endpoints')
      .addTag('applications', 'Application/API Key management')
      .addTag('github', 'GitHub profile integration')
      .addTag('health', 'Service health check')
      .addTag('metrics', 'System monitoring and observability');

    if (config.auth.apiKey) {
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

    if (config.auth.supabase) {
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

    const swaggerConfig = configBuilder.build();

    this.swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
    });

    SwaggerModule.setup('docs/api', app, this.swaggerDocument, {
      customSiteTitle: 'RoomStream API Documentation',
      customfavIcon: '/platform/assets/media/favicon.svg',
      swaggerOptions: {
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    });

    // Setup JSON endpoint for Swagger
    const httpAdapter = app.getHttpAdapter();
    const jsonDocument = JSON.stringify(this.swaggerDocument, null, 2);

    httpAdapter.get('/docs/api-json', (req: any, res: any) => {
      res.type('application/json');
      res.send(jsonDocument);
    });

    this.logger.log('Swagger documentation available at /docs/api');
  }

  /**
   * Setup AsyncAPI documentation with lazy loading
   * Document is generated on first access, not during startup
   */
  private setupAsyncApiLazy(
    app: NestExpressApplication,
    config: DocsConfig,
  ): void {
    const httpAdapter = app.getHttpAdapter();

    // Lazy initialization function
    const initAsyncApi = async (): Promise<void> => {
      if (this.asyncApiInitialized || this.asyncApiInitializing) return;

      this.asyncApiInitializing = true;
      const startTime = Date.now();

      try {
        const asyncApiOptions = new AsyncApiDocumentBuilder()
          .setTitle('RoomStream WebSocket API')
          .setDescription(
            'Real-time WebSocket events for chat room management using Socket.IO',
          )
          .setVersion(config.version)
          .setDefaultContentType('application/json')
          .addServer('production', {
            url: `wss://your-domain.com${config.wsNamespace}`,
            protocol: 'wss',
            description: 'Production WebSocket server',
          })
          .addServer('development', {
            url: `ws://localhost:${config.port}${config.wsNamespace}`,
            protocol: 'ws',
            description: 'Development WebSocket server',
          })
          .build();

        this.asyncApiDocument = AsyncApiModule.createDocument(
          app,
          asyncApiOptions,
        );
        this.asyncApiInitialized = true;

        const elapsed = Date.now() - startTime;
        this.logger.log(`AsyncAPI document generated in ${elapsed}ms (lazy)`);
      } catch (error) {
        this.logger.error('Failed to generate AsyncAPI document:', error);
        this.asyncApiInitializing = false;
        throw error;
      }
    };

    // JSON endpoint (lazy)
    httpAdapter.get('/docs/async-api-json', async (req: any, res: any) => {
      try {
        await initAsyncApi();
        res.type('application/json');
        res.send(JSON.stringify(this.asyncApiDocument, null, 2));
      } catch {
        res.status(500).json({ error: 'Failed to generate AsyncAPI document' });
      }
    });

    // YAML endpoint (lazy)
    httpAdapter.get('/docs/async-api-yaml', async (req: any, res: any) => {
      try {
        await initAsyncApi();
        const yamlDocument = yaml.dump(this.asyncApiDocument);
        res.type('text/yaml');
        res.send(yamlDocument);
      } catch {
        res.status(500).json({ error: 'Failed to generate AsyncAPI document' });
      }
    });

    // HTML page (uses EJS fallback - faster than AsyncApiModule.setup)
    this.setupAsyncApiFallback(app, config.version);

    this.logger.log(
      'AsyncAPI documentation configured (lazy loading enabled)',
    );
  }

  /**
   * Setup fallback AsyncAPI documentation with custom EJS page
   */
  private setupAsyncApiFallback(
    app: NestExpressApplication,
    version: string,
  ): void {
    const httpAdapter = app.getHttpAdapter();

    const templatePath = path.join(
      __dirname,
      '..',
      'platform',
      'public',
      'asyncapi.ejs',
    );

    httpAdapter.get('/docs/async-api', (req: any, res: any) => {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const html = ejs.render(templateContent, { version });
      res.type('text/html');
      res.send(html);
    });
  }

  /**
   * Setup Documentation Explorer at /docs
   */
  private setupDocsExplorer(
    app: NestExpressApplication,
    config: DocsConfig,
  ): void {
    const httpAdapter = app.getHttpAdapter();

    const templatePath = path.join(
      __dirname,
      '..',
      'platform',
      'public',
      'docs-explorer.ejs',
    );

    httpAdapter.get('/docs', (req: any, res: any) => {
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      const html = ejs.render(templateContent, { version: config.version });
      res.type('text/html');
      res.send(html);
    });

    this.logger.log('Documentation Explorer available at /docs');
  }
}
