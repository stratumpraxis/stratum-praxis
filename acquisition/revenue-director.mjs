import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const STATUS_URL='https://fzqgpaxqolrjjhmxdcrf.supabase.co/functions/v1/stratum-24h-status';
const SOURCES=path.join(ROOT,'acquisition/media-engine/sources.json');
const STATE=path.join(ROOT,'acquisition/revenue-director-state.json');
const SOURCE_DIR=path.join(ROOT,'acquisition/media-engine/runtime-sources');
const ENTRY='https://stratumpraxis.com/b2b-intro/?v=7d8708';
const DIAG='https://stratumpraxis.com/b2b/';
const KIT='https://stratumpraxis.com/ai-saas-spend-decision-kit.html';
const AUDIT='https://stratumpraxis.com/workflow-audit.html';

const TOPICS=[
  {
    key:'workflow-before-tool',
    title:'Before buying another AI tool, diagnose one recurring workflow first',
    claims:[
      'A new AI subscription is not automatically a workflow improvement; the decision should start with a recurring process and a defined outcome.',
      'A useful diagnostic separates workflows that should be left alone, improved as a process first, or investigated for automation.',
      'Frequency, time cost, error cost, handoff friction, repeatability and output verifiability are practical inputs for deciding whether automation is worth investigating.',
      'A browser visit or diagnostic completion is not buyer evidence; qualified action, buyer signal, checkout and payment require separate evidence.',
      'When human traffic is zero, changing the offer, price or checkout adds variables without addressing the first broken revenue stage.',
      'Stratum already has an existing workflow diagnostic, a self-service decision kit and a fixed-scope audit route, so acquisition should use those assets before creating another product.'
    ]
  },
  {
    key:'cost-per-success',
    title:'AI cost per successful outcome is more useful than cost per model call',
    claims:[
      'AI economics should include retries, failures, supporting software and human review rather than counting only the nominal model-call cost.',
      'A cheap attempt can still produce an expensive workflow when the success rate is low or review work is high.',
      'A useful operating metric connects total workflow cost to a verified successful outcome that the business can recognize.',
      'The right denominator depends on the workflow: completed cases, accepted deliverables, resolved tickets or another observable outcome can be more meaningful than raw calls.',
      'Public attention to AI cost does not prove buyer demand; buyer and payment evidence must be measured separately.',
      'The existing Stratum decision and audit routes can be used to review software spend without changing price, checkout or product scope first.'
    ]
  },
  {
    key:'renewal-decision',
    title:'Every recurring AI and SaaS renewal should end in keep, reduce, replace or stop',
    claims:[
      'Recurring software spend is easier to govern when each renewal is treated as a decision rather than an automatic continuation.',
      'Ownership, usage, overlap, switching cost, renewal timing and measurable workflow value are practical inputs to a renewal decision.',
      'Low utilization alone does not prove a tool should be cancelled when the tool protects a high-value outcome or costly switching risk.',
      'High usage alone does not prove value when multiple tools duplicate the same job or the workflow still fails frequently.',
      'The useful output is a bounded decision with evidence, not a generic promise that software spend can always be reduced.',
      'Stratum already has a self-service decision route and a fixed-scope audit route, so distribution should send qualified humans there before any new offer is created.'
    ]
  },
  {
    key:'agent-governance',
    title:'Scale AI agents only after permissions, routing and evidence are explicit',
    claims:[
      'Adding agents increases decisions, permissions, handoffs, context boundaries and potential failure paths as well as capacity.',
      'An agent contract can define purpose, permitted tools, allowed decisions and stop conditions before more autonomy is granted.',
      'Human gates are most useful around consequential actions such as publishing, deleting, paying, contracting or changing production state.',
      'Evidence makes agent behavior inspectable by recording what action happened and what result came back without treating internal completion as revenue.',
      'Context should be routed to the role that needs it instead of being broadcast to every agent by default.',
      'The useful scaling question is whether bounded roles can be supervised reliably, not how large an agent count can be displayed.'
    ]
  },
  {
    key:'process-vs-automation',
    title:'Not every automation problem is an automation problem',
    claims:[
      'A recurring workflow can be slow because the process itself is unclear, because the handoff is broken, or because a repeated step is suitable for automation.',
      'Automating an unstable process can preserve the wrong sequence faster instead of improving the result.',
      'A workflow diagnostic should identify the trigger, inputs, decision points, outputs, exceptions and success evidence before implementation.',
      'A good automation candidate has enough repetition and observable success criteria to make before-and-after comparison possible.',
      'Qualified human interest should be measured before changing a commercial offer; internal task completion is not buyer evidence.',
      'Stratum can route a qualified workflow from the existing diagnostic to the existing fixed-scope audit without creating a new service.'
    ]
  },
  {
    key:'retry-review-cost',
    title:'Retries and human review belong in the AI budget',
    claims:[
      'The visible API or subscription price can understate workflow cost when failed runs, retries and review time are frequent.',
      'Human review is not automatically waste; it can be a necessary control, but its time should still be visible in the economics.',
      'A workflow with a high nominal model cost can be economical if it succeeds reliably on valuable outcomes, while a cheap workflow can be uneconomical when it fails often.',
      'Cost analysis should preserve uncertainty instead of converting a few examples into a universal savings claim.',
      'The first commercial question is whether a real buyer has a material decision to make, not whether an article or automation ran successfully.',
      'Existing Stratum spend-decision and audit assets should be used before creating a new pricing route.'
    ]
  }
];

async function readJson(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function writeJson(file,v){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(v,null,2)+'\n');}
function hash(text){return 'sha256:'+crypto.createHash('sha256').update(String(text).replace(/\r\n/g,'\n').trim()).digest('hex');}
function hoursSince(x){return x?(Date.now()-new Date(x).getTime())/3600000:Infinity;}
function allZero(counts){return ['intro_engaged','intro_cta','diagnostic_start','diagnostic_complete','audit_click'].every(k=>Number(counts?.[k]||0)===0);}

async function main(){
  const [resp,doc,state]=await Promise.all([
    fetch(STATUS_URL,{headers:{'user-agent':'StratumRevenueDirector/1.0'},signal:AbortSignal.timeout(15000)}),
    readJson(SOURCES,{version:1,sources:[]}),
    readJson(STATE,{version:1,last_run_at:null,last_source_at:null,created_source_ids:[],last_outcome:'NOT_RUN',last_funnel:null})
  ]);
  if(!resp.ok) throw new Error('STATUS_READ_FAILED_'+resp.status);
  const status=await resp.json();
  const counts=status?.acquisition?.counts_24h||{};
  state.last_run_at=new Date().toISOString();
  state.last_funnel=counts;
  state.runtime=status?.runtime?.runtime||'UNKNOWN';

  if(status?.runtime?.company_active!==true || status?.runtime?.runtime!=='SUPABASE_DIRECT'){
    state.last_outcome='HOLD_RUNTIME_NOT_DIRECT_ACTIVE'; await writeJson(STATE,state);
    console.log('DIRECTOR_HOLD runtime not direct+active'); return;
  }
  if(status?.runtime?.first_broken_stage!=='HUMAN_ACQUISITION' || !allZero(counts)){
    state.last_outcome='HOLD_REVENUE_STAGE_ADVANCED'; await writeJson(STATE,state);
    console.log('DIRECTOR_HOLD revenue stage advanced beyond zero-human acquisition'); return;
  }
  if(hoursSince(state.last_source_at)<24){
    state.last_outcome='HOLD_24H_CAP'; await writeJson(STATE,state);
    console.log('DIRECTOR_HOLD 24h source cap'); return;
  }

  const created=new Set(state.created_source_ids||[]);
  const topic=TOPICS.find(t=>!created.has('revenue-director-'+t.key));
  if(!topic){
    state.last_outcome='ACQUISITION_SOURCE_POOL_EXHAUSTED'; await writeJson(STATE,state);
    console.log('DIRECTOR_EXHAUSTED evergreen acquisition pool; require new channel/evidence, not more content'); return;
  }

  const sourceId='revenue-director-'+topic.key;
  const sourceFile='acquisition/media-engine/runtime-sources/'+sourceId+'.md';
  const sourceText=[
    '# '+topic.title,
    '',
    'Owner authorization: Stratum autonomous revenue company distribution asset, 2026-10-05.',
    'Purpose: acquire qualified humans into the existing measured B2B route. No new product, price, checkout or guaranteed outcome.',
    '',
    '## Approved operating claims',
    ...topic.claims.map(x=>'- '+x),
    '',
    '## Revenue route',
    '- Official entry: '+ENTRY,
    '- Diagnostic: '+DIAG,
    '- Self-service: '+KIT,
    '- Fixed-scope audit: '+AUDIT,
    '',
    '## Evidence boundary',
    'Publication and reach are not revenue. Human, Qualified Action, Buyer Signal, Checkout and Payment are separate evidence stages.'
  ].join('\n');

  await fs.mkdir(path.join(ROOT,'acquisition/media-engine/runtime-sources'),{recursive:true});
  await fs.writeFile(path.join(ROOT,sourceFile),sourceText+'\n');

  const source={
    source_id:sourceId,
    source_type:'OWNER_APPROVED_SOURCE',
    title:topic.title,
    language:'en',
    content_hash:hash(sourceText),
    source_file:sourceFile,
    source_url:ENTRY,
    created_at:new Date().toISOString(),
    completed_at:new Date().toISOString(),
    status:'COMPLETE',
    audience_keys:['finance','ops_lead','smb_owner','ai_buyer'],
    evidence_families:['owned_behavior','editorial_source'],
    allowed_claims:topic.claims,
    restricted_claims:[
      {phrase:'guaranteed ROI',safe_rewrite:'No guaranteed financial outcome is supported.'},
      {phrase:'our customers saved',safe_rewrite:'No customer savings claim is supported by this source.'},
      {phrase:'the market has validated',safe_rewrite:'Traffic, buyer and payment evidence must be measured separately.'},
      {phrase:'we always reduce costs',safe_rewrite:'The route supports a decision; it does not promise a reduction.'}
    ],
    personal_experience_claims:[],
    evidence_refs:[sourceFile,ENTRY,DIAG,KIT,AUDIT],
    existing_product_routes:[
      {role:'PRIMARY',asset_id:'stratum-b2b-intro',url:ENTRY,cta:'Run the free workflow diagnostic'},
      {role:'DIAGNOSTIC',asset_id:'stratum-workflow-diagnostic',url:DIAG,cta:'Diagnose one recurring workflow'},
      {role:'SELF_SERVICE',asset_id:'ai-saas-spend-decision-kit',url:KIT,cta:'Use the $39 decision kit'},
      {role:'HIGH_TOUCH',asset_id:'workflow-opportunity-audit',url:AUDIT,cta:'Review the fixed-scope $499 audit'}
    ],
    excerpt:topic.claims.slice(0,2).join(' '),
    notes:'Created by Stratum Revenue Director under explicit owner authorization for autonomous B2B distribution on 2026-10-05. Existing assets only. No customer outcome, market-validation or guaranteed-ROI claim.'
  };

  if(!Array.isArray(doc.sources)) throw new Error('sources.json missing sources[]');
  if(!doc.sources.some(s=>s.source_id===sourceId)) doc.sources.push(source);
  doc.updated_at=new Date().toISOString().slice(0,10);
  await writeJson(SOURCES,doc);

  state.last_source_at=new Date().toISOString();
  state.created_source_ids=[...(state.created_source_ids||[]),sourceId];
  state.last_outcome='SOURCE_CREATED';
  state.last_source_id=sourceId;
  await writeJson(STATE,state);
  console.log('DIRECTOR_SOURCE_CREATED '+sourceId);
}

main().catch(e=>{console.error('DIRECTOR_STOP '+e.message);process.exitCode=1;});
