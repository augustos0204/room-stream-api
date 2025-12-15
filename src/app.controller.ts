import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from './common/decorators';

@Controller()
export class AppController {
  @Get()
  @Public()
  getLanding(@Res() res: Response) {
    return res.render('landing');
  }
}
