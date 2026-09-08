export const PAY_LINK = "https://send.monobank.ua/9S5NNXS7kp";

export const PLANS = [
  { id: "start", name: "Старт", price: 3, desc: "Дневник и базовый AI-совет раз в день" },
  { id: "athlete", name: "Атлет", price: 6, desc: "Безлимит вопросов тренеру и планы на неделю" },
  { id: "team", name: "Команда", price: 10, desc: "Экспорт данных для тренера" },
] as const;

export function PaymentDetails() {
  return (
    <div className="space-y-3">
      <a
        href={PAY_LINK}
        target="_blank"
        rel="noreferrer"
        className="block rounded-xl border border-aurora-2/40 bg-gradient-to-r from-aurora-1/15 to-aurora-2/15 px-4 py-3"
      >
        <div className="text-sm font-medium">Оплатить по ссылке — Monobank</div>
        <div className="mt-0.5 break-all text-xs text-muted-foreground">{PAY_LINK}</div>
      </a>
      <div className="rounded-xl border border-border bg-foreground/[0.03] px-4 py-3">
        <div className="text-sm font-medium">Перевод на карту</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Реквизиты карты открываются по той же ссылке Monobank — там же указан получатель. В
          комментарии к переводу укажите вашу почту, чтобы подписка привязалась к аккаунту.
        </div>
      </div>
    </div>
  );
}
