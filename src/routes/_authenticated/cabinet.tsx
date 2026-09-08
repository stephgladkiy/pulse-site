import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, PaymentDetails, PAY_LINK } from "@/components/payment-details";

export const Route = createFileRoute("/_authenticated/cabinet")({
  head: () => ({
    meta: [
      { title: "Личный кабинет — Pulse" },
      {
        name: "description",
        content:
          "Личный кабинет Pulse: статус подписки, способы оплаты, история платежей и данные аккаунта спортсмена.",
      },
      { property: "og:title", content: "Личный кабинет — Pulse" },
      {
        property: "og:description",
        content: "Управляйте подпиской Pulse и оплатой прямо в личном кабинете.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cabinet,
});

type Sub = {
  id: string;
  plan: string;
  price_eur: number;
  method: string;
  status: string;
  expires_at: string | null;
  created_at: string;
};

function Cabinet() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [planId, setPlanId] = useState<string>("athlete");
  const [method, setMethod] = useState<string>("Ссылка Monobank");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user?.id ?? "")
        .maybeSingle();
      return { email: user?.email ?? "", name: profile?.full_name ?? "" };
    },
  });

  const subs = useQuery({
    queryKey: ["subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, plan, price_eur, method, status, expires_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sub[];
    },
  });

  const active = subs.data?.find(
    (s) => s.status === "active" && (!s.expires_at || new Date(s.expires_at) > new Date()),
  );
  const pending = subs.data?.find((s) => s.status === "pending");
  const plan = PLANS.find((p) => p.id === planId)!;

  const confirmPaid = async () => {
    setSaving(true);
    const { data } = await supabase.auth.getUser();
    await supabase.from("subscriptions").insert({
      user_id: data.user!.id,
      plan: plan.name,
      price_eur: plan.price,
      method,
      note: note || null,
      status: "pending",
    });
    setNote("");
    await qc.invalidateQueries({ queryKey: ["subs"] });
    setSaving(false);
  };

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <div className="aurora-blob-a absolute -top-40 left-1/4 size-[520px] rounded-full bg-aurora-1/40 blur-[140px]" />
        <div className="aurora-blob-c absolute bottom-0 right-1/4 size-[520px] rounded-full bg-aurora-3/35 blur-[150px]" />
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Личный кабинет</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {me.data?.name ? `${me.data.name} · ` : ""}
              {me.data?.email}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="rounded-xl border border-border bg-foreground/5 px-4 py-2.5 text-sm"
            >
              К тренеру
            </Link>
            <button
              onClick={signOut}
              className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground"
            >
              Выйти
            </button>
          </div>
        </header>

        <section className="glass-panel mt-8 p-6">
          <h2 className="text-sm font-medium text-muted-foreground">Статус подписки</h2>
          {active ? (
            <p className="mt-2 font-display text-2xl">
              Активна · {active.plan} — €{active.price_eur}
              {active.expires_at
                ? ` · до ${new Date(active.expires_at).toLocaleDateString("ru-RU")}`
                : ""}
            </p>
          ) : pending ? (
            <p className="mt-2 font-display text-2xl">
              Ожидает подтверждения оплаты · {pending.plan} — €{pending.price_eur}
            </p>
          ) : (
            <p className="mt-2 font-display text-2xl">Подписка не оформлена</p>
          )}
        </section>

        <section className="glass-panel mt-5 p-6">
          <h2 className="text-sm font-medium">Оформить подписку</h2>
          <div className="mt-4 space-y-2.5">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className={
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left " +
                  (p.id === planId
                    ? "border-aurora-1/50 bg-gradient-to-r from-aurora-1/15 to-aurora-2/15"
                    : "border-border bg-foreground/[0.03]")
                }
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {p.name} — €{p.price}/мес
                  </div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <h3 className="mt-6 text-sm font-medium">Способ оплаты</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Ссылка Monobank", "Перевод на карту"].map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={
                  "rounded-lg border px-4 py-2 text-xs font-medium " +
                  (m === method
                    ? "border-aurora-4/50 bg-aurora-4/15 text-aurora-4"
                    : "border-border bg-foreground/[0.03] text-muted-foreground")
                }
              >
                {m}
              </button>
            ))}
          </div>

          <div className="mt-4">
            <PaymentDetails />
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Комментарий к платежу (необязательно)"
            className="mt-4 w-full rounded-xl border border-border bg-foreground/[0.03] px-4 py-3 text-sm focus:outline-none"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={PAY_LINK}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-gradient-to-r from-aurora-1 to-aurora-2 px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Оплатить €{plan.price}
            </a>
            <button
              onClick={confirmPaid}
              disabled={saving}
              className="rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-50"
            >
              {saving ? "Сохраняю…" : "Я оплатил — подтвердить"}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            После нажатия платёж появится в истории со статусом «ожидает подтверждения» — мы
            активируем подписку вручную после проверки поступления.
          </p>
        </section>

        <section className="glass-panel mt-5 p-6">
          <h2 className="text-sm font-medium">История платежей</h2>
          {subs.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Загружаю…</p>
          ) : subs.data && subs.data.length > 0 ? (
            <div className="mt-3 space-y-2">
              {subs.data.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-foreground/[0.03] px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {s.plan} — €{s.price_eur}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("ru-RU")} · {s.method}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.status === "active" ? "активна" : "ожидает подтверждения"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Пока платежей нет.</p>
          )}
        </section>
      </div>
    </div>
  );
}
