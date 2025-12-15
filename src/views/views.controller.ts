import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators';
import { RoomService } from '../room/room.service';

@Controller('view')
@Public()
export class ViewsController {
  constructor(private readonly roomService: RoomService) {}

  private getEnvConfig() {
    return {
      supabaseUrl: process.env.SUPABASE_URL || null,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
      websocketNamespace: process.env.WEBSOCKET_NAMESPACE || '/ws/rooms',
    };
  }

  /**
   * View helpers for presentation logic (TODO #5 - Criar Helpers)
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
   * Get complete view context with pre-loaded data (TODO #2 - Pré-carregar Dados)
   */
  private async getViewContext() {
    const config = this.getEnvConfig();
    const initialRooms = await this.roomService.getAllRooms();

    return {
      // Environment config
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
      wsNamespace: config.websocketNamespace,
      apiKey: process.env.API_KEY || null,
      appName: process.env.APP_NAME || 'RoomStream',
      appVersion: process.env.APP_VERSION || '1.0.0',

      // Pre-loaded data
      initialRooms: initialRooms,
      serverTime: new Date().toISOString(),

      // Helpers
      helpers: this.getViewHelpers(),
    };
  }

  @Get()
  async getAdminIndex(@Res() res: Response) {
    try {
      const context = await this.getViewContext();
      // Sem callback - Express envia automaticamente
      return res.render('index', context);
    } catch (error) {
      console.error('Error in getAdminIndex:', error);
      return this.render404(res, '/view');
    }
  }

  @Get('index')
  async getIndex(@Res() res: Response) {
    // Redireciona /view/index para /view
    return res.redirect('/view');
  }

  @Get('platform')
  async getPlatform(@Res() res: Response) {
    try {
      const context = await this.getViewContext();
      // Sem callback - Express envia automaticamente
      return res.render('platform', context);
    } catch (error) {
      console.error('Error in getPlatform:', error);
      return this.render404(res, '/view/platform');
    }
  }

  @Get('assets/styles/:filename')
  getStyleFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './src/views/public/styles' }, (err) => {
      if (err) {
        this.render404(res, `/view/assets/styles/${filename}`);
      }
    });
  }

  @Get('assets/scripts/:filename')
  getScriptFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './src/views/public/scripts' }, (err) => {
      if (err) {
        this.render404(res, `/view/assets/scripts/${filename}`);
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

    return res.sendFile(filename, { root: './src/views/public/media' }, (err) => {
      if (err) {
        this.render404(res, `/view/assets/media/${filename}`);
      }
    });
  }

  @Get(':viewName')
  getView(@Param('viewName') viewName: string, @Res() res: Response) {
    try {
      const config = this.getEnvConfig();
      return res.render(viewName, config);
    } catch (error) {
      console.error(`Error rendering view '${viewName}':`, error);
      return this.render404(res, `/view/${viewName}`);
    }
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
