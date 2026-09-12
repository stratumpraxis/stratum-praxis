(function () {
  'use strict';

  const SESSION_KEY = 'sp_funnel_attribution_v2';
  const LANGUAGE_KEY = 'sp_cross_agent_language_v2';
  const PRODUCT_PATH = /\/cross-agent-operating-kit(?:\.html)?\/?$/;
  const SUPPORTED = ['en', 'ja', 'ko', 'zh'];
  const params = new URLSearchParams(location.search);
  const explicitRoute = String(params.get('route_id') || '').trim().slice(0, 100);

  const meta = {
    en: { title: 'Cross-Agent Operating Kit | Stratum Praxis', description: 'A portable operating layer for Claude Code, Codex, Cursor and other AI runtimes.' },
    ja: { title: 'Cross-Agent Operating Kit | Stratum Praxis', description: 'Claude Code、Codex、Cursorなどを切り替えても、運用ルール・権限・状態・安全境界を維持できるAI運用基盤キット。' },
    ko: { title: 'Cross-Agent Operating Kit | Stratum Praxis', description: 'Claude Code, Codex, Cursor를 바꿔도 운영 규칙, 권한, 상태와 안전 경계를 유지하는 AI 운영 키트.' },
    zh: { title: 'Cross-Agent Operating Kit | Stratum Praxis', description: '切换 Claude Code、Codex、Cursor 等工具时，仍能保留运营规则、权限、状态与安全边界的 AI 运营套件。' }
  };

  const T = {
    choose_license_short: { en:'Choose license ↓', ja:'ライセンス ↓', ko:'라이선스 ↓', zh:'选择许可 ↓' },
    kicker: { en:'Portable AI operating infrastructure · v1.0', ja:'持ち運べるAI運用基盤 · v1.0', ko:'이식 가능한 AI 운영 기반 · v1.0', zh:'可迁移的 AI 运营基础 · v1.0' },
    headline_1: { en:'Keep the', ja:'運用の', ko:'운영의', zh:'保留' },
    headline_2: { en:'brain.', ja:'頭脳は残す。', ko:'두뇌는 유지하고.', zh:'运营大脑。' },
    headline_3: { en:'Change the agent.', ja:'エージェントだけ変える。', ko:'에이전트만 바꾸세요.', zh:'只更换 Agent。' },
    purpose: { en:'Not a prompt pack. An operating layer.', ja:'プロンプト集ではなく、AI運用レイヤー。', ko:'프롬프트 모음이 아니라 운영 레이어입니다.', zh:'不是提示词合集，而是一层运营系统。' },
    lead: { en:'Keep policy, permissions, state and safety rules portable when you switch between Claude Code, Codex, Cursor and other AI runtimes.', ja:'Claude Code、Codex、Cursorなどを切り替えても、ポリシー・権限・状態・安全ルールをプロジェクト側に残します。', ko:'Claude Code, Codex, Cursor 등을 바꿔도 정책, 권한, 상태와 안전 규칙을 프로젝트에 유지합니다.', zh:'切换 Claude Code、Codex、Cursor 等运行环境时，策略、权限、状态和安全规则仍留在你的项目中。' },
    choose_license: { en:'Personal · $69', ja:'Personal · $69', ko:'Personal · $69', zh:'Personal · $69' },
    see_inside: { en:'Compare licenses', ja:'ライセンス比較', ko:'라이선스 비교', zh:'比较许可' },
    hero_note: { en:'One-time purchase · Editable files · Verified delivery · No subscription', ja:'買い切り · 編集可能ファイル · 決済確認後に提供 · サブスクなし', ko:'일회성 구매 · 편집 가능한 파일 · 결제 확인 후 제공 · 구독 없음', zh:'一次购买 · 可编辑文件 · 付款确认后交付 · 无订阅' },
    fact_6: { en:'6 operating components', ja:'6つの運用コンポーネント', ko:'6개 운영 구성요소', zh:'6 个运营组件' },
    fact_3: { en:'3 license levels', ja:'3種類のライセンス', ko:'3가지 라이선스', zh:'3 种许可' },
    architecture: { en:'Operating architecture', ja:'運用アーキテクチャ', ko:'운영 아키텍처', zh:'运营架构' },
    portable: { en:'Portable', ja:'移行可能', ko:'이식 가능', zh:'可迁移' },
    owned_by_you: { en:'Owned by you', ja:'自分側で保有', ko:'사용자 소유', zh:'由你持有' },
    brain_items: { en:'Goals · rules · skills · state · permissions · stop conditions', ja:'目標 · ルール · スキル · 状態 · 権限 · 停止条件', ko:'목표 · 규칙 · 스킬 · 상태 · 권한 · 중지 조건', zh:'目标 · 规则 · 技能 · 状态 · 权限 · 停止条件' },
    execution: { en:'Execution layer', ja:'実行レイヤー', ko:'실행 레이어', zh:'执行层' },
    proof_policy: { en:'Portable policy', ja:'持ち運べるポリシー', ko:'이식 가능한 정책', zh:'可迁移策略' },
    proof_policy_desc: { en:'One operating brain, multiple runtimes.', ja:'1つの運用ルールを複数Agentで使う。', ko:'하나의 운영 규칙을 여러 런타임에서 사용합니다.', zh:'一套运营规则，对应多个运行环境。' },
    proof_gate_desc: { en:'Define where autonomy must stop.', ja:'自律実行を止める境界を定義。', ko:'자율 실행이 멈춰야 할 지점을 정의합니다.', zh:'明确自主执行的停止边界。' },
    proof_cost: { en:'Cost guards', ja:'コストガード', ko:'비용 가드', zh:'成本护栏' },
    proof_cost_desc: { en:'Budget, token, quota and retry controls.', ja:'予算・Token・Quota・再試行を制御。', ko:'예산, 토큰, 할당량과 재시도를 제어합니다.', zh:'控制预算、Token、配额与重试。' },
    proof_migration: { en:'Migration ready', ja:'移行対応', ko:'마이그레이션 준비', zh:'迁移就绪' },
    proof_migration_desc: { en:'Move state without moving every conversation.', ja:'全会話ではなく、必要な状態を引き継ぐ。', ko:'전체 대화가 아니라 필요한 상태를 이전합니다.', zh:'无需搬走全部对话，也能迁移必要状态。' },
    inside_kicker: { en:"What's inside", ja:'キット内容', ko:'키트 구성', zh:'套件内容' },
    inside_title: { en:'Six files and frameworks you can put into a real project.', ja:'実プロジェクトへ入れて使える6つの実装要素。', ko:'실제 프로젝트에 넣어 사용할 수 있는 6개 구현 요소.', zh:'可直接放入真实项目的 6 个实施组件。' },
    inside_intro: { en:'This is implementation material, not a reading-only prompt collection.', ja:'読むだけのPrompt集ではなく、コピーして編集する実装用素材です。', ko:'읽기 전용 프롬프트 모음이 아니라 복사하고 편집하는 구현 자료입니다.', zh:'不是只供阅读的提示词合集，而是可复制、编辑的实施材料。' },
    c1: { en:'Goals, source of truth, permissions, Human Gates, security, failure policy, cost policy and Definition of Done.', ja:'目標、正本、権限、Human Gate、セキュリティ、失敗時ルール、コスト、完了条件を定義。', ko:'목표, 진실 기준, 권한, Human Gate, 보안, 실패 규칙, 비용과 완료 조건을 정의합니다.', zh:'定义目标、事实来源、权限、Human Gate、安全、失败规则、成本与完成条件。' },
    c2: { en:'Keep tool-specific behavior at the edge instead of duplicating your core policy.', ja:'共通ポリシーは1つ。ツール固有の挙動だけを分離。', ko:'공통 정책은 하나로 두고 도구별 동작만 분리합니다.', zh:'共同策略保持一份，只分离各工具特有行为。' },
    c3: { en:'Detect conflicts in objectives, permissions, completion, cost, retry and source of truth.', ja:'目的・権限・完了・コスト・再試行・正本の衝突を検出。', ko:'목표, 권한, 완료, 비용, 재시도와 진실 기준의 충돌을 감지합니다.', zh:'检测目标、权限、完成、成本、重试与事实来源之间的冲突。' },
    c4: { en:'Separate tool access from permission to perform high-impact actions.', ja:'ツールへのアクセス権と、高影響アクションの実行権限を分離。', ko:'도구 접근 권한과 고영향 작업 실행 권한을 분리합니다.', zh:'将工具访问权与高影响操作的执行权限分开。' },
    c5: { en:'Set retry limits, prevent silent paid fallback and define safe recovery.', ja:'再試行上限、有料フォールバック禁止、安全な復旧手順を定義。', ko:'재시도 제한, 자동 유료 폴백 방지, 안전한 복구 절차를 정의합니다.', zh:'设置重试上限、阻止静默付费回退并定义安全恢复流程。' },
    c6: { en:'Migration checklist, state handoff template and a 50-point policy maturity score.', ja:'Agent間移行チェック、State Handoffテンプレート、50点の成熟度スコア。', ko:'Agent 간 마이그레이션 체크리스트, 상태 인계 템플릿, 50점 성숙도 점수.', zh:'跨 Agent 迁移清单、状态交接模板与 50 分成熟度评分。' },
    delivery_kicker: { en:'After purchase', ja:'購入後', ko:'구매 후', zh:'购买后' },
    delivery_title: { en:'Know what you receive and what happens next.', ja:'何が届くか、購入後どう進むかを明確に。', ko:'무엇을 받고 다음에 무엇이 일어나는지 명확하게.', zh:'明确你会收到什么，以及购买后如何进行。' },
    delivery_intro: { en:'No vague “buyer access.” Payment is verified before the private delivery workspace opens.', ja:'「購入者用アクセス」で濁さず、決済確認後に専用の提供画面へ進みます。', ko:'모호한 구매자 액세스가 아니라 결제 확인 후 전용 제공 화면으로 이동합니다.', zh:'不是模糊的“购买者访问”，付款确认后进入专用交付页面。' },
    package_label: { en:'Package', ja:'提供物', ko:'패키지', zh:'交付内容' },
    package_title: { en:'Editable v1.0 operating files', ja:'編集可能なv1.0運用ファイル', ko:'편집 가능한 v1.0 운영 파일', zh:'可编辑的 v1.0 运营文件' },
    package_desc: { en:'Master policy, adapters, conflict checks, Human Gate rules, cost guardrails and migration/state handoff.', ja:'Master Policy、Adapter、Conflict Check、Human Gate、Cost Guard、Migration / State Handoffを含みます。', ko:'Master Policy, Adapter, Conflict Check, Human Gate, Cost Guard, Migration / State Handoff를 포함합니다.', zh:'包含 Master Policy、Adapter、Conflict Check、Human Gate、Cost Guard、Migration / State Handoff。' },
    editable_files: { en:'Editable project files', ja:'編集可能なプロジェクトファイル', ko:'편집 가능한 프로젝트 파일', zh:'可编辑的项目文件' },
    verified_workspace: { en:'Verified buyer workspace', ja:'購入確認済み専用画面', ko:'구매 확인 전용 화면', zh:'付款验证专用页面' },
    payment_check: { en:'Payment check before access', ja:'決済確認後にアクセス', ko:'결제 확인 후 액세스', zh:'付款确认后访问' },
    scope_label: { en:'Purchase scope', ja:'買い切り範囲', ko:'구매 범위', zh:'购买范围' },
    scope_title: { en:'Buy once. Keep v1.0.', ja:'一度買って、v1.0を保有。', ko:'한 번 구매하고 v1.0을 보유.', zh:'一次购买，保留 v1.0。' },
    scope_desc: { en:'Your purchase includes permanent access to the v1.0 kit you bought. No recurring subscription. Future major versions, custom implementation and 1:1 support are separate unless stated otherwise.', ja:'購入したv1.0キットは継続課金なしで保持できます。将来のメジャー版、個別実装、1:1サポートは明記がない限り別料金です。', ko:'구매한 v1.0 키트는 구독 없이 계속 사용할 수 있습니다. 향후 메이저 버전, 맞춤 구현, 1:1 지원은 별도입니다.', zh:'购买的 v1.0 套件可永久访问，无持续订阅。未来的大版本、定制实施和 1:1 支持除非另有说明均为单独项目。' },
    permanent: { en:'Permanent v1.0 access', ja:'v1.0へ継続アクセス', ko:'v1.0 영구 액세스', zh:'永久访问 v1.0' },
    not_rental: { en:'Not a rental', ja:'レンタルではありません', ko:'대여가 아닙니다', zh:'不是租用' },
    no_bundle: { en:'No implied services', ja:'追加サービス自動付帯なし', ko:'추가 서비스 자동 포함 없음', zh:'不默认附带额外服务' },
    major_separate: { en:'Major upgrades and consulting are separate', ja:'メジャー更新・コンサルは別', ko:'메이저 업데이트·컨설팅 별도', zh:'大版本升级与咨询另计' },
    flow_checkout: { en:'Checkout', ja:'決済', ko:'결제', zh:'付款' },
    flow_checkout_desc: { en:'Choose a license and pay through Stripe.', ja:'ライセンスを選びStripeで決済。', ko:'라이선스를 선택하고 Stripe로 결제합니다.', zh:'选择许可并通过 Stripe 付款。' },
    flow_verify: { en:'Verify', ja:'購入確認', ko:'구매 확인', zh:'验证' },
    flow_verify_desc: { en:'The access page confirms the purchase.', ja:'アクセス画面で購入を確認。', ko:'액세스 화면에서 구매를 확인합니다.', zh:'访问页面确认购买。' },
    flow_access: { en:'Access', ja:'専用画面', ko:'전용 화면', zh:'专用页面' },
    flow_access_desc: { en:'Open the private buyer workspace.', ja:'購入者専用の提供画面を開く。', ko:'구매자 전용 제공 화면을 엽니다.', zh:'打开购买者专用交付页面。' },
    flow_implement: { en:'Implement', ja:'導入', ko:'도입', zh:'实施' },
    flow_implement_desc: { en:'Copy and adapt the files in your environment.', ja:'自分の環境へコピーして調整。', ko:'자신의 환경에 복사해 조정합니다.', zh:'复制到你的环境中并进行调整。' },
    license_kicker: { en:'License rights', ja:'利用権', ko:'사용 권한', zh:'许可权限' },
    license_title: { en:'The kit is the same. The usage rights are different.', ja:'中身は同じ。違うのは利用できる範囲。', ko:'키트는 같고 사용 권한이 다릅니다.', zh:'套件相同，不同的是使用权限。' },
    license_intro: { en:'Choose by who will use the kit and whether client implementation is required.', ja:'誰が使うか、クライアント案件に導入するかで選びます。', ko:'누가 사용하는지, 클라이언트 업무에 적용하는지에 따라 선택하세요.', zh:'根据谁来使用，以及是否需要用于客户项目来选择。' },
    personal_desc: { en:'For one person using the kit in their own projects or own business.', ja:'1名が自分のプロジェクト・自社運用で使うためのライセンス。', ko:'1명이 자신의 프로젝트나 사업에 사용하는 라이선스.', zh:'供 1 人在自己的项目或业务中使用。' },
    one_person: { en:'One licensed person', ja:'利用者1名', ko:'라이선스 사용자 1명', zh:'1 位授权用户' },
    own_projects: { en:'Own projects / own business', ja:'自分のプロジェクト / 自社運用', ko:'본인 프로젝트 / 본인 사업', zh:'自己的项目 / 自有业务' },
    no_client: { en:'No client implementation rights', ja:'クライアント案件への導入不可', ko:'클라이언트 프로젝트 적용 불가', zh:'不可用于客户实施' },
    commercial_desc: { en:'For one freelancer, consultant or independent operator using the kit in client work.', ja:'1名のフリーランサー・コンサルタント・独立運用者がクライアント案件でも使えるライセンス。', ko:'1명의 프리랜서, 컨설턴트 또는 독립 운영자가 클라이언트 업무에 사용하는 라이선스.', zh:'供 1 名自由职业者、顾问或独立运营者用于客户项目。' },
    one_operator: { en:'One licensed operator', ja:'運用者1名', ko:'운영자 1명', zh:'1 位授权运营者' },
    client_allowed: { en:'Client implementation allowed', ja:'クライアント案件への導入可', ko:'클라이언트 프로젝트 적용 가능', zh:'可用于客户实施' },
    unlimited_projects: { en:'No client-project count limit', ja:'クライアント案件数の上限なし', ko:'클라이언트 프로젝트 수 제한 없음', zh:'客户项目数量不限' },
    agency_desc: { en:'For one agency or organization with multiple internal users and client engagements.', ja:'1つの組織内で複数メンバーが使い、複数クライアント案件へ導入するためのライセンス。', ko:'하나의 조직에서 여러 구성원이 사용하고 여러 클라이언트 업무에 적용하는 라이선스.', zh:'供一个组织内多名成员使用，并可用于多个客户项目。' },
    multiple_members: { en:'Multiple internal team members', ja:'組織内の複数メンバー', ko:'조직 내 여러 팀원', zh:'组织内多名成员' },
    multiple_clients: { en:'Multiple client engagements', ja:'複数クライアント案件', ko:'여러 클라이언트 업무', zh:'多个客户项目' },
    license_rule: { en:'All licenses prohibit reselling, redistributing, publicly mirroring or sublicensing the source kit itself.', ja:'全ライセンス共通：キットそのものの再販売・再配布・公開・サブライセンスは禁止です。', ko:'모든 라이선스 공통: 키트 자체의 재판매, 재배포, 공개 미러링, 재라이선스는 금지됩니다.', zh:'所有许可均禁止转售、再分发、公开镜像或再次许可套件本身。' },
    pricing_kicker: { en:'One-time licenses', ja:'買い切りライセンス', ko:'일회성 라이선스', zh:'一次性许可' },
    pricing_title: { en:'Choose the license that matches your use.', ja:'使い方に合うライセンスを選ぶ。', ko:'사용 방식에 맞는 라이선스를 선택하세요.', zh:'选择与你的使用方式匹配的许可。' },
    pricing_intro: { en:'Same v1.0 kit. No subscription. Different implementation rights.', ja:'v1.0の中身は同じ。サブスクなし。導入権だけが変わります。', ko:'v1.0 구성은 동일하고 구독은 없습니다. 적용 권한만 다릅니다.', zh:'v1.0 内容相同，无订阅，仅实施权限不同。' },
    one_time: { en:'one-time', ja:'買い切り', ko:'일회성', zh:'一次性' },
    personal_short: { en:'One person · own projects', ja:'1名 · 自分のプロジェクト', ko:'1명 · 본인 프로젝트', zh:'1 人 · 自己的项目' },
    full_kit: { en:'Full v1.0 kit', ja:'v1.0フルキット', ko:'v1.0 전체 키트', zh:'完整 v1.0 套件' },
    operator_badge: { en:'Independent operator', ja:'個人事業・コンサル向け', ko:'독립 운영자용', zh:'适合独立运营者' },
    commercial_short: { en:'One operator · client work allowed', ja:'運用者1名 · クライアント導入可', ko:'운영자 1명 · 클라이언트 적용 가능', zh:'1 位运营者 · 可用于客户项目' },
    agency_short: { en:'One organization · multiple members', ja:'1組織 · 複数メンバー', ko:'조직 1개 · 여러 구성원', zh:'1 个组织 · 多名成员' },
    legal: { en:'The source kit itself may not be resold, redistributed, publicly mirrored or sublicensed. Product names indicate compatibility only; this product is independent from those vendors.', ja:'キットそのものの再販売・再配布・公開・サブライセンスは禁止です。記載された製品名は互換性の説明用であり、本製品は各ベンダーの公式製品ではありません。', ko:'키트 자체의 재판매, 재배포, 공개 미러링, 재라이선스는 금지됩니다. 제품명은 호환성 설명용이며 각 벤더의 공식 제품이 아닙니다.', zh:'禁止转售、再分发、公开镜像或再次许可套件本身。所列产品名仅用于说明兼容性，本产品并非相关厂商的官方产品。' },
    closing_kicker: { en:'Keep the operating knowledge', ja:'運用知識を残す', ko:'운영 지식을 유지하세요', zh:'保留运营知识' },
    closing_title: { en:'Change the agent without rebuilding the operating rules.', ja:'Agentを変えても、運用ルールは作り直さない。', ko:'Agent를 바꿔도 운영 규칙을 다시 만들지 마세요.', zh:'更换 Agent，也无需重建运营规则。' },
    closing_desc: { en:'Brain, Policy, Skills and State stay on your side of the boundary.', ja:'Brain / Policy / Skills / Stateを自分側に残します。', ko:'Brain / Policy / Skills / State를 사용자 쪽에 유지합니다.', zh:'Brain / Policy / Skills / State 留在你这一侧。' }
  };

  function isProductPage() {
    return PRODUCT_PATH.test(location.pathname);
  }

  function preferredLanguage() {
    const fromUrl = String(new URLSearchParams(location.search).get('lang') || '').toLowerCase();
    if (SUPPORTED.includes(fromUrl)) return fromUrl;
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (SUPPORTED.includes(saved)) return saved;
    } catch (_) {}
    const browser = String(navigator.language || 'en').toLowerCase();
    if (browser.startsWith('ja')) return 'ja';
    if (browser.startsWith('ko')) return 'ko';
    if (browser.startsWith('zh')) return 'zh';
    return 'en';
  }

  function applyLanguage(lang) {
    if (!SUPPORTED.includes(lang)) lang = 'en';
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    document.documentElement.dataset.uiLanguage = lang;
    document.title = meta[lang].title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', meta[lang].description);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.dataset.i18n;
      if (T[key] && T[key][lang]) el.textContent = T[key][lang];
    });
    document.querySelectorAll('[data-lang-choice]').forEach(function (button) {
      const active = button.dataset.langChoice === lang;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (_) {}
  }

  function addLanguageSwitcher() {
    if (!isProductPage()) return;
    const slot = document.getElementById('lang-slot');
    if (!slot || document.getElementById('cross-agent-language-switcher')) return;
    const wrap = document.createElement('div');
    wrap.id = 'cross-agent-language-switcher';
    wrap.className = 'cross-agent-lang-switch';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language');
    [['en','EN'],['ja','JP'],['ko','KR'],['zh','中文']].forEach(function (item) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.langChoice = item[0];
      button.textContent = item[1];
      button.setAttribute('aria-label', item[1]);
      button.addEventListener('click', function () {
        applyLanguage(item[0]);
        const url = new URL(location.href);
        if (item[0] === 'en') url.searchParams.delete('lang');
        else url.searchParams.set('lang', item[0]);
        history.replaceState(null, '', url.pathname + url.search + url.hash);
      });
      wrap.appendChild(button);
    });
    slot.appendChild(wrap);
  }

  function applyExplicitRoute() {
    if (!explicitRoute) return;
    const attribution = window.scosAttribution;
    if (attribution && typeof attribution === 'object') {
      attribution.route_id = explicitRoute;
      ['utm_source','utm_medium','utm_campaign','utm_content'].forEach(function (key) {
        const value = String(params.get(key) || '').trim();
        if (value) attribution[key] = value.slice(0,160);
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
      hero.setAttribute('data-primary-cta','true');
    }
    const nav = document.querySelector('#site-nav');
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll('a[href*="cross-agent-operating-kit"]'));
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

  function removeLegacyBar() {
    const old = document.getElementById('cross-agent-checkout-bar');
    if (old) old.remove();
  }

  function init() {
    applyExplicitRoute();
    alignHomepageRoutes();
    if (isProductPage()) {
      removeLegacyBar();
      addLanguageSwitcher();
      applyLanguage(preferredLanguage());
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();

  window.addEventListener('pageshow', function () {
    applyExplicitRoute();
    if (isProductPage()) {
      removeLegacyBar();
      addLanguageSwitcher();
      applyLanguage(preferredLanguage());
    }
  });
})();