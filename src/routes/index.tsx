import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { askCoach } from "@/lib/coach.functions";
import { supabase } from "@/integrations/supabase/client";
import { PaymentDetails } from "@/components/payment-details";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — AI-помощник по восстановлению для спортсменов" },
      {
        name: "description",
        content:
          "Отмечайте тренировки, сон, нагрузку и самочувствие — AI составит персональный план восстановления и тренировок. От €3 в месяц.",
      },
      { property: "og:title", content: "Pulse — AI-помощник по восстановлению" },
      {
        property: "og:description",
        content:
          "Дневник тренировок, сна и самочувствия с персональными AI-советами по восстановлению.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Msg = { role: "user" | "assistant"; content: string };

const LOADS = ["Лёгкая", "Средняя", "Тяжёлая"] as const;
const FEELINGS = ["Свежо", "Нейтрально", "Устал"] as const;

function readiness(sleep: number, load: string, feeling: string, rpe: number, hr: number) {
  let s = 40;
  s += Math.min(sleep, 9) * 5;
  s += feeling === "Свежо" ? 14 : feeling === "Нейтрально" ? 6 : -6;
  s += load === "Лёгкая" ? 6 : load === "Средняя" ? 0 : -8;
  s -= (rpe - 5) * 2;
  s -= Math.max(0, hr - 55) * 0.6;
  return Math.max(5, Math.min(100, Math.round(s)));
}

function Index() {
  const [load, setLoad] = useState<string>("Средняя");
  const [feeling, setFeeling] = useState<string>("Свежо");
  const [sleep, setSleep] = useState(7.6);
  const [rpe, setRpe] = useState(6);
  const [hr, setHr] = useState(54);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Привет! Отметьте тренировку, сон и самочувствие — и я подберу нагрузку на сегодня и план восстановления на завтра.",
    },
  ]);
  const [today, setToday] = useState("");

  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session?.user),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {

    setToday(
      new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(),
      ),
    );
    const raw = localStorage.getItem("pulse-log");
    if (raw) {
      try {
        const v = JSON.parse(raw);
        setLoad(v.load ?? "Средняя");
        setFeeling(v.feeling ?? "Свежо");
        setSleep(v.sleep ?? 7.6);
        setRpe(v.rpe ?? 6);
        setHr(v.hr ?? 54);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pulse-log", JSON.stringify({ load, feeling, sleep, rpe, hr }));
  }, [load, feeling, sleep, rpe, hr]);

  const score = useMemo(
    () => readiness(sleep, load, feeling, rpe, hr),
    [sleep, load, feeling, rpe, hr],
  );

  const ask = useServerFn(askCoach);
  const coach = useMutation({
    mutationFn: async (q?: string) =>
      ask({
        data: {
          question: q,
          metrics: { load, sleep, feeling, rpe, restingHr: hr, readiness: score },
          history: messages.slice(-8),
        },
      }),
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", content: res.answer }]),
    onError: (e: Error) =>
      setMessages((m) => [...m, { role: "assistant", content: `Не получилось: ${e.message}` }]),
  });

  const send = (q?: string) => {
    if (coach.isPending) return;
    if (q) setMessages((m) => [...m, { role: "user", content: q }]);
    coach.mutate(q);
  };

  const status =
    score >= 75 ? "Восстановлен · можно тренироваться" : score >= 55 ? "Умеренно · держите средний темп" : "Нужно восстановление";

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <div className="aurora-blob-a absolute -top-40 left-1/4 size-[520px] rounded-full bg-aurora-1/45 blur-[140px]" />
        <div className="aurora-blob-b absolute top-1/3 -right-24 size-[560px] rounded-full bg-aurora-2/45 blur-[150px]" />
        <div className="aurora-blob-c absolute -bottom-32 left-1/3 size-[500px] rounded-full bg-aurora-3/35 blur-[150px]" />
        <div className="aurora-blob-d absolute bottom-1/4 right-1/3 size-[420px] rounded-full bg-aurora-4/30 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-aurora-1 via-aurora-2 to-aurora-3 font-display text-sm font-bold text-primary-foreground">
              P
            </div>
            <div>
              <div className="font-display text-lg font-semibold tracking-tight">Pulse</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                AI-тренер по восстановлению
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-border bg-foreground/5 px-4 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xl sm:inline-block">
              Pro · €6/мес
            </span>
            {signedIn ? (
              <Link
                to="/cabinet"
                className="rounded-xl bg-gradient-to-r from-aurora-1 to-aurora-2 px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Личный кабинет
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="rounded-xl border border-border bg-foreground/5 px-4 py-2.5 text-sm font-medium"
                >
                  Войти
                </Link>
                <Link
                  to="/cabinet"
                  className="rounded-xl bg-gradient-to-r from-aurora-1 to-aurora-2 px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Подписка
                </Link>
              </>
            )}
          </div>

        </header>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{today}</p>
            <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
              Доброе утро, атлет
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-foreground/5 px-4 py-2 text-sm text-muted-foreground backdrop-blur-xl">
            <span className="size-2 rounded-full bg-aurora-4" />
            {status}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-12 gap-5">
          {/* Готовность */}
          <section className="glass-panel col-span-12 p-6 md:col-span-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Готовность</h2>
              <span className="rounded-full bg-aurora-4/15 px-2.5 py-1 text-[11px] font-medium text-aurora-4">
                обновлено сейчас
              </span>
            </div>
            <div className="relative mx-auto mt-4 grid size-44 place-items-center">
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-tr from-aurora-1 via-aurora-2 to-aurora-3 transition-all duration-500"
                style={{
                  mask: "radial-gradient(farthest-side, transparent 66%, #000 68%)",
                  WebkitMask: "radial-gradient(farthest-side, transparent 66%, #000 68%)",
                  opacity: 0.25 + (score / 100) * 0.75,
                }}
              />
              <div className="text-center">
                <div className="font-display text-5xl font-semibold">{score}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  из 100
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Сон</span>
                <span className="font-medium">{sleep.toFixed(1)} ч</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Нагрузка</span>
                <span className="font-medium">{load}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Пульс покоя</span>
                <span className="font-medium">{hr} уд/мин</span>
              </div>
            </div>
          </section>

          {/* AI-тренер */}
          <section className="glass-panel col-span-12 p-6 md:col-span-8">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-aurora-2 to-aurora-3 font-display text-sm font-semibold text-primary-foreground">
                AI
              </div>
              <div>
                <h2 className="text-sm font-medium">Тренер Aura</h2>
                <p className="text-xs text-muted-foreground">
                  Строит план по вашим сегодняшним данным
                </p>
              </div>
            </div>

            <div className="mt-5 max-h-[340px] space-y-3 overflow-y-auto pr-1">
              {messages.map((m, i) =>
                m.role === "assistant" ? (
                  <div
                    key={i}
                    className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm border border-border bg-foreground/5 p-4 text-sm leading-relaxed"
                  >
                    {m.content}
                  </div>
                ) : (
                  <div
                    key={i}
                    className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-gradient-to-r from-aurora-1 to-aurora-2 p-4 text-sm leading-relaxed text-primary-foreground"
                  >
                    {m.content}
                  </div>
                ),
              )}
              {coach.isPending && (
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-foreground/5 p-4 text-sm text-muted-foreground">
                  Анализирую ваши данные…
                </div>
              )}
            </div>

            <form
              className="mt-5 flex items-center gap-2 rounded-full border border-border bg-background/60 p-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const q = question.trim();
                if (!q) return;
                setQuestion("");
                send(q);
              }}
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Спросите про тренировку, сон или нагрузку…"
                className="w-full bg-transparent px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none"
              />
              <button
                type="submit"
                disabled={coach.isPending}
                className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-50"
              >
                Спросить
              </button>
            </form>
          </section>

          {/* Тарифы / план */}
          <section className="glass-panel col-span-12 p-6 md:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Подписка</h2>
              <span className="text-xs text-muted-foreground">€3–10 в месяц</span>
            </div>
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-3 rounded-xl border border-border bg-foreground/[0.03] px-4 py-3">
                <div className="size-9 rounded-lg bg-aurora-4/15 text-center text-sm leading-9 text-aurora-4">
                  1
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Старт — €3</div>
                  <div className="text-xs text-muted-foreground">
                    Дневник и базовый AI-совет раз в день
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-foreground/[0.03] px-4 py-3">
                <div className="size-9 rounded-lg bg-aurora-2/15 text-center text-sm leading-9 text-aurora-2">
                  2
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Атлет — €6</div>
                  <div className="text-xs text-muted-foreground">
                    Безлимит вопросов тренеру и планы на неделю
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-foreground/[0.03] px-4 py-3">
                <div className="size-9 rounded-lg bg-aurora-3/15 text-center text-sm leading-9 text-aurora-3">
                  3
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Команда — €10</div>
                  <div className="text-xs text-muted-foreground">Экспорт данных для тренера</div>
                </div>
              </div>
            </div>

            <h3 className="mt-6 text-sm font-medium">Способы оплаты</h3>
            <div className="mt-3">
              <PaymentDetails />
            </div>
            <Link
              to="/cabinet"
              className="mt-4 block rounded-xl bg-foreground py-3 text-center text-sm font-semibold text-background"
            >
              Оформить подписку в кабинете
            </Link>
          </section>


          {/* Ввод данных */}
          <section className="glass-panel col-span-12 p-6 md:col-span-5">
            <h2 className="text-sm font-medium">Отметить день</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">Нагрузка на тренировке</label>
                <div className="mt-1.5 flex gap-2">
                  {LOADS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLoad(l)}
                      className={
                        l === load
                          ? "flex-1 rounded-lg border border-aurora-1/40 bg-gradient-to-r from-aurora-1/20 to-aurora-2/20 py-2 text-xs font-medium"
                          : "flex-1 rounded-lg border border-border bg-foreground/[0.03] py-2 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">
                  Часы сна — {sleep.toFixed(1)}
                </label>
                <input
                  type="range"
                  min={3}
                  max={11}
                  step={0.1}
                  value={sleep}
                  onChange={(e) => setSleep(Number(e.target.value))}
                  className="mt-2 w-full accent-aurora-1"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Тяжесть по ощущениям (RPE) — {rpe}</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  className="mt-2 w-full accent-aurora-2"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Пульс покоя, уд/мин</label>
                <input
                  type="number"
                  value={hr}
                  min={30}
                  max={120}
                  onChange={(e) => setHr(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-border bg-foreground/[0.03] px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Самочувствие</label>
                <div className="mt-1.5 flex gap-2">
                  {FEELINGS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFeeling(f)}
                      className={
                        f === feeling
                          ? "flex-1 rounded-lg border border-aurora-4/40 bg-aurora-4/15 py-2 text-xs font-medium text-aurora-4"
                          : "flex-1 rounded-lg border border-border bg-foreground/[0.03] py-2 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => send()}
                disabled={coach.isPending}
                className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background disabled:opacity-50"
              >
                {coach.isPending ? "Считаю план…" : "Обновить мой план"}
              </button>
            </div>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Pulse · адаптивное восстановление для спортсменов · €3–10/мес · не заменяет врача
        </p>
      </div>
    </div>
  );
}
