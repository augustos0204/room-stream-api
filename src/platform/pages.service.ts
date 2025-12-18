import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface PageRoute {
  name: string; // 'rooms'
  file: string; // 'rooms.ejs'
  path: string; // '/platform/rooms'
  filePath: string; // Caminho absoluto do arquivo
  isDynamic: boolean; // Se tem parâmetros dinâmicos
  params?: string[]; // Parâmetros dinâmicos ['id']
}

/**
 * Página que é o container do SPA (não deve ser incluída no loop)
 */
const SPA_CONTAINER = 'index';

@Injectable()
export class PagesService implements OnModuleInit {
  private readonly logger = new Logger(PagesService.name);
  private pages: Map<string, PageRoute> = new Map();
  private pagesDir: string;
  private platformDir: string;

  onModuleInit() {
    // __dirname aponta para dist/platform após compilação
    this.pagesDir = path.join(__dirname, 'pages');
    this.platformDir = __dirname;
    this.discoverPages();
  }

  /**
   * Escaneia a pasta /pages e registra todas as rotas
   */
  private discoverPages(): void {
    if (!fs.existsSync(this.pagesDir)) {
      this.logger.warn(`Pasta /pages não encontrada em: ${this.pagesDir}`);
      return;
    }

    this.scanDirectory(this.pagesDir, '');

    this.logger.log(`${this.pages.size} páginas descobertas`);
  }

  /**
   * Escaneia um diretório recursivamente
   */
  private scanDirectory(dir: string, prefix: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isFile() && entry.name.endsWith('.ejs')) {
        this.registerPage(entry.name, fullPath, prefix);
      }

      if (entry.isDirectory()) {
        // Suporte para rotas dinâmicas [param]
        if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
          const paramName = entry.name.slice(1, -1);
          this.scanDirectory(fullPath, `${prefix}/:${paramName}`);
        } else {
          // Subdiretório normal
          this.scanDirectory(fullPath, `${prefix}/${entry.name}`);
        }
      }
    }
  }

  /**
   * Registra uma página no mapa de rotas
   */
  private registerPage(fileName: string, filePath: string, prefix: string): void {
    const name = fileName.replace('.ejs', '');
    const isDynamic = prefix.includes(':');

    // Monta o path da rota
    let routePath: string;
    if (name === 'index') {
      routePath = prefix || '/platform';
      if (routePath !== '/platform') {
        routePath = `/platform${routePath}`;
      }
    } else {
      routePath = `/platform${prefix}/${name}`;
    }

    // Normaliza o path (remove barras duplicadas)
    routePath = routePath.replace(/\/+/g, '/');

    // Extrai parâmetros dinâmicos
    const params = isDynamic
      ? (routePath.match(/:(\w+)/g) || []).map((p) => p.slice(1))
      : undefined;

    // Key única para o mapa
    const key = name === 'index' && prefix ? `index:${prefix}` : name;

    this.pages.set(key, {
      name,
      file: fileName,
      path: routePath,
      filePath,
      isDynamic,
      params,
    });

    this.logger.log(`📄 ${routePath} → pages${prefix}/${fileName}`);
  }

  /**
   * Retorna todas as páginas registradas
   */
  getAllPages(): PageRoute[] {
    return Array.from(this.pages.values());
  }

  /**
   * Retorna apenas páginas estáticas (não dinâmicas)
   */
  getStaticPages(): PageRoute[] {
    return this.getAllPages().filter((p) => !p.isDynamic);
  }

  /**
   * Retorna apenas páginas do SPA (exibidas dentro do index.ejs)
   * Exclui apenas o container 'index'
   */
  getSpaPages(): PageRoute[] {
    return this.getAllPages().filter((p) => p.name !== SPA_CONTAINER && !p.isDynamic);
  }

  /**
   * Retorna nomes das páginas SPA para o loop de includes
   */
  getSpaPageNames(): string[] {
    return this.getSpaPages().map((p) => p.name);
  }

  /**
   * Verifica se existe uma página standalone em public/
   */
  hasStandalonePage(name: string): boolean {
    const standalonePath = path.join(this.platformDir, 'public', `${name}.ejs`);
    return fs.existsSync(standalonePath);
  }

  /**
   * Verifica se uma página é do SPA (está em pages/ e não é o container)
   * Todas as páginas em pages/ são SPA, exceto 'index'
   */
  isSpaPage(name: string): boolean {
    return this.hasPage(name) && name !== SPA_CONTAINER;
  }

  /**
   * Busca uma página pelo nome
   */
  getPage(name: string): PageRoute | undefined {
    return this.pages.get(name);
  }

  /**
   * Verifica se uma página existe
   */
  hasPage(name: string): boolean {
    return this.pages.has(name);
  }

  /**
   * Retorna nomes válidos de páginas (para validação)
   */
  getValidPageNames(): string[] {
    return Array.from(this.pages.keys()).filter(
      (k) => !k.startsWith('index:') && !k.includes(':'),
    );
  }

  /**
   * Retorna o caminho do template relativo para renderização
   * @param pageName Nome da página
   * @returns Caminho relativo do template (ex: 'pages/rooms')
   */
  getTemplatePath(pageName: string): string | null {
    const page = this.getPage(pageName);
    if (!page) return null;

    // Retorna caminho relativo sem extensão
    return `pages/${pageName}`;
  }

  /**
   * Busca a página que corresponde a um path
   * Útil para matching de rotas dinâmicas
   */
  findPageByPath(requestPath: string): PageRoute | null {
    // Primeiro tenta match exato
    for (const page of this.pages.values()) {
      if (page.path === requestPath) {
        return page;
      }
    }

    // Depois tenta match com parâmetros dinâmicos
    for (const page of this.pages.values()) {
      if (page.isDynamic && this.matchDynamicPath(page.path, requestPath)) {
        return page;
      }
    }

    return null;
  }

  /**
   * Verifica se um path corresponde a uma rota dinâmica
   */
  private matchDynamicPath(pattern: string, path: string): boolean {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      // Se é um parâmetro dinâmico, aceita qualquer valor
      if (patternPart.startsWith(':')) {
        continue;
      }

      // Se não é dinâmico, deve ser igual
      if (patternPart !== pathPart) {
        return false;
      }
    }

    return true;
  }
}
