import { Module } from '@nestjs/common';
import { ViewsController } from './views.controller';

@Module({
  controllers: [ViewsController],
  providers: [],
})
export class ViewsModule {}
