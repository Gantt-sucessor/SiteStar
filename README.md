# Holocron: Star Wars RPG Edição Saga

Site para jogar o **Star Wars RPG Edição Saga** com os amigos: fichas automáticas, salas de campanha com código, rolagens que chegam ao mestre na hora e a abertura clássica dos filmes.

## O que tem

- **Login com Google ou Discord.**
- **Abertura dos filmes** depois do login: "Há muito tempo, numa galáxia muito, muito distante....", o logo encolhendo e o texto subindo em perspectiva, com a música. Cada campanha pode ter a sua própria abertura, e o mestre pode exibi-la para todos ao mesmo tempo.
- **Criação de ficha em 10 passos**: conceito, espécie (as 17 do livro), classe (Jedi, Nobre, Vigarista, Batedor, Soldado), habilidades (compra de pontos, pacote padrão, 4d6 ou manual), perícias, talentos, aptidão, poderes da Força, equipamento com créditos rolados e revisão. Uma prévia mostra PV, defesas e limiar ao vivo.
- **Ficha automática**: PV, Reflexo, Fortitude, Vontade, limiar de dano, BBA, perícias, curso da condição, Pontos de Força, Destino, Lado Sombrio e subir de nível com rolagem de PV. Clicar em qualquer número faz a rolagem.
- **Painel do mestre**:
  - código da sala;
  - fichas dos jogadores ao vivo, que o mestre pode abrir e editar (aplicar dano, por exemplo);
  - rolagens em tempo real com aviso sonoro;
  - rolagens secretas;
  - rastreador de iniciativa (as rolagens de Iniciativa entram sozinhas);
  - anotações secretas;
  - editor da abertura.

## Como colocar no ar (uns 15 minutos, tudo gratuito)

### 1. Supabase (banco de dados e login)

1. Crie uma conta em [supabase.com](https://supabase.com) e um **New project**.
2. Abra **SQL Editor → New query**, cole todo o conteúdo de [supabase/schema.sql](supabase/schema.sql) e clique **Run**.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Na pasta do projeto, copie `.env.example` para `.env` e preencha:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

### 2. Login com Discord

1. Em [discord.com/developers/applications](https://discord.com/developers/applications), clique em **New Application**, depois vá em **OAuth2**.
2. Em **Redirects**, adicione `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
3. Copie o **Client ID** e o **Client Secret**.
4. No Supabase, em **Authentication → Providers → Discord**, ative o provedor e cole os dois valores.

### 3. Login com Google

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), vá em **Create credentials → OAuth client ID → Web application**.
2. Em **Authorized redirect URIs**, adicione `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
3. Se o Google pedir, configure a "OAuth consent screen" (tipo External) e adicione seus amigos como test users, ou publique o app.
4. No Supabase, em **Authentication → Providers → Google**, ative o provedor e cole o Client ID e o Secret.

### 4. URLs permitidas

Em **Authentication → URL Configuration**:

- **Site URL**: o endereço final do site (por exemplo `https://holocron.vercel.app`).
- **Redirect URLs**: adicione `http://localhost:5173/**` e `https://holocron.vercel.app/**`.

### 5. A música

Coloque o arquivo da música de abertura em `public/audio/tema.mp3`.

### 6. Rodar e publicar

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

Para publicar: suba a pasta para o GitHub, importe o repositório na [Vercel](https://vercel.com) e, em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. O arquivo `vercel.json` já cuida das rotas.

## Como jogar

- **Mestre**: na Ponte, clique em **Nova campanha** e passe o código de 6 letras para a mesa.
- **Jogadores**: digitem o código em **Entrar numa campanha**, criem o personagem (ou tragam um já pronto) e rolem direto da ficha.
- **Rolador livre**: o botão de d20 no canto inferior esquerdo aceita fórmulas como `1d20+5`, `3d8+2` e `4d6kh3`.

## Estrutura

| Caminho | O que é |
|---|---|
| `src/data/rules.js` | Regras do livro: espécies, classes, perícias, talentos, aptidões, poderes, armas, armaduras e equipamento |
| `src/lib/character.js` | Cálculos da ficha (defesas, PV, perícias, ataques) |
| `src/components/Sheet.jsx` | Ficha interativa |
| `src/components/Crawl.jsx` | Abertura no estilo dos filmes |
| `src/pages/CampaignPage.jsx` | Visões do mestre e do jogador |
| `supabase/schema.sql` | Tabelas, segurança (RLS) e tempo real |

## Multiclasse e classes de prestígio

- **Subir de nível** abre uma tela para escolher entre continuar na classe, pegar uma nova classe heróica (multiclasse) ou entrar numa das **12 classes de prestígio** do livro. A tela confere os requisitos de cada uma.
- A ficha soma o BBA de cada classe, usa o maior bônus de defesa entre elas, rola os PV com o dado da classe escolhida e conta aptidões, talentos bônus, Técnicas e Segredos da Força por classe.
- Em **Detalhes → Classes e níveis** dá para corrigir os níveis manualmente.

## NPCs e ameaças (mestre)

> Antes de usar, rode [supabase/npcs.sql](supabase/npcs.sql) no **SQL Editor** do Supabase. Isso só precisa ser feito uma vez.

- **Fichas prontas do livro:** 46 fichas dos capítulos 11, 15 e 16:
  - arquétipos: stormtrooper, soldado rebelde, clone, bandido, assassino...;
  - personagens dos filmes: Vader, Yoda, Boba Fett, Grievous...;
  - dróides e bestas: wampa, rancor, nexu...
  Dá para adicionar várias cópias de uma vez (Stormtrooper 1, 2, 3...).
- **Gerador de NPC não heróico**, pelas regras da p. 277: escolha nível, atributos, armadura, armas e perícias, e ele calcula PV, defesas, ataques e o ND estimado.
- **Em cena** (aba Mesa):
  - cards com PV, dano/cura e condição;
  - botões de iniciativa, percepção e ataques de cada NPC;
  - **Rolar iniciativa de todos**, que alimenta a ordem de combate.
- **Dificuldade do encontro** e **XP**, calculados pelas regras do cap. 14: soma dos ND ÷ 3 comparada ao nível do grupo, com XP pela Tabela 14-1.
- As rolagens dos NPCs podem ser **secretas** (só o mestre vê). Os jogadores nunca veem as fichas dos NPCs.

## Limitações conhecidas

- **Fora do cálculo automático:**
  - veículos e naves;
  - aumentos de habilidade por nível, que são registrados em **Detalhes → Valores de habilidade**;
  - pré-requisitos de talentos e de classes de prestígio, que são exibidos mas não bloqueiam a escolha (o mestre decide).
