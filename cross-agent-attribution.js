(function () {
  'use strict';

  const SESSION_KEY = 'sp_funnel_attribution_v2';
  const LANGUAGE_KEY = 'sp_cross_agent_language_v1';
  const params = new URLSearchParams(location.search);
  const explicitRoute = String(params.get('route_id') || '').trim().slice(0, 100);
  const PERSONAL_CHECKOUT = 'https://buy.stripe.com/4gM9AU3sE1YLcoM4FB6Zy0T';
  const SUPPORTED_LANGS = ['en', 'ja', 'ko', 'zh'];
  const originalText = new WeakMap();

  const meta = {
    en: { title: 'Cross-Agent Operating Kit | Stratum Praxis', description: "Keep your AI team's operating brain portable across Claude Code, Codex, Cursor and other runtimes." },
    ja: { title: 'Cross-Agent Operating Kit | Stratum Praxis', description: 'Claude Code、Codex、Cursorを切り替えても、ルール・権限・状態・安全境界を持ち運べるAI運用基盤キット。' },
    ko: { title: 'Cross-Agent Operating Kit | Stratum Praxis', description: 'Claude Code, Codex, Cursor를 바꿔도 규칙, 권한, 상태, 안전 경계를 유지하는 AI 운영 인프라 키트.' },
    zh: { title: 'Cross-Agent Operating Kit | Stratum Praxis', description: '切换 Claude Code、Codex、Cursor 时，仍可保留规则、权限、状态与安全边界的 AI 运营基础套件。' }
  };

  const COPY = {
    'Main site': ['メインサイト','메인 사이트','主站'],
    'Portable AI operating infrastructure · v1.0': ['持ち運べるAI運用基盤 · v1.0','이식 가능한 AI 운영 인프라 · v1.0','可迁移的 AI 运营基础设施 · v1.0'],
    'Keep the': ['運用の','운영의','保留你的'],
    'brain.': ['頭脳は残す。','두뇌는 유지하고.','运营大脑。'],
    'Change the agent.': ['エージェントだけ変える。','에이전트만 바꾸세요.','只更换 Agent。'],
    'Claude Code today. Codex tomorrow. Cursor for one developer. Your project rules, permissions, state and safety boundaries should survive the switch.': ['今日はClaude Code、明日はCodex。使うAgentが変わっても、ルール・権限・状態・安全境界は残せます。','오늘은 Claude Code, 내일은 Codex. Agent가 바뀌어도 규칙, 권한, 상태, 안전 경계는 유지됩니다.','今天用 Claude Code，明天换 Codex。无论 Agent 如何切换，规则、权限、状态和安全边界都能保留。'],
    'Get Personal — $69 →': ['Personalを購入 — $69 →','Personal 구매 — $69 →','购买 Personal — $69 →'],
    "See what's inside": ['内容を見る','구성 보기','查看内容'],
    'One-time purchase · Verified buyer delivery · Markdown + YAML · No subscription': ['買い切り · 購入確認後に提供 · Markdown + YAML · サブスクなし','일회성 구매 · 구매 확인 후 제공 · Markdown + YAML · 구독 없음','一次性购买 · 验证付款后交付 · Markdown + YAML · 无订阅'],
    'Agent Lab · ongoing field notes →': ['Agent Lab · 実践記録 →','Agent Lab · 실전 기록 →','Agent Lab · 实践记录 →'],
    'Operating architecture': ['運用アーキテクチャ','운영 아키텍처','运营架构'],
    'Portable': ['PORTABLE','PORTABLE','PORTABLE'],
    'Owned by you': ['あなたが所有','사용자 소유','由你拥有'],
    'Goals · rules · skills · state · permissions · stop conditions': ['目標 · ルール · スキル · 状態 · 権限 · 停止条件','목표 · 규칙 · 스킬 · 상태 · 권한 · 중지 조건','目标 · 规则 · 技能 · 状态 · 权限 · 停止条件'],
    'Runtime adapter': ['ランタイムアダプター','런타임 어댑터','运行时适配器'],
    'Execution layer': ['実行レイヤー','실행 레이어','执行层'],
    'Repository · cloud · browser · test · publish · deploy': ['リポジトリ · クラウド · ブラウザ · テスト · 公開 · デプロイ','리포지토리 · 클라우드 · 브라우저 · 테스트 · 게시 · 배포','代码库 · 云端 · 浏览器 · 测试 · 发布 · 部署'],
    'Portable policy': ['持ち運べるポリシー','이식 가능한 정책','可迁移策略'],
    'One operating brain, multiple runtimes.': ['ひとつの運用頭脳を複数ランタイムで。','하나의 운영 두뇌를 여러 런타임에서.','一个运营大脑，对应多个运行环境。'],
    'Human gates': ['Human Gate','Human Gate','Human Gate'],
    'Define exactly where autonomy stops.': ['自律実行を止める境界を定義。','자율 실행의 중지 경계를 정의합니다.','明确自主执行的停止边界。'],
    'Cost guards': ['コストガード','비용 가드','成本护栏'],
    'Budget, token, quota and retry controls.': ['予算・トークン・クォータ・再試行を制御。','예산, 토큰, 할당량, 재시도를 제어합니다.','控制预算、Token、配额与重试。'],
    'Migration ready': ['移行対応','마이그레이션 준비','迁移就绪'],
    'Move state without moving every conversation.': ['会話全部ではなく、状態を引き継ぐ。','대화 전체가 아니라 상태를 이전합니다.','无需搬走全部对话，也能迁移状态。'],
    'The kit': ['キット内容','키트 구성','套件内容'],
    'Not a prompt pack.': ['プロンプト集ではない。','프롬프트 모음이 아닙니다.','不是提示词合集。'],
    'An operating layer.': ['運用レイヤーです。','운영 레이어입니다.','而是一层运营系统。'],
    'Everything is designed to be copied into a real project and adapted, not merely read.': ['読むためではなく、実プロジェクトへ入れて使うための構成です。','읽기보다 실제 프로젝트에 적용하도록 설계했습니다.','不是只供阅读，而是为了直接放进真实项目中使用。'],
    '01 · MASTER POLICY': ['01 · マスターポリシー','01 · 마스터 정책','01 · 主策略'],
    'Goals, source of truth, permissions, human gates, security, failure policy, cost policy, quality gates and Definition of Done.': ['目標、正本、権限、Human Gate、セキュリティ、失敗時・コスト・品質・完了条件を定義。','목표, 진실 기준, 권한, Human Gate, 보안, 실패·비용·품질·완료 조건을 정의합니다.','定义目标、事实来源、权限、Human Gate、安全、失败、成本、质量与完成条件。'],
    '02 · ADAPTERS': ['02 · アダプター','02 · 어댑터','02 · 适配器'],
    'Keep runtime-specific behavior at the edge instead of duplicating your company policy across tools.': ['共通ポリシーは一つ。各ツール固有の挙動だけを分離。','공통 정책은 하나로 두고 도구별 동작만 분리합니다.','共同策略保持一份，只分离各工具特有行为。'],
    '03 · RELIABILITY': ['03 · 信頼性','03 · 신뢰성','03 · 可靠性'],
    'Detect objective, permission, completion, cost, retry, truth, lock-in and duplicate-rule conflicts.': ['目的・権限・完了・コスト・再試行・正本・ロックイン・重複ルールの衝突を検出。','목표, 권한, 완료, 비용, 재시도, 진실 기준, 종속성, 중복 규칙 충돌을 감지합니다.','检测目标、权限、完成、成本、重试、事实来源、锁定与重复规则冲突。'],
    '04 · CONTROL': ['04 · 制御','04 · 제어','04 · 控制'],
    'L0 read-only through L5 human-only. Separate tool access from permission to perform high-impact actions.': ['L0読み取り専用からL5人間限定まで。アクセス権と高影響アクション権限を分離。','L0 읽기 전용부터 L5 사람 전용까지. 접근 권한과 고영향 작업 권한을 분리합니다.','从 L0 只读到 L5 仅限人工，将访问权与高影响操作权限分开。'],
    '05 · GUARDRAILS': ['05 · ガードレール','05 · 가드레일','05 · 护栏'],
    'Explicit retry limits, no silent paid fallback, circuit breakers and safe recovery sequence.': ['再試行上限、有料フォールバック禁止、サーキットブレーカー、安全な復旧順序。','재시도 제한, 자동 유료 폴백 금지, 회로 차단기, 안전한 복구 순서.','重试上限、禁止静默付费回退、熔断器与安全恢复顺序。'],
    '06 · PORTABILITY': ['06 · ポータビリティ','06 · 이식성','06 · 可迁移性'],
    'Cross-agent migration checklist, state handoff template and a 50-point policy maturity score.': ['Agent間移行チェックリスト、State Handoff、50点の成熟度スコア。','Agent 간 마이그레이션 체크리스트, 상태 인계, 50점 성숙도 점수.','跨 Agent 迁移清单、状态交接与 50 分成熟度评分。'],
    'Personal license · purchase fit': ['Personalライセンス','Personal 라이선스','Personal 许可'],
    'Know what happens after payment.': ['購入後の流れも明確に。','결제 후 흐름도 명확하게.','付款后的流程也很清楚。'],
    'Personal is the shortest route for one operator applying the kit to their own projects. The files remain editable and local to the project; the buyer workspace is the delivery surface, not a recurring SaaS dependency.': ['Personalは、自分のプロジェクトで使う一人の運用者向け。ファイルは編集可能で、継続SaaSへの依存はありません。','Personal은 자신의 프로젝트에 적용하는 1인 운영자용입니다. 파일은 편집 가능하며 반복 SaaS 의존이 없습니다.','Personal 面向在自己项目中使用的单人运营者。文件可编辑，无需依赖持续订阅的 SaaS。'],
    'Your first implementation': ['最初の導入','첫 구현','首次实施'],
    'From purchase to a governed agent project.': ['購入から運用開始まで。','구매에서 운영 시작까지.','从购买到正式运行。'],
    'Copy the master AGENTS.md policy into the project root.': ['AGENTS.mdをプロジェクト直下へ配置。','AGENTS.md를 프로젝트 루트에 배치.','将 AGENTS.md 放入项目根目录。'],
    'Select the Claude, Codex or Cursor adapter used by that project.': ['使うClaude / Codex / Cursorアダプターを選択。','사용할 Claude / Codex / Cursor 어댑터 선택.','选择 Claude / Codex / Cursor 适配器。'],
    'Set Human Gates and budget, token, quota and retry limits.': ['Human Gateと予算・トークン・クォータ・再試行上限を設定。','Human Gate와 예산·토큰·할당량·재시도 제한 설정.','设置 Human Gate 与预算、Token、配额、重试上限。'],
    'Run the policy-conflict check before granting execution access.': ['実行権限を与える前にポリシー衝突を確認。','실행 권한 전에 정책 충돌 확인.','授予执行权限前先检查策略冲突。'],
    'Use the migration checklist and state handoff when changing runtimes.': ['ランタイム変更時は移行チェックとState Handoffを使用。','런타임 변경 시 마이그레이션 체크와 상태 인계 사용.','切换运行环境时使用迁移清单与状态交接。'],
    'Choose Personal if': ['Personal向け','Personal이 맞는 경우','适合 Personal 的情况'],
    'The license fits this use.': ['この用途ならPersonal。','이 용도라면 Personal.','这种用途适合 Personal。'],
    'One purchaser': ['購入者1名','구매자 1명','1 位购买者'],
    'Your own projects': ['自分のプロジェクト','본인 프로젝트','自己的项目'],
    'You want editable Markdown + YAML': ['編集できるMarkdown + YAMLが欲しい','편집 가능한 Markdown + YAML','需要可编辑的 Markdown + YAML'],
    'You do not need client implementation rights': ['クライアント導入権は不要','클라이언트 구현 권한 불필요','不需要客户实施权'],
    'Need to use the kit in client work? Choose Commercial or Agency below. Personal is not the correct license for that use.': ['クライアント案件で使う場合はCommercialまたはAgencyを選択。','클라이언트 업무에는 Commercial 또는 Agency를 선택하세요.','客户项目请选 Commercial 或 Agency。'],
    'Before checkout': ['購入前','결제 전','购买前'],
    'Know exactly what you are buying.': ['買うものを明確に。','무엇을 사는지 명확하게.','明确你购买的内容。'],
    'The v1.0 kit is a reusable operating layer for real projects: master policy, runtime adapters, conflict checks, human-gate rules, cost guardrails and migration/state handoff. It is delivered through verified buyer access after Stripe confirms payment.': ['v1.0は実プロジェクト向けの再利用可能な運用レイヤー。ポリシー、アダプター、衝突チェック、Human Gate、コストガード、移行・状態引継ぎを含みます。','v1.0은 실제 프로젝트용 재사용 운영 레이어입니다. 정책, 어댑터, 충돌 검사, Human Gate, 비용 가드, 마이그레이션·상태 인계를 포함합니다.','v1.0 是可复用的真实项目运营层，包括策略、适配器、冲突检查、Human Gate、成本护栏、迁移与状态交接。'],
    'Delivery model': ['提供形式','제공 방식','交付方式'],
    'Owned files, not another locked dashboard.': ['ロックされた画面ではなく、所有できるファイル。','잠긴 대시보드가 아닌 소유 가능한 파일.','不是锁定面板，而是你拥有的文件。'],
    'The operating layer stays editable and portable. The buyer workspace verifies access; the implementation itself lives with your project.': ['運用レイヤーは編集・移行可能。購入者画面はアクセス確認用で、実装はプロジェクト側に残ります。','운영 레이어는 편집·이식 가능하며 구현은 프로젝트에 남습니다.','运营层可编辑、可迁移，真正的实现留在你的项目中。'],
    '6 operating components': ['6つの運用コンポーネント','6개 운영 구성 요소','6 个运营组件'],
    'Policy, adapters, reliability, control, guardrails, portability.': ['Policy / Adapter / Reliability / Control / Guardrails / Portability','Policy / Adapter / Reliability / Control / Guardrails / Portability','Policy / Adapter / Reliability / Control / Guardrails / Portability'],
    'Markdown + YAML': ['Markdown + YAML','Markdown + YAML','Markdown + YAML'],
    'Editable project files, not a locked SaaS dashboard.': ['編集可能なプロジェクトファイル。','편집 가능한 프로젝트 파일.','可编辑的项目文件。'],
    'One-time purchase': ['買い切り','일회성 구매','一次性购买'],
    'No subscription for the v1.0 kit.': ['v1.0にサブスクなし。','v1.0 구독 없음.','v1.0 无订阅。'],
    'Buyer access': ['購入者アクセス','구매자 액세스','购买者访问'],
    'Payment confirmation routes to the verified access flow.': ['決済確認後に購入者アクセスへ。','결제 확인 후 구매자 액세스로 이동.','付款确认后进入购买者访问流程。'],
    'One-time licenses': ['買い切りライセンス','일회성 라이선스','一次性许可'],
    'Buy once. Own your operating layer.': ['一度買って、運用レイヤーを所有する。','한 번 구매하고 운영 레이어를 소유하세요.','一次购买，拥有你的运营层。'],
    'Choose the license by how the kit will be used. The operating components stay the same; implementation rights change.': ['用途に合わせてライセンスを選択。中身は同じで、利用権だけが変わります。','용도에 맞춰 라이선스를 선택하세요. 구성은 같고 사용 권한만 다릅니다.','按用途选择许可。组件相同，实施权限不同。'],
    'one-time': ['買い切り','일회성','一次性'],
    'Full v1.0 operating kit': ['v1.0フルキット','v1.0 전체 키트','完整 v1.0 套件'],
    'Verified buyer workspace': ['購入者用アクセス','구매자 전용 액세스','购买者专属访问'],
    'Get Personal — $69 one-time →': ['Personal — $69・買い切り →','Personal — $69 일회성 →','Personal — $69 一次性 →'],
    'Best for operators': ['運用者向け','운영자 추천','适合运营者'],
    'One business / operator': ['1事業 / 1運用者','사업 1개 / 운영자 1명','1 个业务 / 1 位运营者'],
    'Client implementation use': ['クライアント導入可','클라이언트 구현 가능','可用于客户实施'],
    'Get Commercial →': ['Commercialを購入 →','Commercial 구매 →','购买 Commercial →'],
    'One agency / team': ['1エージェンシー / チーム','에이전시 / 팀 1개','1 个机构 / 团队'],
    'Multiple client projects': ['複数クライアント案件','여러 클라이언트 프로젝트','多个客户项目'],
    'Get Agency →': ['Agencyを購入 →','Agency 구매 →','购买 Agency →'],
    'The principle': ['原則','원칙','原则'],
    'Models are replaceable.': ['モデルは交換できる。','모델은 교체할 수 있습니다.','模型可以替换。'],
    'Your operating knowledge is an asset.': ['運用知識は資産として残す。','운영 지식은 자산으로 남습니다.','运营知识应作为资产保留。'],
    'Keep Brain, Policy, Skills and State on your side of the boundary.': ['Brain / Policy / Skills / Stateは自分側に残す。','Brain / Policy / Skills / State는 사용자 쪽에 남기세요.','Brain / Policy / Skills / State 留在你这一侧。']
  };

  function mapCopy(text, lang) {
    if (lang === 'en' || !COPY[text]) return text;
    const i = lang === 'ja' ? 0 : lang === 'ko' ? 1 : 2;
    return COPY[text][i] || text;
  }

  function preferredLanguage() {
    const urlLang = String(params.get('lang') || '').toLowerCase();
    if (SUPPORTED_LANGS.includes(urlLang)) return urlLang;
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (SUPPORTED_LANGS.includes(saved)) return saved;
    } catch (_) {}
    const browser = String(navigator.language || 'en').toLowerCase();
    if (browser.startsWith('ja')) return 'ja';
    if (browser.startsWith('ko')) return 'ko';
    if (browser.startsWith('zh')) return 'zh';
    return 'en';
  }

  function translateNode(node, lang) {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const raw = originalText.has(node) ? originalText.get(node) : node.nodeValue;
    if (!originalText.has(node)) originalText.set(node, raw);
    const trimmed = raw.trim();
    if (!trimmed || !COPY[trimmed]) {
      node.nodeValue = raw;
      return;
    }
    const left = raw.match(/^\s*/)[0];
    const right = raw.match(/\s*$/)[0];
    node.nodeValue = left + mapCopy(trimmed, lang) + right;
  }

  function translatePage(lang) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = 'en';
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    document.documentElement.dataset.uiLanguage = lang;
    document.title = meta[lang].title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', meta[lang].description);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) { translateNode(node, lang); });
    document.querySelectorAll('[data-lang-choice]').forEach(function (button) {
      const active = button.dataset.langChoice === lang;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.classList.toggle('active', active);
    });
    try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (_) {}
  }

  function injectTypographyRelief() {
    if (document.getElementById('cross-agent-text-relief')) return;
    const style = document.createElement('style');
    style.id = 'cross-agent-text-relief';
    style.textContent = `
      body[data-funnel="cross_agent_operating_kit"]{font-size:14.5px;line-height:1.76}
      body[data-funnel="cross_agent_operating_kit"] .hero{min-height:620px;padding-top:72px;padding-bottom:72px;gap:72px}
      body[data-funnel="cross_agent_operating_kit"] .hero h1{max-width:660px;font-size:clamp(44px,5.4vw,70px);line-height:1.03;letter-spacing:-.042em;font-weight:630;margin-bottom:28px}
      body[data-funnel="cross_agent_operating_kit"] .lead{max-width:610px;font-size:clamp(15.5px,1.2vw,18px);line-height:1.72;color:#a2aea9}
      body[data-funnel="cross_agent_operating_kit"] .kicker{font-size:9px;font-weight:680;letter-spacing:.11em;margin-bottom:24px;opacity:.9}
      body[data-funnel="cross_agent_operating_kit"] .section{padding:118px 0}
      body[data-funnel="cross_agent_operating_kit"] .section-tight{padding-top:88px}
      body[data-funnel="cross_agent_operating_kit"] .section-head{gap:72px;margin-bottom:52px}
      body[data-funnel="cross_agent_operating_kit"] .section h2{max-width:680px;font-size:clamp(32px,3.8vw,50px);line-height:1.12;letter-spacing:-.035em;font-weight:610}
      body[data-funnel="cross_agent_operating_kit"] .section-intro{font-size:12.5px;line-height:1.78;max-width:430px;color:#84918c}
      body[data-funnel="cross_agent_operating_kit"] .kit-grid{gap:16px}
      body[data-funnel="cross_agent_operating_kit"] .kit-card{padding:28px;min-height:230px}
      body[data-funnel="cross_agent_operating_kit"] .kit-card:nth-child(1),body[data-funnel="cross_agent_operating_kit"] .kit-card:nth-child(2){min-height:250px}
      body[data-funnel="cross_agent_operating_kit"] .kit-card h3{font-size:clamp(18px,1.6vw,23px);line-height:1.24;font-weight:610;margin-top:36px;margin-bottom:12px}
      body[data-funnel="cross_agent_operating_kit"] .kit-card p{font-size:11.5px;line-height:1.7;color:#84918c}
      body[data-funnel="cross_agent_operating_kit"] .kit-no,body[data-funnel="cross_agent_operating_kit"] .mini-label{font-weight:650;letter-spacing:.1em}
      body[data-funnel="cross_agent_operating_kit"] .fit-main,body[data-funnel="cross_agent_operating_kit"] .fit-side,body[data-funnel="cross_agent_operating_kit"] .buy-summary{padding:34px}
      body[data-funnel="cross_agent_operating_kit"] .fit-card h3,body[data-funnel="cross_agent_operating_kit"] .buy-summary h3{font-size:22px;line-height:1.28;font-weight:610}
      body[data-funnel="cross_agent_operating_kit"] .steps li,body[data-funnel="cross_agent_operating_kit"] .fit-list li{font-size:12px;line-height:1.65;padding-top:15px;padding-bottom:15px}
      body[data-funnel="cross_agent_operating_kit"] .price-card{padding:30px;min-height:470px}
      body[data-funnel="cross_agent_operating_kit"] .price-card h3{font-size:18px;font-weight:610}
      body[data-funnel="cross_agent_operating_kit"] .amount{font-size:44px;font-weight:620;margin-top:22px;margin-bottom:30px}
      body[data-funnel="cross_agent_operating_kit"] .price-card li{font-size:11.5px;line-height:1.6;padding-top:11px;padding-bottom:11px}
      body[data-funnel="cross_agent_operating_kit"] .btn{font-size:12px;font-weight:700;min-height:48px;padding-left:17px;padding-right:17px}
      body[data-funnel="cross_agent_operating_kit"] .principle{padding:clamp(40px,5vw,64px)}
      body[data-funnel="cross_agent_operating_kit"] .principle h2{max-width:760px;font-size:clamp(36px,4.7vw,58px);line-height:1.08;font-weight:610}
      html[data-ui-language="ja"] body,html[data-ui-language="ko"] body,html[data-ui-language="zh"] body{letter-spacing:.005em}
      html[data-ui-language="ja"] .hero h1,html[data-ui-language="ko"] .hero h1,html[data-ui-language="zh"] .hero h1{line-height:1.13;letter-spacing:-.025em}
      html[data-ui-language="ja"] .section h2,html[data-ui-language="ko"] .section h2,html[data-ui-language="zh"] .section h2{line-height:1.22;letter-spacing:-.02em}
      .cross-agent-lang-switch{display:flex;align-items:center;gap:4px;margin-left:auto;margin-right:10px;padding:3px;border:1px solid #253039;border-radius:999px;background:#0d1217}
      .cross-agent-lang-switch button{min-width:34px;height:28px;padding:0 8px;border:0;border-radius:999px;background:transparent;color:#72807a;font:650 10px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer}
      .cross-agent-lang-switch button:hover{color:#d9e2de}
      .cross-agent-lang-switch button.active{background:#18221e;color:#c8efe1}
      #cross-agent-checkout-bar{font-size:12px!important}
      @media(max-width:680px){
        body[data-funnel="cross_agent_operating_kit"] .hero{padding-top:44px;padding-bottom:56px;gap:46px}
        body[data-funnel="cross_agent_operating_kit"] .hero h1{font-size:clamp(40px,11vw,54px);line-height:1.08;margin-bottom:24px}
        body[data-funnel="cross_agent_operating_kit"] .lead{font-size:15px;line-height:1.72}
        body[data-funnel="cross_agent_operating_kit"] .section{padding:88px 0}
        body[data-funnel="cross_agent_operating_kit"] .section h2{font-size:clamp(30px,8.6vw,42px)}
        body[data-funnel="cross_agent_operating_kit"] .section-head{gap:20px;margin-bottom:38px}
        body[data-funnel="cross_agent_operating_kit"] .kit-card{padding:24px;min-height:190px}
        body[data-funnel="cross_agent_operating_kit"] .price-card{padding:26px;min-height:0}
        .cross-agent-lang-switch{margin-right:4px;gap:2px;padding:2px}
        .cross-agent-lang-switch button{min-width:30px;height:26px;padding:0 6px;font-size:9px}
      }
    `;
    document.head.appendChild(style);
  }

  function addLanguageSwitcher() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;
    const nav = document.querySelector('.topbar .nav');
    if (!nav || document.getElementById('cross-agent-language-switcher')) return;
    const wrap = document.createElement('div');
    wrap.id = 'cross-agent-language-switcher';
    wrap.className = 'cross-agent-lang-switch';
    wrap.setAttribute('aria-label', 'Language');
    [['en','EN'],['ja','JP'],['ko','KR'],['zh','中文']].forEach(function (item) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.langChoice = item[0];
      button.textContent = item[1];
      button.addEventListener('click', function () {
        translatePage(item[0]);
        const url = new URL(location.href);
        url.searchParams.set('lang', item[0]);
        history.replaceState(null, '', url.pathname + url.search + url.hash);
      });
      wrap.appendChild(button);
    });
    const mainLink = nav.querySelector('.nav-link');
    nav.insertBefore(wrap, mainLink || null);
  }

  function applyExplicitRoute() {
    if (!explicitRoute) return;
    const attribution = window.scosAttribution;
    if (attribution && typeof attribution === 'object') {
      attribution.route_id = explicitRoute;
      ['utm_source','utm_medium','utm_campaign','utm_content'].forEach(function (key) {
        const value = String(params.get(key) || '').trim();
        if (value) attribution[key] = value.slice(0, 160);
      });
      attribution.landing_path = location.pathname;
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(attribution)); } catch (_) {}
    }
    document.querySelectorAll('a[href]').forEach(function (link) {
      let url;
      try { url = new URL(link.href, location.href); } catch (_) { return; }
      if (url.hostname !== 'buy.stripe.com') return;
      url.searchParams.set('client_reference_id', explicitRoute.replace(/[^a-zA-Z0-9_-]/g, '_'));
      ['utm_source','utm_medium','utm_campaign','utm_content'].forEach(function (key) {
        const value = params.get(key);
        if (value) url.searchParams.set(key, value);
      });
      link.href = url.toString();
    });
  }

  function addCompactCheckoutBar() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;
    if (document.getElementById('cross-agent-checkout-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'cross-agent-checkout-bar';
    bar.setAttribute('aria-label', 'Personal license checkout');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:60;display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:560px;margin:auto;padding:9px 10px 9px 14px;border:1px solid #2d3c36;border-radius:14px;background:rgba(8,12,14,.94);box-shadow:0 14px 42px rgba(0,0,0,.34);backdrop-filter:blur(12px);font:12px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif';
    const label = document.createElement('strong');
    label.style.cssText = 'color:#c9d5d0;font-weight:650;white-space:nowrap';
    label.textContent = 'Personal · $69';
    const link = document.createElement('a');
    link.href = PERSONAL_CHECKOUT;
    link.textContent = 'Checkout →';
    link.dataset.analyticsId = 'cross_agent_personal_sticky_checkout';
    link.dataset.product = 'cross_agent_personal';
    link.setAttribute('data-primary-cta', 'true');
    link.style.cssText = 'display:inline-flex;min-height:38px;align-items:center;justify-content:center;padding:0 13px;border-radius:9px;background:#eaf5f0;color:#0a1511;text-decoration:none;font-weight:750;white-space:nowrap';
    bar.appendChild(label);
    bar.appendChild(link);
    document.body.appendChild(bar);
  }

  function alignHomepageRoutes() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    const heroDestination = '/cross-agent-operating-kit.html?utm_source=stratumpraxis&utm_medium=owned_web&utm_campaign=cross_agent_personal&utm_content=home_hero&route_id=owned_home_hero_cross_agent_personal_20260831';
    const navDestination = '/cross-agent-operating-kit.html?utm_source=stratumpraxis&utm_medium=owned_web&utm_campaign=cross_agent_personal&utm_content=home_nav&route_id=owned_home_nav_cross_agent_personal_20260831';
    const hero = document.querySelector('.hero .button-primary');
    if (hero) {
      hero.href = heroDestination;
      hero.textContent = 'Cross-Agent Operating Kit · $69';
      hero.dataset.analyticsId = 'cross_agent_personal_home_hero';
      hero.dataset.product = 'cross_agent_personal';
      hero.setAttribute('data-primary-cta', 'true');
    }
    const nav = document.querySelector('#site-nav');
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll('a[href*="cross-agent-operating-kit.html"]'));
    let keeper = links[0];
    links.slice(1).forEach(function (link) { link.remove(); });
    if (!keeper) {
      keeper = document.createElement('a');
      nav.insertBefore(keeper, nav.firstChild);
    }
    keeper.href = navDestination;
    keeper.textContent = 'Cross-Agent Kit · $69';
    keeper.dataset.analyticsId = 'cross_agent_personal_home_nav';
    keeper.dataset.product = 'cross_agent_personal';
  }

  function init() {
    applyExplicitRoute();
    alignHomepageRoutes();
    if (location.pathname === '/cross-agent-operating-kit.html') {
      injectTypographyRelief();
      addLanguageSwitcher();
      translatePage(preferredLanguage());
      addCompactCheckoutBar();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.addEventListener('pageshow', function () {
    applyExplicitRoute();
    if (location.pathname === '/cross-agent-operating-kit.html') {
      injectTypographyRelief();
      addLanguageSwitcher();
      translatePage(preferredLanguage());
      addCompactCheckoutBar();
    }
  });
})();
