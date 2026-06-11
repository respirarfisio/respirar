# Respirar Fisioterapeutas — App de Avaliação

App web para registro, cálculo automático e geração de relatórios de avaliações fisioterapêuticas cardiorrespiratórias.

## Funcionalidades

- **Cadastro de pacientes** com dados demográficos e história clínica
- **Avaliações completas** — Teste do Degrau 6 min, PImáx/PEmáx, S-Index, Preensão Palmar, TSL 5 rep, TSL 1 min
- **Cálculos automáticos** de valores preditos (Neder 1999, Albuquerque 2019, Bohannon)
- **Gráficos** de FC, SpO₂, PAS/PAD e BORG ao longo do teste
- **Relatório imprimível** no padrão Respirar (layout do PDF do Francisco Pereira)
- **Exportação PDF** com um clique
- **Histórico** e gráfico de evolução entre avaliações
- **Banco de dados na nuvem** via Firebase Firestore

---

## Configuração

### 1. Clonar o repositório

```bash
git clone https://github.com/SEU_USUARIO/respirar-app.git
cd respirar-app
npm install
```

### 2. Configurar o Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um novo projeto (ex: `respirar-fisioterapeutas`)
3. Vá em **Build → Firestore Database** → crie um banco em **modo de teste** (ou configure regras de segurança)
4. Vá em **Configurações do projeto → Apps → Adicionar app Web**
5. Copie os valores e cole em `src/firebase.js`:

```js
const firebaseConfig = {
  apiKey:            "...",
  authDomain:        "...",
  projectId:         "...",
  storageBucket:     "...",
  messagingSenderId: "...",
  appId:             "...",
}
```

### 3. Ajustar o nome do repositório

Em `vite.config.js`, altere o `base` para o nome exato do seu repositório:

```js
base: '/nome-do-seu-repo/',
```

Em `src/main.jsx`, altere o `basename` do BrowserRouter:

```jsx
<BrowserRouter basename="/nome-do-seu-repo">
```

### 4. Rodar localmente

```bash
npm run dev
```

Abra [http://localhost:5173/respirar-app/](http://localhost:5173/respirar-app/)

---

## Deploy no GitHub Pages

```bash
npm run deploy
```

Isso executa `npm run build` e publica a pasta `dist/` na branch `gh-pages`.

Depois, nas configurações do repositório no GitHub:
- **Settings → Pages → Source → Branch: gh-pages / folder: / (root)**

O app ficará disponível em:
`https://SEU_USUARIO.github.io/respirar-app/`

---

## Equações de referência implementadas

| Teste | Equação | Referência |
|-------|---------|-----------|
| PImáx | 155,3 − 0,80×idade (M) / 110,4 − 0,49×idade (F) | Neder et al., 1999 |
| PEmáx | 165,3 − 0,81×idade (M) / 115,6 − 0,61×idade (F) | Neder et al., 1999 |
| Preensão Palmar | 34,996 − 0,382×idade + 0,174×peso + 13,628×sexo | Conforme relatório |
| Teste do Degrau | (166,9 − idade) + 20,7×sexo | Albuquerque et al., 2019 |
| TSL 5 rep | <10 s (<60a) / <11,4 s (60-69a) / <12,6 s (70-79a) / <14,8 s (≥80a) | Bohannon |
| TSL 1 min | 45 − 0,18×(idade−40) (M) / 42 − 0,18×(idade−40) (F) | Referência interna |

> ⚠️ **Nota sobre o Teste do Degrau:** a fórmula impressa no relatório do Francisco inclui um termo `0,7×FC` que não reproduz o valor predito de 128 rep. A versão implementada sem esse termo bate exatamente com o valor do relatório. Se a planilha usar outra versão, edite `src/calc/referencias.js`.

---

## Estrutura de arquivos

```
src/
├── calc/
│   └── referencias.js     ← Todas as equações de referência
├── components/
│   └── Layout.jsx          ← Topbar + shell
├── pages/
│   ├── Pacientes.jsx       ← Lista de pacientes
│   ├── Paciente.jsx        ← Cadastro + detalhe + evolução
│   ├── Avaliacao.jsx       ← Formulário de avaliação
│   └── Relatorio.jsx       ← Relatório imprimível + exportar PDF
├── utils/
│   ├── avaliacao.js        ← Template de avaliação em branco
│   └── db.js               ← Funções de acesso ao Firestore
├── firebase.js             ← Configuração do Firebase ← EDITE AQUI
├── index.css               ← Design system (tokens da Respirar)
└── main.jsx                ← Roteamento
```

---

## Tecnologias

- **React 18** + **Vite 5**
- **Firebase 10** (Firestore)
- **Recharts** — gráficos
- **html2pdf.js** — exportação de PDF
- **React Router 6**
- **lucide-react** — ícones
- **gh-pages** — deploy automático
