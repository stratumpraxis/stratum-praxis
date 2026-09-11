(function () {
  'use strict';

  const SESSION_KEY = 'sp_funnel_attribution_v2';
  const LANGUAGE_KEY = 'sp_cross_agent_language_v1';
  const params = new URLSearchParams(location.search);
  const explicitRoute = String(params.get('route_id') || '').trim().slice(0, 100);
  const PERSONAL_CHECKOUT = 'https://buy.stripe.com/4gM9AU3sE1YLcoM4FB6Zy0T';
  const SUPPORTED_LANGS = ['en', 'ja', 'ko', 'zh'];
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();

  const pageMeta = {
    en: {
      title: 'Cross-Agent Operating Kit | Stratum Praxis',
      description: "Keep your AI team's operating brain portable across Claude Code, Codex, Cursor and other runtimes. Policies, adapters, human gates, guardrails and migration tools."
    },
    ja: {
      title: 'Cross-Agent Operating Kit | Stratum Praxis',
      description: 'Claude Code、Codex、Cursorなどを切り替えても、プロジェクトのルール・権限・状態・安全境界を持ち運べるAI運用基盤キット。'
    },
    ko: {
      title: 'Cross-Agent Operating Kit | Stratum Praxis',
      description: 'Claude Code, Codex, Cursor 등 런타임을 바꿔도 프로젝트 규칙, 권한, 상태, 안전 경계를 유지할 수 있는 AI 운영 인프라 키트.'
    },
    zh: {
      title: 'Cross-Agent Operating Kit | Stratum Praxis',
      description: '在 Claude Code、Codex、Cursor 等运行环境之间切换时，仍可保留项目规则、权限、状态与安全边界的 AI 运营基础套件。'
    }
  };

  const COPY = {
    'Main site': { ja: 'メインサイト', ko: '메인 사이트', zh: '主站' },
    'Portable AI operating infrastructure · v1.0': { ja: '持ち運べるAI運用基盤 · v1.0', ko: '이식 가능한 AI 운영 인프라 · v1.0', zh: '可迁移的 AI 运营基础设施 · v1.0' },
    'Keep the': { ja: '運用の', ko: '운영의', zh: '保留你的' },
    'brain.': { ja: '頭脳は残す。', ko: '두뇌는 유지하고.', zh: '运营大脑。' },
    'Change the agent.': { ja: 'エージェントだけ変える。', ko: '에이전트만 바꾸세요.', zh: '只更换 Agent。' },
    'Claude Code today. Codex tomorrow. Cursor for one developer. Your project rules, permissions, state and safety boundaries should survive the switch.': {
      ja: '今日はClaude Code、明日はCodex。ある開発者はCursor。使うAgentが変わっても、プロジェクトのルール・権限・状態・安全境界はそのまま残せます。',
      ko: '오늘은 Claude Code, 내일은 Codex, 다른 개발자는 Cursor. Agent가 바뀌어도 프로젝트 규칙, 권한, 상태, 안전 경계는 그대로 유지됩니다.',
      zh: '今天用 Claude Code，明天换 Codex，另一位开发者使用 Cursor。无论 Agent 如何切换，项目规则、权限、状态和安全边界都应继续保留。'
    },
    'Get Personal — $69 →': { ja: 'Personalを購入 — $69 →', ko: 'Personal 구매 — $69 →', zh: '购买 Personal — $69 →' },
    "See what's inside": { ja: '内容を見る', ko: '구성 보기', zh: '查看内容' },
    'One-time purchase · Verified buyer delivery · Markdown + YAML · No subscription': { ja: '買い切り · 購入確認後に提供 · Markdown + YAML · サブスクなし', ko: '일회성 구매 · 구매 확인 후 제공 · Markdown + YAML · 구독 없음', zh: '一次性购买 · 验证付款后交付 · Markdown + YAML · 无订阅' },
    'Agent Lab · ongoing field notes →': { ja: 'Agent Lab · 継続中の実践記録 →', ko: 'Agent Lab · 지속적인 실전 기록 →', zh: 'Agent Lab · 持续实践记录 →' },
    'Operating architecture': { ja: '運用アーキテクチャ', ko: '운영 아키텍처', zh: '运营架构' },
    'Portable': { ja: 'PORTABLE', ko: 'PORTABLE', zh: 'PORTABLE' },
    'Owned by you': { ja: 'あなたが所有', ko: '사용자 소유', zh: '由你拥有' },
    'Company Brain / Policy': { ja: 'Company Brain / Policy', ko: 'Company Brain / Policy', zh: 'Company Brain / Policy' },
    'Goals · rules · skills · state · permissions · stop conditions': { ja: '目標 · ルール · スキル · 状態 · 権限 · 停止条件', ko: '목표 · 규칙 · 스킬 · 상태 · 권한 · 중지 조건', zh: '目标 · 规则 · 技能 · 状态 · 权限 · 停止条件' },
    'Runtime adapter': { ja: 'ランタイムアダプター', ko: '런타임 어댑터', zh: '运行时适配器' },
    'Execution layer': { ja: '実行レイヤー', ko: '실행 레이어', zh: '执行层' },
    'Repository · cloud · browser · test · publish · deploy': { ja: 'リポジトリ · クラウド · ブラウザ · テスト · 公開 · デプロイ', ko: '리포지토리 · 클라우드 · 브라우저 · 테스트 · 게시 · 배포', zh: '代码库 · 云端 · 浏览器 · 测试 · 发布 · 部署' },
    'Portable policy': { ja: '持ち運べるポリシー', ko: '이식 가능한 정책', zh: '可迁移策略' },
    'One operating brain, multiple runtimes.': { ja: 'ひとつの運用頭脳を、複数ランタイムで使う。', ko: '하나의 운영 두뇌를 여러 런타임에서 사용합니다.', zh: '一个运营大脑，对应多个运行环境。' },
    'Human gates': { ja: 'Human Gate', ko: 'Human Gate', zh: 'Human Gate' },
    'Define exactly where autonomy stops.': { ja: '自律実行をどこで止めるかを明確に定義。', ko: '자율 실행이 어디에서 멈추는지 명확히 정의합니다.', zh: '明确规定自主执行应在哪里停止。' },
    'Cost guards': { ja: 'コストガード', ko: '비용 가드', zh: '成本护栏' },
    'Budget, token, quota and retry controls.': { ja: '予算・トークン・クォータ・再試行を制御。', ko: '예산, 토큰, 할당량, 재시도를 제어합니다.', zh: '控制预算、Token、配额与重试。' },
    'Migration ready': { ja: '移行対応', ko: '마이그레이션 준비', zh: '迁移就绪' },
    'Move state without moving every conversation.': { ja: 'すべての会話を移さず、状態だけを引き継ぐ。', ko: '모든 대화를 옮기지 않고 상태를 이전합니다.', zh: '无需搬走全部对话，也能迁移状态。' },
    'The kit': { ja: 'キット内容', ko: '키트 구성', zh: '套件内容' },
    'Not a prompt pack.': { ja: 'プロンプト集ではない。', ko: '프롬프트 모음이 아닙니다.', zh: '不是提示词合集。' },
    'An operating layer.': { ja: '運用レイヤーです。', ko: '운영 레이어입니다.', zh: '而是一层运营系统。' },
    'Everything is designed to be copied into a real project and adapted, not merely read.': { ja: '読むだけではなく、実プロジェクトへコピーして調整・運用するために設計されています。', ko: '읽기 위한 자료가 아니라 실제 프로젝트에 복사해 적용하고 조정하도록 설계되었습니다.', zh: '它不是只供阅读，而是为了复制到真实项目中并按需调整使用。' },
    '01 · MASTER POLICY': { ja: '01 · マスターポリシー', ko: '01 · 마스터 정책', zh: '01 · 主策略' },
    'Goals, source of truth, permissions, human gates, security, failure policy, cost policy, quality gates and Definition of Done.': { ja: '目標、正本情報、権限、Human Gate、セキュリティ、失敗時ポリシー、コスト方針、品質ゲート、Definition of Doneを定義。', ko: '목표, 단일 진실 공급원, 권한, Human Gate, 보안, 실패 정책, 비용 정책, 품질 게이트, Definition of Done을 정의합니다.', zh: '定义目标、事实来源、权限、Human Gate、安全、失败策略、成本策略、质量门槛与 Definition of Done。' },
    '02 · ADAPTERS': { ja: '02 · アダプター', ko: '02 · 어댑터', zh: '02 · 适配器' },
    'Keep runtime-specific behavior at the edge instead of duplicating your company policy across tools.': { ja: '会社・プロジェクトのポリシーを各ツールへ重複させず、ランタイム固有の挙動だけを端に分離します。', ko: '회사 정책을 도구마다 복제하지 않고 런타임별 동작만 가장자리에 분리합니다.', zh: '无需在不同工具中复制公司策略，只把运行时特有行为放在适配层。' },
    '03 · RELIABILITY': { ja: '03 · 信頼性', ko: '03 · 신뢰성', zh: '03 · 可靠性' },
    'Detect objective, permission, completion, cost, retry, truth, lock-in and duplicate-rule conflicts.': { ja: '目的・権限・完了条件・コスト・再試行・正本・ロックイン・重複ルールの衝突を検出。', ko: '목표, 권한, 완료, 비용, 재시도, 진실 기준, 종속성, 중복 규칙 충돌을 감지합니다.', zh: '检测目标、权限、完成条件、成本、重试、事实来源、锁定与重复规则冲突。' },
    '04 · CONTROL': { ja: '04 · 制御', ko: '04 · 제어', zh: '04 · 控制' },
    'L0 read-only through L5 human-only. Separate tool access from permission to perform high-impact actions.': { ja: 'L0の読み取り専用からL5の人間限定まで。ツールへのアクセス権と、高影響アクションの実行権限を分離します。', ko: 'L0 읽기 전용부터 L5 사람 전용까지. 도구 접근 권한과 영향이 큰 작업 수행 권한을 분리합니다.', zh: '从 L0 只读到 L5 仅限人工。将工具访问权与执行高影响操作的权限分开。' },
    '05 · GUARDRAILS': { ja: '05 · ガードレール', ko: '05 · 가드레일', zh: '05 · 护栏' },
    'Explicit retry limits, no silent paid fallback, circuit breakers and safe recovery sequence.': { ja: '再試行上限、無断の有料フォールバック禁止、サーキットブレーカー、安全な復旧手順を明示。', ko: '명시적 재시도 제한, 자동 유료 폴백 금지, 회로 차단기, 안전한 복구 순서를 제공합니다.', zh: '明确重试上限、禁止静默付费回退、设置熔断器与安全恢复顺序。' },
    '06 · PORTABILITY': { ja: '06 · ポータビリティ', ko: '06 · 이식성', zh: '06 · 可迁移性' },
    'Cross-agent migration checklist, state handoff template and a 50-point policy maturity score.': { ja: 'Agent間移行チェックリスト、State Handoffテンプレート、50点満点のポリシー成熟度スコア。', ko: 'Agent 간 마이그레이션 체크리스트, 상태 인계 템플릿, 50점 정책 성숙도 점수.', zh: '跨 Agent 迁移清单、状态交接模板，以及 50 分策略成熟度评分。' },
    'Personal license · purchase fit': { ja: 'Personalライセンス · 購入適合', ko: 'Personal 라이선스 · 구매 적합성', zh: 'Personal 许可 · 购买适配' },
    'Know what happens after payment.': { ja: '購入後に何が起きるか、先にわかります。', ko: '결제 후 무엇이 일어나는지 미리 확인하세요.', zh: '付款后会发生什么，一目了然。' },
    'Personal is the shortest route for one operator applying the kit to their own projects. The files remain editable and local to the project; the buyer workspace is the delivery surface, not a recurring SaaS dependency.': { ja: 'Personalは、1人の運用者が自分のプロジェクトへ適用するための最短ルートです。ファイルは編集可能なままプロジェクト側に保持され、購入者ワークスペースは配布面であって継続課金SaaSへの依存ではありません。', ko: 'Personal은 한 명의 운영자가 자신의 프로젝트에 키트를 적용하는 가장 간단한 경로입니다. 파일은 편집 가능한 상태로 프로젝트에 남고, 구매자 워크스페이스는 전달 수단일 뿐 반복 과금 SaaS 의존성이 아닙니다.', zh: 'Personal 是单个运营者将套件用于自己项目的最直接方案。文件保持可编辑并留在项目本地；购买者工作区只是交付入口，不是持续依赖的订阅 SaaS。' },
    'Your first implementation': { ja: '最初の実装', ko: '첫 구현', zh: '首次实施' },
    'From purchase to a governed agent project.': { ja: '購入から、統制されたAgentプロジェクトへ。', ko: '구매에서 통제된 Agent 프로젝트까지.', zh: '从购买到受治理的 Agent 项目。' },
    'Copy the master': { ja: 'マスター', ko: '마스터', zh: '将主' },
    'policy into the project root.': { ja: 'ポリシーをプロジェクトルートへコピーします。', ko: '정책을 프로젝트 루트에 복사합니다.', zh: '策略复制到项目根目录。' },
    'Select the Claude, Codex or Cursor adapter used by that project.': { ja: 'そのプロジェクトで使うClaude / Codex / Cursorアダプターを選択します。', ko: '프로젝트에서 사용할 Claude, Codex 또는 Cursor 어댑터를 선택합니다.', zh: '选择该项目使用的 Claude、Codex 或 Cursor 适配器。' },
    'Set Human Gates and budget, token, quota and retry limits.': { ja: 'Human Gateと、予算・トークン・クォータ・再試行上限を設定します。', ko: 'Human Gate와 예산, 토큰, 할당량, 재시도 제한을 설정합니다.', zh: '设置 Human Gate，以及预算、Token、配额和重试上限。' },
    'Run the policy-conflict check before granting execution access.': { ja: '実行権限を渡す前にPolicy Conflict Checkを実行します。', ko: '실행 권한을 부여하기 전에 Policy Conflict Check를 실행합니다.', zh: '授予执行权限之前运行 Policy Conflict Check。' },
    'Use the migration checklist and state handoff when changing runtimes.': { ja: 'ランタイム変更時はMigration ChecklistとState Handoffを使います。', ko: '런타임을 변경할 때 Migration Checklist와 State Handoff를 사용합니다.', zh: '更换运行环境时使用 Migration Checklist 与 State Handoff。' },
    'Choose Personal if': { ja: 'Personalが向いている条件', ko: 'Personal이 적합한 경우', zh: '适合选择 Personal 的情况' },
    'The license fits this use.': { ja: 'この用途ならPersonalで適合します。', ko: '이 용도라면 Personal 라이선스가 적합합니다.', zh: '这些用途适合 Personal 许可。' },
    'One purchaser': { ja: '購入者1名', ko: '구매자 1명', zh: '1 名购买者' },
    'Your own projects': { ja: '自分のプロジェクト', ko: '본인 프로젝트', zh: '自己的项目' },
    'You want editable Markdown + YAML': { ja: '編集可能なMarkdown + YAMLが必要', ko: '편집 가능한 Markdown + YAML이 필요함', zh: '需要可编辑的 Markdown + YAML' },
    'You do not need client implementation rights': { ja: 'クライアント実装権が不要', ko: '클라이언트 구현 권한이 필요하지 않음', zh: '不需要客户项目实施权' },
    'Need to use the kit in client work? Choose Commercial or Agency below. Personal is not the correct license for that use.': { ja: 'クライアント案件で使う場合は、下のCommercialまたはAgencyを選んでください。Personalはその用途には対応しません。', ko: '클라이언트 업무에 사용해야 하나요? 아래 Commercial 또는 Agency를 선택하세요. Personal은 해당 용도에 맞지 않습니다.', zh: '如果要用于客户项目，请选择下方的 Commercial 或 Agency。Personal 不适用于该用途。' },
    'Before checkout': { ja: '購入前の確認', ko: '결제 전 확인', zh: '结账前确认' },
    'Know exactly what you are buying.': { ja: '何を購入するのかを明確に。', ko: '무엇을 구매하는지 정확히 확인하세요.', zh: '清楚知道你购买的是什么。' },
    'The v1.0 kit is a reusable operating layer for real projects: master policy, runtime adapters, conflict checks, human-gate rules, cost guardrails and migration/state handoff. It is delivered through verified buyer access after Stripe confirms payment.': { ja: 'v1.0は実プロジェクトで再利用できる運用レイヤーです。Master Policy、Runtime Adapter、Conflict Check、Human Gateルール、Cost Guardrail、Migration / State Handoffを含みます。Stripeで支払い確認後、購入者アクセスから提供されます。', ko: 'v1.0 키트는 실제 프로젝트에서 재사용할 수 있는 운영 레이어입니다. Master Policy, Runtime Adapter, Conflict Check, Human Gate 규칙, Cost Guardrail, Migration / State Handoff를 포함하며 Stripe 결제 확인 후 구매자 액세스로 제공됩니다.', zh: 'v1.0 是可在真实项目中重复使用的运营层，包含 Master Policy、Runtime Adapter、Conflict Check、Human Gate 规则、Cost Guardrail 以及 Migration / State Handoff。Stripe 确认付款后，通过购买者访问入口交付。' },
    'Delivery model': { ja: '提供方式', ko: '제공 방식', zh: '交付模式' },
    'Owned files, not another locked dashboard.': { ja: 'ロックされたダッシュボードではなく、自分で持てるファイル。', ko: '또 다른 잠긴 대시보드가 아니라 직접 소유하는 파일.', zh: '不是又一个封闭仪表盘，而是你真正拥有的文件。' },
    'The operating layer stays editable and portable. The buyer workspace verifies access; the implementation itself lives with your project.': { ja: '運用レイヤーは編集可能で持ち運べます。購入者ワークスペースはアクセス確認用で、実装本体はあなたのプロジェクト側に残ります。', ko: '운영 레이어는 편집 가능하고 이식할 수 있습니다. 구매자 워크스페이스는 접근을 확인하며 구현 자체는 프로젝트에 남습니다.', zh: '运营层始终可编辑、可迁移。购买者工作区只负责验证访问，真正的实现保留在你的项目中。' },
    'Components': { ja: '構成', ko: '구성 요소', zh: '组件' },
    '6 operating components': { ja: '6つの運用コンポーネント', ko: '6개 운영 구성 요소', zh: '6 个运营组件' },
    'Policy, adapters, reliability, control, guardrails, portability.': { ja: 'Policy、Adapter、Reliability、Control、Guardrail、Portability。', ko: 'Policy, Adapter, Reliability, Control, Guardrail, Portability.', zh: 'Policy、Adapter、Reliability、Control、Guardrail、Portability。' },
    'Format': { ja: '形式', ko: '형식', zh: '格式' },
    'Editable project files, not a locked SaaS dashboard.': { ja: 'ロックされたSaaS画面ではなく、編集可能なプロジェクトファイル。', ko: '잠긴 SaaS 대시보드가 아닌 편집 가능한 프로젝트 파일.', zh: '可编辑的项目文件，而不是封闭 SaaS 仪表盘。' },
    'Billing': { ja: '課金', ko: '결제', zh: '计费' },
    'One-time purchase': { ja: '買い切り', ko: '일회성 구매', zh: '一次性购买' },
    'No subscription for the v1.0 kit.': { ja: 'v1.0キットにサブスクリプションはありません。', ko: 'v1.0 키트는 구독이 아닙니다.', zh: 'v1.0 套件无订阅费用。' },
    'Delivery': { ja: '提供', ko: '전달', zh: '交付' },
    'Buyer access': { ja: '購入者アクセス', ko: '구매자 액세스', zh: '购买者访问' },
    'Payment confirmation routes to the verified access flow.': { ja: '支払い確認後、認証済みアクセスフローへ進みます。', ko: '결제 확인 후 검증된 액세스 흐름으로 이동합니다.', zh: '确认付款后进入已验证的访问流程。' },
    'One-time licenses': { ja: '買い切りライセンス', ko: '일회성 라이선스', zh: '一次性许可' },
    'Buy once. Own your operating layer.': { ja: '一度買えば、運用レイヤーはあなたのもの。', ko: '한 번 구매하고 운영 레이어를 소유하세요.', zh: '一次购买，拥有自己的运营层。' },
    'Choose the license by how the kit will be used. The operating components stay the same; implementation rights change.': { ja: 'キットの利用方法に応じてライセンスを選択してください。運用コンポーネントは同じで、実装権限が変わります。', ko: '키트 사용 방식에 따라 라이선스를 선택하세요. 운영 구성은 동일하고 구현 권한만 달라집니다.', zh: '根据套件的使用方式选择许可。运营组件相同，实施权限不同。' },
    'one-time': { ja: '買い切り', ko: '일회성', zh: '一次性' },
    'Full v1.0 operating kit': { ja: 'v1.0運用キット一式', ko: '전체 v1.0 운영 키트', zh: '完整 v1.0 运营套件' },
    'Verified buyer workspace': { ja: '認証済み購入者ワークスペース', ko: '검증된 구매자 워크스페이스', zh: '已验证购买者工作区' },
    'Get Personal — $69 one-time →': { ja: 'Personalを購入 — $69・買い切り →', ko: 'Personal 구매 — $69 일회성 →', zh: '购买 Personal — $69 一次性 →' },
    'Best for operators': { ja: '運用者に最適', ko: '운영자에게 적합', zh: '最适合运营者' },
    'One business / operator': { ja: '1事業者 / 1運用者', ko: '1개 비즈니스 / 운영자', zh: '1 个企业 / 运营者' },
    'Client implementation use': { ja: 'クライアント実装で利用可能', ko: '클라이언트 구현 사용 가능', zh: '可用于客户实施' },
    'Get Commercial →': { ja: 'Commercialを購入 →', ko: 'Commercial 구매 →', zh: '购买 Commercial →' },
    'One agency / team': { ja: '1エージェンシー / チーム', ko: '1개 에이전시 / 팀', zh: '1 个代理机构 / 团队' },
    'Multiple client projects': { ja: '複数のクライアントプロジェクト', ko: '여러 클라이언트 프로젝트', zh: '多个客户项目' },
    'Get Agency →': { ja: 'Agencyを購入 →', ko: 'Agency 구매 →', zh: '购买 Agency →' },
    'Source-kit redistribution, resale, public mirroring and sublicensing are not included. Product names referenced describe compatibility/use context only; this product is independent and is not an official product of those vendors.': { ja: 'ソースキットの再配布・再販売・公開ミラー・サブライセンスは含まれません。記載された製品名は互換性・利用文脈を示すためのもので、本製品は各ベンダーから独立しており公式製品ではありません。', ko: '소스 키트 재배포, 재판매, 공개 미러링 및 재라이선스는 포함되지 않습니다. 언급된 제품명은 호환성 및 사용 맥락을 설명하기 위한 것이며 본 제품은 해당 벤더와 독립적이고 공식 제품이 아닙니다.', zh: '不包含源套件再分发、转售、公开镜像或再许可。所提及的产品名称仅用于说明兼容性与使用场景；本产品独立于这些厂商，并非其官方产品。' },
    'The principle': { ja: '原則', ko: '원칙', zh: '原则' },
    'Models are replaceable.': { ja: 'モデルは交換できる。', ko: '모델은 교체할 수 있습니다.', zh: '模型可以更换。' },
    'Your operating knowledge is an asset.': { ja: '運用知識は、あなたの資産です。', ko: '운영 지식은 당신의 자산입니다.', zh: '你的运营知识才是资产。' },
    'Keep Brain, Policy, Skills and State on your side of the boundary.': { ja: 'Brain・Policy・Skills・Stateを、自分側の境界に保持する。', ko: 'Brain, Policy, Skills, State를 당신 쪽 경계에 유지하세요.', zh: '把 Brain、Policy、Skills 和 State 保留在你自己的边界内。' },
    'What the $69 Personal license gives you:': { ja: '$69のPersonalライセンスに含まれるもの：', ko: '$69 Personal 라이선스에 포함되는 항목:', zh: '$69 Personal 许可包含：' },
    'the full v1.0 operating kit for your own projects — AGENTS.md master policy, Claude/Codex/Cursor adapters, Human Gate matrix, budget/retry guards, migration checklist and maturity score.': { ja: '自分のプロジェクト向けv1.0運用キット一式 — AGENTS.mdマスターポリシー、Claude/Codex/Cursorアダプター、Human Gate Matrix、予算・再試行ガード、Migration Checklist、成熟度スコア。', ko: '본인 프로젝트용 전체 v1.0 운영 키트 — AGENTS.md 마스터 정책, Claude/Codex/Cursor 어댑터, Human Gate Matrix, 예산/재시도 가드, Migration Checklist, 성숙도 점수.', zh: '适用于自己项目的完整 v1.0 运营套件——AGENTS.md 主策略、Claude/Codex/Cursor 适配器、Human Gate Matrix、预算/重试护栏、Migration Checklist 与成熟度评分。' },
    'One-time purchase · No subscription · Secure Stripe checkout · Card or Link · Buyer access after verified payment': { ja: '買い切り · サブスクなし · Stripe安全決済 · Card / Link対応 · 支払い確認後に購入者アクセス', ko: '일회성 구매 · 구독 없음 · 안전한 Stripe 결제 · Card 또는 Link · 결제 확인 후 구매자 액세스', zh: '一次性购买 · 无订阅 · 安全 Stripe 结账 · Card 或 Link · 付款验证后获得购买者访问' },
    'Personal · $69 one-time': { ja: 'Personal · $69 買い切り', ko: 'Personal · $69 일회성', zh: 'Personal · $69 一次性' },
    'Full v1.0 kit · No subscription · Secure Stripe': { ja: 'v1.0一式 · サブスクなし · Stripe安全決済', ko: '전체 v1.0 키트 · 구독 없음 · 안전한 Stripe', zh: '完整 v1.0 套件 · 无订阅 · 安全 Stripe' },
    'Continue to checkout →': { ja: '購入手続きへ →', ko: '결제로 이동 →', zh: '前往结账 →' }
  };

  const ATTRIBUTE_COPY = {
    'Stratum Praxis main site': { ja: 'Stratum Praxis メインサイト', ko: 'Stratum Praxis 메인 사이트', zh: 'Stratum Praxis 主站' },
    'Cross-agent operating layer diagram': { ja: 'Cross-Agent運用レイヤー図', ko: 'Cross-Agent 운영 레이어 다이어그램', zh: 'Cross-Agent 运营层示意图' },
    'Key operating benefits': { ja: '主要な運用メリット', ko: '주요 운영 이점', zh: '主要运营优势' },
    'Personal license checkout': { ja: 'Personalライセンス購入', ko: 'Personal 라이선스 결제', zh: 'Personal 许可结账' }
  };

  function isCrossAgentPage() {
    return /\/cross-agent-operating-kit(?:\.html)?\/?$/.test(location.pathname);
  }

  function normalizeLang(value) {
    const raw = String(value || '').toLowerCase();
    if (raw.startsWith('ja')) return 'ja';
    if (raw.startsWith('ko')) return 'ko';
    if (raw.startsWith('zh')) return 'zh';
    return 'en';
  }

  function getInitialLanguage() {
    const fromUrl = params.get('lang');
    if (fromUrl && SUPPORTED_LANGS.includes(normalizeLang(fromUrl))) return normalizeLang(fromUrl);
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
    } catch (_) {}
    return normalizeLang(navigator.language || 'en');
  }

  let currentLanguage = getInitialLanguage();

  function translateValue(value, lang) {
    if (lang === 'en') return value;
    const entry = COPY[value];
    return entry && entry[lang] ? entry[lang] : value;
  }

  function translateAttributeValue(value, lang) {
    if (lang === 'en') return value;
    const entry = ATTRIBUTE_COPY[value];
    return entry && entry[lang] ? entry[lang] : value;
  }

  function captureAndTranslateText(root, lang) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH)$/.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const source = originalText.get(node);
      const trimmed = source.trim();
      const leading = source.match(/^\s*/)[0];
      const trailing = source.match(/\s*$/)[0];
      node.nodeValue = leading + translateValue(trimmed, lang) + trailing;
    });
  }

  function captureAndTranslateAttributes(root, lang) {
    root.querySelectorAll('[aria-label],[title]').forEach(function (el) {
      let store = originalAttrs.get(el);
      if (!store) {
        store = {};
        if (el.hasAttribute('aria-label')) store['aria-label'] = el.getAttribute('aria-label');
        if (el.hasAttribute('title')) store.title = el.getAttribute('title');
        originalAttrs.set(el, store);
      }
      Object.keys(store).forEach(function (name) {
        el.setAttribute(name, translateAttributeValue(store[name], lang));
      });
    });
  }

  function updateLanguageUi(lang) {
    document.querySelectorAll('[data-sp-lang]').forEach(function (button) {
      const active = button.dataset.spLang === lang;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.classList.toggle('is-active', active);
    });
  }

  function updateLanguageMeta(lang) {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
    const meta = pageMeta[lang] || pageMeta.en;
    document.title = meta.title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', meta.description);
  }

  function applyLanguage(lang, updateUrl) {
    if (!SUPPORTED_LANGS.includes(lang)) lang = 'en';
    currentLanguage = lang;
    try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (_) {}
    updateLanguageMeta(lang);
    captureAndTranslateText(document.body, lang);
    captureAndTranslateAttributes(document.body, lang);
    updateLanguageUi(lang);

    const jpNote = document.getElementById('cross-agent-japanese-acquisition-note');
    if (jpNote) jpNote.hidden = lang !== 'ja';

    if (updateUrl) {
      const url = new URL(location.href);
      if (lang === 'en') url.searchParams.delete('lang');
      else url.searchParams.set('lang', lang);
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  }

  function injectLanguageSwitcher() {
    if (!isCrossAgentPage() || document.getElementById('sp-language-switcher')) return;
    const nav = document.querySelector('.topbar .nav');
    if (!nav) return;

    if (!document.getElementById('sp-i18n-style')) {
      const style = document.createElement('style');
      style.id = 'sp-i18n-style';
      style.textContent = [
        '.sp-nav-tools{display:flex;align-items:center;gap:12px;margin-left:auto}',
        '.sp-lang-switch{display:flex;align-items:center;gap:2px;padding:3px;border:1px solid #27313d;border-radius:10px;background:#0c1116;box-shadow:inset 0 1px rgba(255,255,255,.025)}',
        '.sp-lang-switch button{min-width:32px;height:28px;padding:0 8px;border:0;border-radius:7px;background:transparent;color:#7f8b86;font:700 10px/1 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.03em;cursor:pointer;transition:background .16s ease,color .16s ease,box-shadow .16s ease}',
        '.sp-lang-switch button:hover{color:#dbe5e0;background:#12191f}',
        '.sp-lang-switch button.is-active{color:#0a1511;background:#c9eee1;box-shadow:0 1px 8px rgba(157,232,207,.08)}',
        'html[lang="ja"] body,html[lang="ko"] body,html[lang="zh-Hans"] body{font-family:Inter,"Noto Sans JP","Noto Sans KR","Noto Sans SC","Yu Gothic UI","Yu Gothic","Hiragino Sans","Meiryo",system-ui,sans-serif}',
        'html[lang="ja"] .hero h1,html[lang="ko"] .hero h1,html[lang="zh-Hans"] .hero h1{letter-spacing:-.035em;line-height:1.03}',
        'html[lang="ja"] .section h2,html[lang="ko"] .section h2,html[lang="zh-Hans"] .section h2{letter-spacing:-.025em;line-height:1.12}',
        '@media(max-width:680px){.sp-nav-tools{gap:7px}.sp-lang-switch{padding:2px}.sp-lang-switch button{min-width:28px;height:27px;padding:0 6px;font-size:9px}.topbar .nav-link{display:none}}'
      ].join('');
      document.head.appendChild(style);
    }

    const existingMain = nav.querySelector('.nav-link');
    const tools = document.createElement('div');
    tools.className = 'sp-nav-tools';

    const switcher = document.createElement('div');
    switcher.id = 'sp-language-switcher';
    switcher.className = 'sp-lang-switch';
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', 'Language');

    [
      ['en', 'EN', 'English'],
      ['ja', 'JA', '日本語'],
      ['ko', 'KO', '한국어'],
      ['zh', 'ZH', '中文']
    ].forEach(function (item) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.spLang = item[0];
      button.textContent = item[1];
      button.title = item[2];
      button.setAttribute('aria-label', item[2]);
      button.addEventListener('click', function () {
        applyLanguage(item[0], true);
      });
      switcher.appendChild(button);
    });

    if (existingMain) existingMain.remove();
    tools.appendChild(switcher);
    if (existingMain) tools.appendChild(existingMain);
    nav.appendChild(tools);
  }

  function setupI18n() {
    if (!isCrossAgentPage()) return;
    injectLanguageSwitcher();
    applyLanguage(currentLanguage, false);
  }

  function applyExplicitRoute() {
    if (!explicitRoute) return;
    const attribution = window.scosAttribution;
    if (attribution && typeof attribution === 'object') {
      attribution.route_id = explicitRoute;
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (key) {
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
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (key) {
        const value = params.get(key);
        if (value) url.searchParams.set(key, value);
      });
      link.href = url.toString();
    });
  }

  function getAttributionSource() {
    const direct = String(params.get('utm_source') || '').trim().toLowerCase();
    if (direct) return direct;
    const attribution = window.scosAttribution;
    if (attribution && typeof attribution === 'object') {
      const stored = String(attribution.utm_source || '').trim().toLowerCase();
      if (stored) return stored;
    }
    try {
      const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
      return String(parsed.utm_source || '').trim().toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function isJapaneseAcquisition() {
    const source = getAttributionSource();
    return source === 'zenn' || source === 'vector_praxis';
  }

  function clarifySelfServeOffer() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;
    if (isJapaneseAcquisition()) return;
    const eyebrow = document.querySelector('.hero .ey');
    const heading = document.querySelector('.hero h1');
    const lead = document.querySelector('.hero .lead');
    if (eyebrow) eyebrow.textContent = 'FOR SOLO AI OPERATORS · PERSONAL LICENSE · $69 ONE-TIME';
    if (heading) heading.innerHTML = 'One operating layer.<br><span class="grad">Claude Code, Codex & Cursor.</span>';
    if (lead) lead.textContent = 'Stop rebuilding project rules every time you switch AI runtimes. Keep policy, permissions, human gates, budget/retry guards and migration state in one editable kit you own.';
  }

  function addCheckoutReassurance() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;
    const actions = document.querySelector('.hero .actions');
    if (!actions || document.getElementById('cross-agent-checkout-reassurance')) return;

    const proof = document.createElement('div');
    proof.id = 'cross-agent-checkout-reassurance';
    proof.setAttribute('role', 'note');
    const japaneseNote = isJapaneseAcquisition()
      ? '<div id="cross-agent-japanese-acquisition-note" style="margin-top:10px;padding-top:10px;border-top:1px solid #263248;color:#d8e2ef" lang="ja"><strong style="color:#f5f7fb">Zenn / 日本語圏からの方へ：</strong> Personal版は<strong>69ドルの買い切り</strong>です。自分のプロジェクトで使えるAGENTS.md、Claude / Codex / Cursor用アダプター、Human Gate Matrix、予算・再試行ガード、Migration / State Handoffを含みます。サブスクリプションではありません。Stripeで支払い確認後、購入者用アクセスへ進みます。</div>'
      : '';
    proof.innerHTML = '<strong style="color:#f5f7fb">What the $69 Personal license gives you:</strong> the full v1.0 operating kit for your own projects — AGENTS.md master policy, Claude/Codex/Cursor adapters, Human Gate matrix, budget/retry guards, migration checklist and maturity score.<br><span style="display:inline-block;margin-top:8px">One-time purchase · No subscription · Secure Stripe checkout · Card or Link · Buyer access after verified payment</span>' + japaneseNote;
    proof.style.marginTop = '14px';
    proof.style.padding = '14px 16px';
    proof.style.border = '1px solid #263248';
    proof.style.borderRadius = '12px';
    proof.style.background = '#0d141f';
    proof.style.fontSize = '13px';
    proof.style.lineHeight = '1.55';
    proof.style.color = '#aeb8c8';
    actions.insertAdjacentElement('afterend', proof);
  }

  function addPersistentCheckoutBar() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;
    if (document.getElementById('cross-agent-checkout-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'cross-agent-checkout-bar';
    bar.setAttribute('aria-label', 'Personal license checkout');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:60;display:flex;align-items:center;justify-content:space-between;gap:12px;max-width:760px;margin:auto;padding:10px 12px;border:1px solid #354763;border-radius:14px;background:rgba(7,10,16,.96);box-shadow:0 16px 50px rgba(0,0,0,.45);backdrop-filter:blur(12px);font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif';

    const copy = document.createElement('div');
    copy.innerHTML = '<strong style="display:block;color:#f5f7fb">Personal · $69 one-time</strong><span style="color:#9da9ba">Full v1.0 kit · No subscription · Secure Stripe</span>';

    const link = document.createElement('a');
    link.href = PERSONAL_CHECKOUT;
    link.textContent = 'Continue to checkout →';
    link.dataset.analyticsId = 'cross_agent_personal_sticky_checkout';
    link.dataset.product = 'cross_agent_personal';
    link.setAttribute('data-primary-cta', 'true');
    link.style.cssText = 'flex:0 0 auto;display:inline-flex;min-height:44px;align-items:center;justify-content:center;padding:0 14px;border-radius:10px;background:#f4f7fb;color:#08101a;text-decoration:none;font-weight:900';

    bar.appendChild(copy);
    bar.appendChild(link);
    document.body.appendChild(bar);

    if (typeof window.scosCapture === 'function') {
      window.scosCapture('checkout_offer_exposure', {
        product: 'cross_agent_personal',
        placement: 'persistent_checkout_bar'
      });
    }
  }

  function alignProductPagePrimaryCheckout() {
    if (location.pathname !== '/cross-agent-operating-kit.html') return;

    const japanese = isJapaneseAcquisition();
    const targets = [
      {
        link: document.querySelector('.hero .actions .primary'),
        id: 'cross_agent_personal_product_hero',
        label: japanese ? 'Personalを購入する — $69・買い切り →' : 'Get the full kit — $69 one-time →'
      },
      {
        link: document.querySelector('.close .primary'),
        id: 'cross_agent_personal_product_close',
        label: japanese ? 'Personalを購入する — $69・買い切り →' : 'Get the full kit — $69 one-time →'
      }
    ];

    targets.forEach(function (item) {
      if (!item.link) return;
      item.link.href = PERSONAL_CHECKOUT;
      item.link.textContent = item.label;
      item.link.dataset.analyticsId = item.id;
      item.link.dataset.product = 'cross_agent_personal';
      item.link.setAttribute('data-primary-cta', 'true');
    });

    addCheckoutReassurance();
    addPersistentCheckoutBar();
  }

  function alignHomepageRoutes() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;

    const heroDestination = '/cross-agent-operating-kit.html?utm_source=stratumpraxis&utm_medium=owned_web&utm_campaign=cross_agent_personal&utm_content=home_hero&route_id=owned_home_hero_cross_agent_personal_20260831';
    const navDestination = '/cross-agent-operating-kit.html?utm_source=stratumpraxis&utm_medium=owned_web&utm_campaign=cross_agent_personal&utm_content=home_nav&route_id=owned_home_nav_cross_agent_personal_20260831';

    const hero = document.querySelector('.hero .button-primary');
    if (hero) {
      hero.href = heroDestination;
      hero.textContent = 'Cross-Agent Operating Kit — Personal · $69';
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
    keeper.dataset.crossAgentPrimary = 'true';
    keeper.dataset.analyticsId = 'cross_agent_personal_home_nav';
    keeper.dataset.product = 'cross_agent_personal';
  }

  applyExplicitRoute();
  clarifySelfServeOffer();
  alignProductPagePrimaryCheckout();
  alignHomepageRoutes();
  setupI18n();

  window.addEventListener('pageshow', function () {
    applyExplicitRoute();
    clarifySelfServeOffer();
    alignProductPagePrimaryCheckout();
    alignHomepageRoutes();
    setupI18n();
  });
})();
