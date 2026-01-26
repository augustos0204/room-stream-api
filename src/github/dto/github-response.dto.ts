import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * GitHub user data
 */
export class GitHubUserDto {
  @ApiProperty({
    description: 'GitHub username',
    example: 'octocat',
  })
  login: string;

  @ApiPropertyOptional({
    description: 'User display name',
    example: 'The Octocat',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://github.com/images/error/octocat_happy.gif',
  })
  avatar_url: string;

  @ApiProperty({
    description: 'GitHub profile URL',
    example: 'https://github.com/octocat',
  })
  html_url: string;

  @ApiPropertyOptional({
    description: 'User bio',
    example: 'A passionate developer',
    nullable: true,
  })
  bio: string | null;

  @ApiPropertyOptional({
    description: 'User location',
    example: 'San Francisco, CA',
    nullable: true,
  })
  location: string | null;

  @ApiPropertyOptional({
    description: 'User company',
    example: '@github',
    nullable: true,
  })
  company: string | null;

  @ApiPropertyOptional({
    description: 'User blog/website',
    example: 'https://github.blog',
    nullable: true,
  })
  blog: string | null;

  @ApiPropertyOptional({
    description: 'Twitter username',
    example: 'github',
    nullable: true,
  })
  twitter_username: string | null;

  @ApiProperty({
    description: 'Number of public repositories',
    example: 42,
  })
  public_repos: number;

  @ApiProperty({
    description: 'Number of followers',
    example: 1000,
  })
  followers: number;

  @ApiProperty({
    description: 'Number of following',
    example: 50,
  })
  following: number;

  @ApiProperty({
    description: 'Account creation date',
    example: '2011-01-25T18:44:36Z',
  })
  created_at: string;
}

/**
 * GitHub repository data
 */
export class GitHubRepoDto {
  @ApiProperty({
    description: 'Repository name',
    example: 'hello-world',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Repository description',
    example: 'My first repository on GitHub!',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Repository URL',
    example: 'https://github.com/octocat/hello-world',
  })
  html_url: string;

  @ApiPropertyOptional({
    description: 'Primary programming language',
    example: 'TypeScript',
    nullable: true,
  })
  language: string | null;

  @ApiProperty({
    description: 'Number of stars',
    example: 100,
  })
  stargazers_count: number;

  @ApiProperty({
    description: 'Number of forks',
    example: 25,
  })
  forks_count: number;

  @ApiProperty({
    description: 'Repository topics/tags',
    example: ['nodejs', 'typescript', 'api'],
    type: [String],
  })
  topics: string[];

  @ApiPropertyOptional({
    description: 'Last update timestamp',
    example: '2024-01-10T12:00:00Z',
    nullable: true,
  })
  updated_at?: string;
}

/**
 * GitHub social account
 */
export class GitHubSocialAccountDto {
  @ApiProperty({
    description: 'Social platform provider',
    example: 'linkedin',
  })
  provider: string;

  @ApiProperty({
    description: 'Social profile URL',
    example: 'https://linkedin.com/in/octocat',
  })
  url: string;
}

/**
 * Latest public activity
 */
export class GitHubLatestActivityDto {
  @ApiProperty({
    description: 'Event type',
    example: 'PushEvent',
  })
  type: string;

  @ApiPropertyOptional({
    description: 'Repository info related to the event',
    example: { name: 'octocat/hello-world', url: 'https://github.com/octocat/hello-world' },
    nullable: true,
  })
  repo: {
    name: string;
    url: string;
  } | null;

  @ApiProperty({
    description: 'Activity timestamp',
    example: '2024-01-10T12:00:00Z',
  })
  created_at: string;
}

/**
 * Programming language statistics
 */
export class LanguageStatDto {
  @ApiProperty({
    description: 'Programming language name',
    example: 'TypeScript',
  })
  name: string;

  @ApiProperty({
    description: 'Percentage of usage',
    example: 45.5,
  })
  percentage: number;

  @ApiProperty({
    description: 'Number of repositories using this language',
    example: 10,
  })
  count: number;
}

/**
 * DTO for GET /api/github/profile response
 */
export class GithubProfileResponseDto {
  @ApiPropertyOptional({
    description: 'GitHub user data',
    type: GitHubUserDto,
    nullable: true,
    example: {
      login: 'octocat',
      name: 'The Octocat',
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      html_url: 'https://github.com/octocat',
      bio: 'A passionate developer',
      location: 'San Francisco, CA',
      public_repos: 42,
      followers: 1000,
      following: 50,
      created_at: '2011-01-25T18:44:36Z',
    },
  })
  user: GitHubUserDto | null;

  @ApiProperty({
    description: 'Recent public repositories',
    type: [GitHubRepoDto],
    example: [
      {
        name: 'hello-world',
        description: 'My first repository!',
        html_url: 'https://github.com/octocat/hello-world',
        language: 'TypeScript',
        stargazers_count: 100,
        forks_count: 25,
        topics: ['nodejs', 'typescript'],
      },
    ],
  })
  repos: GitHubRepoDto[];

  @ApiProperty({
    description: 'Top programming languages',
    type: [LanguageStatDto],
    example: [
      { name: 'TypeScript', percentage: 45.5, count: 10 },
      { name: 'JavaScript', percentage: 30.0, count: 8 },
    ],
  })
  languages: LanguageStatDto[];

  @ApiProperty({
    description: 'Social accounts linked to GitHub',
    type: [GitHubSocialAccountDto],
    example: [
      { provider: 'linkedin', url: 'https://linkedin.com/in/octocat' },
    ],
  })
  socialAccounts: GitHubSocialAccountDto[];

  @ApiPropertyOptional({
    description: 'Latest public GitHub activity',
    type: GitHubLatestActivityDto,
    nullable: true,
  })
  lastActivity: GitHubLatestActivityDto | null;
}
