import * as figlet from 'figlet';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageJson = require('../../../package.json');

export interface StartupConfig {
  port: number;
  environment: string;
  wsNamespace: string;
  startTime: number;
  auth: {
    apiKey: boolean;
    supabase: boolean;
    appKeys: boolean;
  };
  features: {
    ejsCache: boolean;
    cors: string;
  };
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  // Production colors (blue/purple/cyan gradient)
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  // Dev colors (orange/yellow)
  yellow: '\x1b[33m',
  brightYellow: '\x1b[93m',
  red: '\x1b[31m',
  // Neutral
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

/**
 * Prints the RoomStream ASCII banner with gradient colors.
 * Uses different color schemes for development (orange/yellow) and production (blue/purple/cyan).
 */
export function printBanner(isDev: boolean): void {
  const version = packageJson.version || '0.0.0';
  const c = colors;

  // Generate ASCII art using figlet
  const banner = figlet.textSync('RoomStream', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });

  const lines = banner.split('\n');

  // Gradient colors based on environment
  // Production: blue → magenta → cyan (matching SVG gradient)
  // Dev: yellow → red/orange
  const prodGradient = [
    c.brightBlue,
    c.blue,
    c.magenta,
    c.brightMagenta,
    c.cyan,
    c.brightCyan,
  ];
  const devGradient = [
    c.brightYellow,
    c.yellow,
    c.yellow,
    c.red,
    c.red,
    c.brightYellow,
  ];
  const gradient = isDev ? devGradient : prodGradient;

  console.log('');

  // Print each line with gradient color
  lines.forEach((line, index) => {
    const colorIndex = Math.min(index, gradient.length - 1);
    console.log(`${gradient[colorIndex]}${line}${c.reset}`);
  });

  // Print version and environment badge
  const badge = isDev ? ` ${c.yellow}${c.bold}[DEV]${c.reset}` : '';
  console.log(`${c.gray}${'─'.repeat(60)}${c.reset}`);
  console.log(`${c.gray}v${version}${c.reset}${badge}`);
  console.log('');
}

/**
 * Formats the startup time in a human-readable format.
 */
function formatStartupTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Prints a formatted startup summary with server configuration details.
 */
export function printStartupSummary(config: StartupConfig): void {
  const { port, environment, wsNamespace, startTime, auth, features } = config;
  const baseUrl = `http://localhost:${port}`;
  const startupTime = Date.now() - startTime;

  const check = (enabled: boolean) => (enabled ? '✅' : '❌');

  console.log('');
  console.log(
    '┌─────────────────────────────────────────────────────────────┐',
  );
  console.log(`  🚀 Server running on port ${String(port).padEnd(33)} `);
  console.log(`  ⚡ Started in ${formatStartupTime(startupTime).padEnd(45)} `);
  console.log(
    '├─────────────────────────────────────────────────────────────┤',
  );
  console.log(`  🌍 Environment:    ${environment.padEnd(40)} `);
  console.log(`  🔌 WebSocket:      ${wsNamespace.padEnd(40)} `);
  console.log(
    `  🔗 CORS Origin:    ${features.cors.substring(0, 40).padEnd(40)} `,
  );
  console.log(
    '├─────────────────────────────────────────────────────────────┤',
  );
  console.log(
    '  🔐 Authentication:                                           ',
  );
  console.log(
    `       API Key:     ${check(auth.apiKey)}  ${auth.apiKey ? 'enabled' : 'disabled'}`.padEnd(
      63,
    ) + ' ',
  );
  console.log(
    `       Supabase:    ${check(auth.supabase)}  ${auth.supabase ? 'enabled' : 'disabled'}`.padEnd(
      63,
    ) + ' ',
  );
  console.log(
    `       App Keys:    ${check(auth.appKeys)}  ${auth.appKeys ? 'enabled' : 'disabled'}`.padEnd(
      63,
    ) + ' ',
  );
  console.log(
    '├─────────────────────────────────────────────────────────────┤',
  );
  console.log(
    '  📚 Documentation:                                            ',
  );
  console.log(`       REST API:    ${baseUrl}/docs/api`.padEnd(63) + ' ');
  console.log(`       WebSocket:   ${baseUrl}/docs/async-api`.padEnd(63) + ' ');
  console.log(`       Guide:       ${baseUrl}/platform/guide`.padEnd(63) + ' ');
  console.log(
    '├─────────────────────────────────────────────────────────────┤',
  );
  console.log(`  🖥️  Platform:       ${baseUrl}/platform`.padEnd(62) + ' ');
  console.log(
    '└─────────────────────────────────────────────────────────────┘',
  );
  console.log('');
}
