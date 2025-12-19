import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators';
import { RoomService } from '../room/room.service';
import { PagesService } from './pages.service';
import { GithubService } from '../github/github.service';

// GitHub username for the about page
const GITHUB_USERNAME = 'Augustos0204';

@Controller('platform')
@Public()
export class PlatformController {
  private readonly logger = new Logger(PlatformController.name);

  constructor(
    private readonly roomService: RoomService,
    private readonly pagesService: PagesService,
    private readonly githubService: GithubService,
  ) {}

  private getEnvConfig() {
    return {
      supabaseUrl: process.env.SUPABASE_URL || null,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
      websocketNamespace: process.env.WEBSOCKET_NAMESPACE || '/ws/rooms',
    };
  }

  /**
   * View helpers for presentation logic
   */
  private getViewHelpers() {
    return {
      formatDate: (date: string | Date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
      truncate: (str: string, length = 20) => {
        return str.length > length ? str.substring(0, length) + '...' : str;
      },
      pluralize: (count: number, singular: string, plural: string) => {
        return count === 1 ? singular : plural;
      },
      roomIdShort: (roomId: string) => {
        return roomId.replace('room_', '').substring(0, 8);
      },
    };
  }

  /**
   * Get complete view context with pre-loaded data
   * @param currentPage - Current page name for SPA routing
   */
  private async getViewContext(currentPage: string = 'dashboard') {
    const config = this.getEnvConfig();
    const initialRooms = await this.roomService.getAllRooms();

    // Base context
    const context: Record<string, any> = {
      // Environment config
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      wsNamespace: config.websocketNamespace,
      apiKey: process.env.API_KEY || null,
      appName: process.env.APP_NAME || 'RoomStream',

      // Pre-loaded data
      initialRooms: initialRooms,
      serverTime: new Date().toISOString(),

      // SPA Routing
      currentPage: currentPage,
      availablePages: this.pagesService.getValidPageNames(),
      
      // SPA Pages para loop dinâmico de includes
      spaPages: this.pagesService.getSpaPageNames(),

      // Helpers
      helpers: this.getViewHelpers(),

      // Feature flags
      features: {
        supabaseAuth: !!(config.supabaseUrl && config.supabaseAnonKey),
        apiKeyAuth: !!process.env.API_KEY,
      },
    };

    // GitHub data is now loaded via API endpoint /api/github/profile
    // This provides lazy loading for the about page in SPA mode
    // For standalone pages (like landing), data is fetched in app.controller.ts

    return context;
  }

  /**
   * Main SPA route - /platform
   * Renders the main index.ejs which contains all pages
   */
  @Get()
  async getIndex(@Res() res: Response) {
    return this.renderPage(res, 'dashboard');
  }

  /**
   * Redirect /platform/index to /platform
   */
  @Get('index')
  async getIndexRedirect(@Res() res: Response) {
    return res.redirect('/platform');
  }

  /**
   * Legacy platform route - redirect to main
   */
  @Get('platform')
  async getPlatform(@Res() res: Response) {
    return res.redirect('/platform');
  }

  // ==================== STATIC ASSETS ====================

  @Get('assets/styles/:filename')
  getStyleFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './src/platform/public/styles' }, (err) => {
      if (err) {
        this.render404(res, `/platform/assets/styles/${filename}`);
      }
    });
  }

  @Get('assets/scripts/:filename')
  getScriptFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './src/platform/public/scripts' }, (err) => {
      if (err) {
        this.render404(res, `/platform/assets/scripts/${filename}`);
      }
    });
  }

  @Get('assets/media/:filename')
  getMediaFile(@Param('filename') filename: string, @Res() res: Response) {
    // Set correct Content-Type based on file extension
    if (filename.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (filename.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filename.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon');
    } else if (filename.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }

    return res.sendFile(filename, { root: './src/platform/public/media' }, (err) => {
      if (err) {
        this.render404(res, `/platform/assets/media/${filename}`);
      }
    });
  }

  @Get('assets/manifest.json')
  getManifest(@Res() res: Response) {
    const isDev = process.env.NODE_ENV !== 'production';
    const manifestFile = isDev ? 'manifest-dev.json' : 'manifest.json';

    res.setHeader('Content-Type', 'application/manifest+json');
    return res.sendFile(manifestFile, { root: './src/platform/public' }, (err) => {
      if (err) {
        this.render404(res, '/platform/assets/manifest.json');
      }
    });
  }

  // ==================== CATCH-ALL FOR PAGES ====================

  /**
   * Catch-all route for all pages (file-based routing)
   * Automatically routes to:
   * - SPA pages in pages/ → rendered inside index.ejs
   * - Standalone pages in pages/ → rendered directly
   * - Legacy pages in public/ → rendered directly
   */
  @Get(':pageName')
  async getPage(
    @Param('pageName') pageName: string,
    @Res() res: Response,
  ) {
    // Tenta renderizar a página (SPA ou standalone)
    return this.renderPage(res, pageName);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Render page
   * - pages/ → SPA (renderizado dentro do index.ejs)
   * - public/ → Standalone (renderizado diretamente)
   */
  private async renderPage(res: Response, pageName: string) {
    try {
      const context = await this.getViewContext(pageName);

      // Página em pages/ → SPA (renderizado dentro do index.ejs)
      if (this.pagesService.hasPage(pageName)) {
        return res.render('pages/index', context);
      }

      // Página standalone em public/ (ex: landing, legacy, app-test)
      if (this.pagesService.hasStandalonePage(pageName)) {
        return res.render(pageName, context);
      }

      // Página não encontrada
      return this.render404(res, `/platform/${pageName}`);
    } catch (error) {
      this.logger.error(`Error rendering page '${pageName}':`, error);
      return this.render404(res, `/platform/${pageName}`);
    }
  }

  /**
   * @deprecated Use renderPage instead
   */
  private async renderSpaPage(res: Response, pageName: string) {
    return this.renderPage(res, pageName);
  }

  /**
   * Render 404 error page for view routes
   */
  private render404(res: Response, path: string) {
    return res.status(404).render('404', {
      statusCode: 404,
      error: 'Not Found',
      message: 'A página ou recurso solicitado não foi encontrado.',
      timestamp: new Date().toISOString(),
      path: path,
      isDevelopment: process.env.NODE_ENV !== 'production',
    });
  }
}
