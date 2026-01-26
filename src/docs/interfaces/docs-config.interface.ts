export interface DocsConfig {
  port: number;
  wsNamespace: string;
  version: string;
  auth: {
    apiKey: boolean;
    supabase: boolean;
  };
}
