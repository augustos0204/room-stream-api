import { Injectable, Logger } from '@nestjs/common';

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  twitter_username: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly GITHUB_API = 'https://api.github.com';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly CACHE_ENABLED = process.env.GITHUB_CACHE_ENABLED !== 'false';

  // Cache simples em memória
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor() {
    if (!this.CACHE_ENABLED) {
      this.logger.warn('GitHub cache is DISABLED (GITHUB_CACHE_ENABLED=false)');
    }
  }

  /**
   * Busca dados do usuário do GitHub
   */
  async getUser(username: string): Promise<GitHubUser | null> {
    const cacheKey = `user:${username}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.GITHUB_API}/users/${username}`, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'RoomStream-API',
        },
      });

      if (!response.ok) {
        this.logger.error(`GitHub API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch GitHub user: ${error.message}`);
      return null;
    }
  }

  /**
   * Busca repositórios públicos do usuário
   */
  async getRepos(
    username: string,
    limit = 6,
  ): Promise<GitHubRepo[]> {
    const cacheKey = `repos:${username}:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.GITHUB_API}/users/${username}/repos?sort=updated&per_page=${limit}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'RoomStream-API',
          },
        },
      );

      if (!response.ok) {
        this.logger.error(`GitHub API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch GitHub repos: ${error.message}`);
      return [];
    }
  }

  /**
   * Busca linguagens mais usadas nos repositórios
   */
  async getTopLanguages(username: string): Promise<string[]> {
    const repos = await this.getRepos(username, 30);
    const languages = repos
      .map((repo) => repo.language)
      .filter((lang): lang is string => !!lang);

    // Conta ocorrências e retorna as mais usadas
    const counts = languages.reduce(
      (acc, lang) => {
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([lang]) => lang);
  }

  private getFromCache(key: string): any | null {
    if (!this.CACHE_ENABLED) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    if (!this.CACHE_ENABLED) return;
    
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
