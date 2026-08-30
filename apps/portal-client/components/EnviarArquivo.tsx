"use client";

import { css, SANS } from "@aguiar/ui";
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { usePortal } from "@/components/PortalProvider";
import { acceptOf, uploadFile } from "@/lib/arquivos";

/**
 * O botão que abre o seletor de arquivo e envia.
 *
 * É um `<label>` com um `<input type="file">` escondido dentro, e não um
 * `<button>` que chama `input.click()`: o `<label>` já abre o seletor por
 * conta própria, inclusive pelo teclado, e continua fazendo isso se o
 * JavaScript demorar a carregar. Um botão que finge ser um seletor perde as
 * duas coisas.
 *
 * Ele não sabe o que fazer com o arquivo depois — devolve o caminho e sai.
 * Quem grava é a tela que o usou, cada uma na sua Server Action.
 */
export function EnviarArquivo({
  bucket,
  onDone,
  children,
  style,
  className,
  disabled,
}: {
  bucket: string;
  onDone: (path: string) => void | Promise<void>;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  disabled?: boolean;
}) {
  const { d, a } = usePortal();
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  const inert = busy || disabled;

  return (
    <label
      htmlFor={inputId}
      className={inert ? undefined : className}
      style={{
        ...css(`cursor:pointer;font:600 12.5px ${SANS}`),
        ...style,
        ...(inert ? css("opacity:.6;cursor:progress") : null),
      }}
    >
      {busy ? "Enviando…" : children}
      <input
        id={inputId}
        type="file"
        accept={acceptOf(bucket)}
        disabled={inert}
        style={css("position:absolute;width:1px;height:1px;opacity:0;pointer-events:none")}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          // O valor é limpo SEMPRE, e antes de qualquer espera: sem isso,
          // escolher o mesmo arquivo de novo — depois de um erro, que é
          // justamente quando a pessoa tenta de novo — não dispara evento
          // nenhum, porque para o navegador nada mudou.
          e.target.value = "";
          if (!file) return;

          setBusy(true);
          const r = await uploadFile(bucket, d.business.id, file);
          if (r.ok) await onDone(r.path);
          else a.notify(r.message, "error");
          setBusy(false);
        }}
      />
    </label>
  );
}
