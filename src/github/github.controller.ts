import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { GithubService } from './github.service';

@ApiTags('github')
@Controller('api/github')
@Public()
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  /**
   * Returns developer profile data from GitHub API
   * Used by the about page to lazy load data
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get developer GitHub profile' })
  @ApiResponse({
    status: 200,
    description:
      'Developer profile data including user info, repos, languages and social accounts',
  })
  async getProfile() {
    const [user, repos, languages, socialAccounts] = await Promise.all([
      this.githubService.getUser(),
      this.githubService.getRepos(6),
      this.githubService.getTopLanguages(),
      this.githubService.getSocialAccounts(),
    ]);

    return {
      user,
      repos,
      languages,
      socialAccounts,
    };
  }
}
