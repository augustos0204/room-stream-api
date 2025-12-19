import { Module, Global } from '@nestjs/common';
import { GithubService } from './github.service';
import { GithubController } from './github.controller';

@Global()
@Module({
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
