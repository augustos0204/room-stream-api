import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from './common/decorators';
import { GithubService } from './github/github.service';

const GITHUB_USERNAME = 'Augustos0204';

@Controller()
export class AppController {
  constructor(private readonly githubService: GithubService) {}

  @Get()
  @Public()
  async getLanding(@Res() res: Response) {
    const [githubUser, githubRepos, topLanguages, socialAccounts] = await Promise.all([
      this.githubService.getUser(GITHUB_USERNAME),
      this.githubService.getRepos(GITHUB_USERNAME, 6),
      this.githubService.getTopLanguages(GITHUB_USERNAME),
      this.githubService.getSocialAccounts(GITHUB_USERNAME),
    ]);

    return res.render('landing', {
      githubUser,
      githubRepos,
      topLanguages,
      socialAccounts,
    });
  }
}
