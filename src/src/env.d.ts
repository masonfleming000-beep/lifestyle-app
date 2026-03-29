interface ImportMetaEnv {
  readonly DATABASE_URL: string;
  readonly HOST?: string;
  readonly SESSION_COOKIE_NAME?: string;
  readonly SESSION_TTL_DAYS?: string;
  readonly PUBLIC_GOOGLE_CLIENT_ID?: string;
  readonly PUBLIC_APP_URL?: string;
  readonly APP_URL?: string;
  readonly INVITE_ONLY?: string;
  readonly ALLOWED_SIGNUP_EMAILS?: string;
  readonly ALLOWED_ORIGINS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
