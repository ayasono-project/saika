// src/api/auth/discordOAuthService.ts
// Discord OAuth2 / REST 通信（fetch ベース・Fastify 非依存でテスト容易）

import { DiscordApiError } from "@ayasono/shared/core";
import { DISCORD_API_BASE, DISCORD_OAUTH_SCOPES } from "./authConstants";

/** Discord トークンエンドポイントのレスポンス */
export interface DiscordTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/** Discord ユーザー（GET /users/@me） */
export interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

/** OAuth2 で取得するユーザーの所属ギルド（GET /users/@me/guilds の一部） */
export interface DiscordPartialGuild {
  id: string;
  name: string;
  /** ギルドアイコンハッシュ（未設定で null） */
  icon: string | null;
  owner: boolean;
  /** 権限ビットフィールド（文字列・64bit のため BigInt で判定する） */
  permissions: string;
}

/** DiscordOAuthService の構成 */
export interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  /** OAuth2 redirect_uri（API のコールバック URL） */
  redirectUri: string;
}

/**
 * Discord OAuth2 認可・トークン交換・ユーザー/ギルド取得・失効を担うサービス。
 * Fastify に依存せず fetch のみを使うため、単体テストで fetch をモックできる。
 */
export class DiscordOAuthService {
  private readonly config: DiscordOAuthConfig;

  constructor(config: DiscordOAuthConfig) {
    this.config = config;
  }

  /**
   * Discord 認可画面の URL を組み立てる。
   * @param state CSRF 防止用 state
   */
  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      scope: DISCORD_OAUTH_SCOPES.join(" "),
      state,
      prompt: "none",
    });
    return `${DISCORD_API_BASE}/oauth2/authorize?${params.toString()}`;
  }

  /**
   * 認可コードをアクセストークン・リフレッシュトークンに交換する。
   */
  async exchangeCode(code: string): Promise<DiscordTokenResponse> {
    return this.requestToken({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
    });
  }

  /**
   * リフレッシュトークンでアクセストークンを再取得する。
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<DiscordTokenResponse> {
    return this.requestToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
  }

  /**
   * トークンエンドポイントへの共通リクエスト。
   */
  private async requestToken(
    body: Record<string, string>,
  ): Promise<DiscordTokenResponse> {
    const res = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        ...body,
      }),
    });
    if (!res.ok) {
      throw new DiscordApiError(
        `Discord token request failed (${res.status})`,
        res.status,
      );
    }
    return (await res.json()) as DiscordTokenResponse;
  }

  /**
   * アクセストークンでログインユーザー情報を取得する。
   */
  async fetchUser(accessToken: string): Promise<DiscordUser> {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new DiscordApiError(
        `Discord user fetch failed (${res.status})`,
        res.status,
      );
    }
    return (await res.json()) as DiscordUser;
  }

  /**
   * アクセストークンでユーザーの所属ギルド一覧を取得する。
   */
  async fetchUserGuilds(accessToken: string): Promise<DiscordPartialGuild[]> {
    const res = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new DiscordApiError(
        `Discord guilds fetch failed (${res.status})`,
        res.status,
      );
    }
    return (await res.json()) as DiscordPartialGuild[];
  }

  /**
   * トークンを失効させる（ログアウト時・ベストエフォート、失敗しても例外は投げない）。
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await fetch(`${DISCORD_API_BASE}/oauth2/token/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          token,
        }),
      });
    } catch {
      // 失効失敗はログアウト完了を妨げない
    }
  }
}
