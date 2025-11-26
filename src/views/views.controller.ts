import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../common/decorators';

@Controller('view')
@Public()
export class ViewsController {
  private getEnvConfig() {
    return {
      supabaseUrl: process.env.SUPABASE_URL || null,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || null,
      websocketNamespace: process.env.WEBSOCKET_NAMESPACE || '/ws/rooms',
    };
  }

  @Get()
  getAdminIndex(@Res() res: Response) {
    return res.render('index', this.getEnvConfig());
  }

  @Get('assets/styles/:filename')
  getStyleFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './src/views/public/styles' });
  }

  @Get('assets/scripts/:filename')
  getScriptFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './src/views/public/scripts' });
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

    return res.sendFile(filename, { root: './src/views/public/media' });
  }

  @Get(':viewName')
  getView(@Param('viewName') viewName: string, @Res() res: Response) {
    return res.render(viewName, this.getEnvConfig());
  }
}
