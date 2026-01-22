import { Injectable, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AsyncApiModule, AsyncApiDocumentBuilder } from 'nestjs-asyncapi';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as ejs from 'ejs';
import { DocsConfig } from './interfaces';

@Injectable()
export class DocsService {
  private readonly logger = new Logger(DocsService.name);

  /**
   * Setup all documentation endpoints (Swagger and AsyncAPI)
   */
  async setup(app: NestExpressApplication, config: DocsConfig): Promise<void> {
    this.setupSwagger(app, config);
    await this.setupAsyncApi(app, config);
  }

  /**
   * Setup Swagger/OpenAPI documentation at /docs/api
   */
  private setupSwagger(app: NestExpressApplication, config: DocsConfig): void {
    const description = `
Real-time WebSocket API for creating and managing chat rooms. Built with NestJS and Socket.IO.

## Documentation

- 📡 **[WebSocket Events (AsyncAPI)](/docs/async-api)** - Full WebSocket events documentation with payloads
- 📖 **[Integration Guide](/platform/guide)** - Step-by-step guide with code examples
- 🧪 **[WebSocket Tester](/platform/public/app-key-test.ejs)** - Test your Application Key connections

## Quick Start

WebSocket namespace: \`${config.wsNamespace}\`
`;

    const configBuilder = new DocumentBuilder()
      .setTitle('RoomStream API')
      .setDescription(description)
      .setVersion(config.version)
      .setExternalDoc('WebSocket Guide', '/platform/guide')
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

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
    });

    SwaggerModule.setup('docs/api', app, document, {
      customSiteTitle: 'RoomStream API Documentation',
      customfavIcon: '/platform/assets/media/favicon.svg',
      swaggerOptions: {
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    });

    this.logger.log('Swagger documentation available at /docs/api');
  }

  /**
   * Setup AsyncAPI documentation at /docs/async-api
   * Falls back to custom EJS page with JSON/YAML endpoints if HTML generation fails
   */
  private async setupAsyncApi(
    app: NestExpressApplication,
    config: DocsConfig,
  ): Promise<void> {
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

    const asyncApiDocument = AsyncApiModule.createDocument(app, asyncApiOptions);

    try {
      await AsyncApiModule.setup('/docs/async-api', app, asyncApiDocument);
      this.logger.log('AsyncAPI HTML documentation available at /docs/async-api');
    } catch {
      // HTML generation failed, setup custom EJS page with JSON/YAML endpoints
      this.setupAsyncApiFallback(app, asyncApiDocument, config.version);
    }
  }

  /**
   * Setup fallback AsyncAPI documentation with custom EJS page and JSON/YAML endpoints
   */
  private setupAsyncApiFallback(
    app: NestExpressApplication,
    asyncApiDocument: any,
    version: string,
  ): void {
    const httpAdapter = app.getHttpAdapter();

    const yamlDocument = yaml.dump(asyncApiDocument);
    const jsonDocument = JSON.stringify(asyncApiDocument, null, 2);

    // Get the template path - works for both dev and production
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

    httpAdapter.get('/docs/async-api-json', (req: any, res: any) => {
      res.type('application/json');
      res.send(jsonDocument);
    });

    httpAdapter.get('/docs/async-api-yaml', (req: any, res: any) => {
      res.type('text/yaml');
      res.send(yamlDocument);
    });

    this.logger.log(
      'AsyncAPI documentation available at /docs/async-api (JSON/YAML mode)',
    );
  }
}
