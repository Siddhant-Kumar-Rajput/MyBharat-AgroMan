import type { Copy } from "../lib/i18n";
import { InfoHint } from "./InfoHint";
export function LanguageStatus({
  copy: t,
  busy,
  failed,
  progress,
  background,
  machine,
  onRetry,
}: {
  copy: Copy;
  busy: boolean;
  failed: boolean;
  progress: number;
  background: boolean;
  machine: boolean;
  onRetry: () => void;
}) {
  if (!busy && !failed && !machine) return null;
  return (
    <div className="language-status">
      {busy && (
        <p role="status">
          {t.translationWorking}
        </p>
      )}
      {failed && (
        <div className="language-failure" role="alert">
          <span>{t.languageUnavailable}</span>
          <button className="secondary" type="button" onClick={onRetry}>
            {t.languageRetry}
          </button>
        </div>
      )}
      {machine && !busy && !failed && (
        <InfoHint copy={t} title={t.language}>
          <p>{t.languageMachineNote}</p>
          {background && <p>{t.languageBackground.replace("{percent}", String(progress))}</p>}
        </InfoHint>
      )}
    </div>
  );
}
