import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Schema = z.object({
  question: z.string().max(500).optional(),
  metrics: z.object({
    load: z.string(),
    sleep: z.number(),
    feeling: z.string(),
    rpe: z.number(),
    restingHr: z.number(),
    readiness: z.number(),
  }),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .default([]),
});

const SYSTEM = `Ты — Aura, персональный AI-тренер по восстановлению для спортсменов.
Отвечай по-русски, кратко (3-5 предложений), конкретно: интенсивность на сегодня, что делать завтра, сон и питание.
Опирайся строго на переданные данные атлета. Не ставь медицинских диагнозов; при тревожных симптомах советуй обратиться к врачу.`;

export const askCoach = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI недоступен: нет ключа");

    const m = data.metrics;
    const facts = `Данные атлета: нагрузка «${m.load}», сон ${m.sleep} ч, самочувствие «${m.feeling}», RPE ${m.rpe}/10, пульс покоя ${m.restingHr} уд/мин, расчётная готовность ${m.readiness}/100.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: facts },
          ...data.history,
          {
            role: "user",
            content:
              data.question?.trim() ||
              "Составь план восстановления и тренировок на сегодня и завтра.",
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Слишком много запросов, попробуйте через минуту.");
      if (res.status === 402) throw new Error("Закончились кредиты AI. Пополните баланс рабочего пространства.");
      throw new Error(`AI-сервис вернул ошибку (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = json.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("Пустой ответ от AI");
    return { answer };
  });
