// Matches the DB binding declared in .openai/hosting.json.
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
  }
}
