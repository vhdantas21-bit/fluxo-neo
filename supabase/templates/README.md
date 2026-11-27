# Modelos de e-mail (Supabase Auth)

E-mails do FLUXO NEO em português, com o logo e as cores da marca. Para usar, o projeto precisa de **SMTP próprio** (o Supabase só libera a edição dos modelos com ele): **Authentication → Emails → SMTP Settings**. Depois, em **Authentication → Emails → Templates**, cole em cada modelo o assunto e o HTML do arquivo.

| Modelo no Supabase | Assunto | Arquivo |
|---|---|---|
| Confirm sign up | Confirme seu e-mail no FLUXO NEO | [`confirmation.html`](confirmation.html) |
| Reset password | Redefina sua senha do FLUXO NEO | [`recovery.html`](recovery.html) |
| Change email address | Confirme seu novo e-mail no FLUXO NEO | [`email_change.html`](email_change.html) |
| Magic link or OTP | Seu link de acesso ao FLUXO NEO | [`magic_link.html`](magic_link.html) |

Rodapé de todos os e-mails: suporte em `fluxoneosupport@gmail.com` e link para o site do desenvolvedor (https://neo-digital-studio.vhdantas21.chatgpt.site/).

Variáveis do Supabase usadas: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}`. O logo vem de `https://fluxo-neo-alpha.vercel.app/icon-192.png`; se o domínio do app mudar, troque esse endereço. `preview.html` mostra todos os modelos (com valores de exemplo) e o e-mail padrão atual para comparar.
