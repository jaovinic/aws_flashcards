# ☁️ AWS Flashcards Hub & Simulado Completo

[![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?style=flat-square&logo=github)](https://jaovinic.github.io/aws_flashcards/)
[![HTML5](https://img.shields.io/badge/HTML5-Pure-orange?style=flat-square&logo=html5)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Custom%20Properties-blue?style=flat-square&logo=css3)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES6+-yellow?style=flat-square&logo=javascript)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

Uma aplicação web interativa, moderna, autocontida e 100% estática para estudo acelerado e preparação prática para certificações da **Amazon Web Services (AWS)**, como **Cloud Practitioner (CLF-C02)** e **Solutions Architect - Associate (SAA-C03)**.

---

> [!IMPORTANT]
>
> ### ⚠️ Aviso Legal / Disclaimer Educacional
>
> Este é um projeto de código aberto **independente e estritamente educacional**, criado pela comunidade para apoiar o aprendizado de arquitetura e serviços em nuvem. **Este projeto não é afiliado, patrocinado, homologado ou endossado pela Amazon Web Services (AWS) ou pela Amazon.com, Inc.** Todas as marcas registradas, logotipos e nomes de serviços pertencem aos seus respectivos proprietários.

---

## 🎯 Visão Geral

O **AWS Flashcards Hub** reúne em um único lugar mais de duas centenas de cartões de memorização técnica e um simulado de avaliação de conhecimentos com correção instantânea, funcionando totalmente no navegador (client-side), sem necessidade de instalação de dependências ou envio de dados a servidores externos.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AWS FLASHCARDS HUB                              │
├───────────────────┬───────────────────────────────┬────────────────────┤
│  📂 CATEGORIAS    │  🔍 BUSCA GLOBAL             │  📝 SIMULADO       │
│  38 módulos em    │  Pesquisa em tempo real       │  36 questões com   │
│  7 domínios       │  por termos, siglas e serviços│  gabarito e tempo  │
└───────────────────┴───────────────────────────────┴────────────────────┘
```

---

## ✨ Principais Recursos

### 🗂️ 246 Flashcards Técnicos em 38 Categorias

- **Dois Modos de Visualização:**
  - **Modo Grade (Grid):** Visualize todos os cartões do tópico simultaneamente com animação 3D de flip ao clicar.
  - **Modo Estudo 1 a 1 (Carrossel):** Foco individual cartão a cartão com botões de navegação e atalhos de teclado.
- **Ferramentas de Estudo:**
  - 🔄 **Virar Todos:** Vira instantaneamente todos os cartões para testar a memória reversa.
  - 🔀 **Embaralhar:** Aleatoriza a sequência para evitar memorização pela ordem de aparição.
  - 🔊 **Leitura em Voz Alta (Text-to-Speech):** Utiliza a Web Speech API nativa para reproduzir a pronúncia e o conteúdo dos cards.
  - ✓ **Controle de Progresso:** Marque cards individualmente ou em lote como "Estudados", acompanhando sua evolução em cada categoria.

### 📝 Simulado Completo com Avaliação Instantânea

- **36 Questões Objetivas** no padrão dos exames de certificação.
- **Cronômetro Ativo** para simular a gestão de tempo da prova real.
- **Nota de Corte Automatizada (70%)** com mensagem contextual de feedback.
- **Diagnóstico por Domínio Técnico:** Gráficos/barras de precisão discriminando pontos fortes e tópicos a reforçar.
- **Gabarito Completo:** Explicação detalhada da alternativa correta e dos motivos pelos quais as demais opções são inadequadas.

### 🔍 Busca Global Instantânea

- Campo de pesquisa que varre instantaneamente os **246 flashcards** por termos, conceitos, nomes de serviços ou siglas técnicas (ex: _REST_, _MFA_, _NAT_, _SPOF_, _Aurora_, _IaC_).

### ⭐ Sistema de Favoritos & Persistência Local

- Marque qualquer cartão com uma estrela ⭐ para criar sua própria lista de revisão rápida de tópicos difíceis.
- Todo o histórico de progresso, favoritos e respostas do simulado é salvo automaticamente no `localStorage` do seu navegador.

### 🌓 Interface e Usabilidade

- **Temas Escuro (Dark) e Claro (Light)** com paleta contrastante e botões de troca rápida.
- **100% Responsivo:** Adaptado para celulares, tablets e monitores de alta resolução.
- **Menu Lateral Inteligente:** Organizado por domínios e com barra de filtro rápido de assuntos.

---

## 🗺️ Domínios e Tópicos Cobertos

O conteúdo está estruturado de acordo com os pilares fundamentais da computação em nuvem:

| Domínio                               | Categorias Abordadas | Exemplos de Serviços / Conceitos                                                               |
| :------------------------------------ | :------------------- | :--------------------------------------------------------------------------------------------- |
| **💻 Computação & Contêineres**       | 6 categorias         | EC2, Lightsail, Auto Scaling, Elastic Beanstalk, Docker, ECS, EKS, Fargate, Lambda             |
| **💾 Armazenamento & Banco de Dados** | 5 categorias         | S3, RDS, Aurora, DynamoDB, Redshift, Data Lakes & Lakehouses                                   |
| **🌐 Redes & Entrega de Conteúdo**    | 4 categorias         | VPC, Subnets, NAT Gateway, Route 53, CloudFront (CDN), Elastic Load Balancing (ALB/NLB)        |
| **🔒 Segurança, IAM & Governança**    | 6 categorias         | IAM (Users, Roles, Policies, MFA), Responsabilidade Compartilhada, GuardDuty, Shield, Artifact |
| **🛠️ Gerenciamento & Automação**      | 7 categorias         | CloudWatch, CloudTrail, AWS Config, Systems Manager, CloudFormation, APIs REST, AWS CLI        |
| **📐 Frameworks & Melhores Práticas** | 6 categorias         | Well-Architected (6 Pilares), AWS CAF (6 Perspectivas), Confiabilidade, Resiliência, Multi-AZ  |
| **💰 Custos & Faturamento**           | 4 categorias         | Modelos de Preço, Instâncias Reservadas, Savings Plans, Trusted Advisor, Otimização de Custos  |

---

## 🛡️ Segurança, Privacidade e Arquitetura

- **Zero Dependências Externas:** Desenvolvido puramente em **HTML5**, **CSS3** e **JavaScript (ES6+)**. Não utiliza frameworks volumosos (React, Vue, Angular) nem requer gerenciadores de pacotes (`npm`, `yarn`).
- **Execução 100% Client-Side:** Todas as ações ocorrem localmente no navegador do usuário.
- **Nenhum Dado Coletado:** O site não possui telemetria, cookies rastreadores, formulários de autenticação ou envio de requisições de rede para servidores externos.
- **Compatível com Modo Offline:** Uma vez carregado, funciona perfeitamente mesmo sem conexão com a internet.

---

## 🚀 Como Executar

### Opção 1: Acesso Online (GitHub Pages)

Acesse diretamente em seu navegador:
👉 **[https://jaovinic.github.io/aws_flashcards/](https://jaovinic.github.io/aws_flashcards/)**

### Opção 2: Execução Local

1. Clone o repositório em sua máquina:

   ```bash
   git clone https://github.com/jaovinic/aws_flashcards.git
   cd aws_flashcards
   ```

2. Abra o arquivo `index.html` em qualquer navegador:
   - **Windows (PowerShell):** `Start-Process index.html`
   - **Linux:** `xdg-open index.html`
   - **macOS:** `open index.html`
   - Ou simplesmente clique duas vezes sobre o arquivo `index.html`.

_(Opcional)_ Se preferir rodar com um servidor estático local:

```bash
# Com Python 3:
python -m http.server 8080

# Ou com Node (npx):
npx serve .
```

---

## ⌨️ Atalhos e Dicas de Uso

- **Virar Cartão:** Clique em qualquer flashcard para alternar entre frente (termo/pergunta) e verso (definição técnica).
- **Favoritar:** Clique no ícone de estrela ⭐ no topo do cartão para guardá-lo na seção de favoritos.
- **Ouvir Pronúncia:** Clique no ícone de alto-falante 🔊 no modo de estudo 1 a 1 para acionar o sintetizador de voz.
- **Reiniciar Progresso:** Utilize o botão **"🔄 Reset"** no topo da barra de navegação caso queira limpar os registros de estudo e reiniciar do zero.

---

## 🤝 Contribuições

Contribuições da comunidade são muito bem-vindas! Se você deseja adicionar novos cards, aprimorar explicações ou sugerir novas questões para o simulado:

1. Faça um **Fork** do projeto.
2. Crie uma branch para sua modificação: `git checkout -b feature/nova-categoria`.
3. Faça o commit de suas alterações: `git commit -m "feat: adiciona flashcards de AWS KMS"`.
4. Envie para o GitHub: `git push origin feature/nova-categoria`.
5. Abra um **Pull Request**.

---

## 📄 Licença

Este projeto está licenciado sob os termos da licença [MIT](LICENSE). Consulte o arquivo de licença para obter mais informações.
