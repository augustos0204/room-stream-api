import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from './common/decorators';
import { GithubService } from './github/github.service';

@Controller()
export class AppController {
  constructor(private readonly githubService: GithubService) {}

  @Get()
  @Public()
  async getLanding(@Res() res: Response) {
    const [githubUser, githubRepos, topLanguages, socialAccounts] =
      await Promise.all([
        this.githubService.getUser(),
        this.githubService.getRepos(6),
        this.githubService.getTopLanguages(),
        this.githubService.getSocialAccounts(),
      ]);

    return res.render('landing', {
      githubUser,
      githubRepos,
      topLanguages,
      socialAccounts,
    });
  }
}
