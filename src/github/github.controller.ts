import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators';
import { GithubService } from './github.service';

// GitHub username for the profile
const GITHUB_USERNAME = 'Augustos0204';

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
    description: 'Developer profile data including user info, repos, languages and social accounts',
  })
  async getProfile() {
    const [user, repos, languages, socialAccounts] = await Promise.all([
      this.githubService.getUser(GITHUB_USERNAME),
      this.githubService.getRepos(GITHUB_USERNAME, 6),
      this.githubService.getTopLanguages(GITHUB_USERNAME),
      this.githubService.getSocialAccounts(GITHUB_USERNAME),
    ]);

    return {
      user,
      repos,
      languages,
      socialAccounts,
    };
  }
}
