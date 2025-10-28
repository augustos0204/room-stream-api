import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';

@Controller('admin')
export class ViewsController {
  // Rota principal - serve index.html em /admin
  @Get()
  getAdminIndex(@Res() res: Response) {
    return res.sendFile('index.html', { root: './src/views/public' });
  }

  // Estilos CSS - /admin/assets/styles/:filename
  @Get('assets/styles/:filename')
  getStyleFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './src/views/public/styles' });
  }

  // Scripts JavaScript - /admin/assets/scripts/:filename
  @Get('assets/scripts/:filename')
  getScriptFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './src/views/public/scripts' });
  }

  // Mídias (SVG, PNG, ICO, etc) - /admin/assets/media/:filename
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

  // Views HTML - /admin/:viewName
  @Get(':viewName')
  getView(@Param('viewName') viewName: string, @Res() res: Response) {
    const fileName = `${viewName}.html`;
    return res.sendFile(fileName, { root: './src/views/public' });
  }
}
