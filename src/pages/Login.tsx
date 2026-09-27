import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { PublicConfig } from "../api/types";
import { GitHubIcon, GitLabIcon } from "../components/Icon";
import { LANGUAGES, LANGUAGE_NAMES, setDocumentLanguage } from "../lib/i18n";

/** Sign-in: only the provider configured for the instance is offered. */
export function LoginPage({ config }: { config: PublicConfig }) {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const error = params.get("error");
  const provider = config.provider === "github" ? "GitHub" : "GitLab";
  return (
    <div className="login">
      <div className="c">
        <img src="/logo.png" alt={t("login.logoAlt")} />
        <h1>Hammurapi</h1>
        <p>{t("login.slogan")}</p>
        <a className="btn" href="/api/v1/auth/login">
          {config.provider === "github" ? <GitHubIcon /> : <GitLabIcon />}
          {t("login.signIn", { provider })}
        </a>
        {error && <div className="err-text" role="alert">{t(`login.errors.${error}`, { defaultValue: t("login.errors.failed") })}</div>}
        <div className="chips langs">
          {LANGUAGES.map((l) => (
            <button key={l} lang={l} className={`chip${i18n.language === l ? " on" : ""}`}
              onClick={() => { i18n.changeLanguage(l); setDocumentLanguage(l); }}>
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
