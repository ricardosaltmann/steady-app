# SteadySync Protocol Tracker 💉✨

> **Plataforma avançada para farmacocinética, monitoramento e gestão clínica de reposição hormonal (TRT/HRT), peptídeos regenerativos e agonistas GLP-1.**

🌐 **Acesso Online (Produção Netlify):** [https://willowy-naiad-b45d00.netlify.app/](https://willowy-naiad-b45d00.netlify.app/)

---

## 🚀 Funcionalidades Principais

1. **Curva Farmacocinética de Níveis Séricos**:
   - Modelagem de 1 compartimento (Equação de Bateman: absorção de 1ª ordem + eliminação exponencial).
   - Projeção de doses futuras a partir de protocolos ativos e sobreposição de injeções passadas.
   - Escalas clínicas calibradas ($ng/dL$, $pg/mL$, $mg$ ativos, $UI$).
   - Faixas de referência clínicas customizáveis.

2. **Divisão & Catálogo Amplo de Compostos**:
   - **Esteroides & TRT**: Testosterona (Cipionato, Enantato, Propionato, Sustanon/Durateston, Undecanoato), Deca/NPP, Masteron, Primobolan, Trembolona, Oxandrolona.
   - **Peptídeos & GLP-1**: Tirzepatida (Mounjaro), Semaglutida (Ozempic), Retatrutida, BPC-157, TB-500, CJC-1295 + Ipamorelina, GHK-Cu, KPV, e blends combinados (**GLOW Protocol**, **KLOW Protocol**, **Wolverine Blend**).
   - **Fertilidade & TPC**: hCG (Choriomon/Ovidrel), Clomid, Tamoxifeno, Anastrozol, Cabergolina.
   - **Hormônios Femininos (HRT)**: Estradiol (Valerato/Cipionato), Progesterona bioidêntica.
   - **Gestão Inteligente de Farmácia**: Ativação/desativação individual ou por categoria com filtros dinâmicos no cabeçalho.

3. **Calculadora de Diluição & Reconstituição (Modelo Cellgenic)**:
   - Cálculo automático de diluição com água bacteriostática.
   - Seringa de insulina interativa com desenho vetorial SVG e preenchimento dinâmico do êmbolo.
   - Suporte a seringas U-100 de $1.0mL$ ($100$ UI), $0.5mL$ ($50$ UI) e $0.3mL$ ($30$ UI).
   - Presets clínicos de 1 clique para os principais peptídeos do mercado.

4. **Guia de Rotação Anatômica de Aplicações**:
   - Rastreamento dos últimos locais de injeção (Deltoides, Glúteos, Ventroglúteos, Vastos Laterais e Subcutâneo).
   - Alerta visual para prevenção de fibrose e acúmulo tecidual.

5. **Exames Laboratoriais & Diário de Sintomas**:
   - Comparativo de laudos de exames com marcadores (Testosterona Total/Livre, Estradiol, SHBG, Hematócrito, etc.).
   - Registro diário de disposição, libido, humor, sono, retenção hídrica e pressão arterial.

6. **Painel de Gestão & Manutenção do Administrador (Área Master)**:
   - Acesso exclusivo para administradores (`admin@steady.app`).
   - Gestão de usuários e testadores com exportação em CSV.
   - Telemetria de uso e ranking dos compostos mais administrados.
   - Biblioteca global para inclusão de novos compostos em tempo real.
   - Chave de modo manutenção.

7. **Infraestrutura em Nuvem (Supabase + PostgreSQL + RLS)**:
   - Autenticação segura com Row Level Security (RLS) para isolamento estrito e sigilo médico.
   - Modo 1-Clique Demo para testes rápidos de avaliadores.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19 + TypeScript + Vite 8
- **Estilização**: Tailwind CSS v4 (Design System Dark Mode cirúrgico)
- **Gráficos**: Recharts (Gradientes e áreas farmacocinéticas)
- **Ícones**: Lucide React
- **Backend & Banco de Dados**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)
- **Hospedagem**: Netlify & Cloudflare

---

## 💻 Como Rodar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/SEU_USUARIO/steady.git
cd steady
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` baseado no `.env.example`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-publica
```

### 4. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```

Abra [http://127.0.0.1:5173/](http://127.0.0.1:5173/) no seu navegador.

---

## 📦 Build para Produção

```bash
npm run build
```
Os arquivos otimizados serão gerados no diretório `dist/`.

---

© SteadySync • Plataforma Clínica de Acompanhamento Hormonal e Peptídeos
