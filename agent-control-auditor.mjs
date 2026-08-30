const LEVELS = ['Think','Read','Draft','Execute Reversible','Execute External','Irreversible / Financial'];
const DECISIONS = ['INFORM','RECOMMEND','DECIDE','EXECUTE','IRREVERSIBLE EXECUTION'];

const groups = {
  read: /\b(read|research|search|browse|inspect|review|monitor|analy[sz]e|look up|collect|query|fetch)\b/i,
  draft: /\b(draft|prepare|write|compose|propose|recommend|report|summari[sz]e|suggest)\b/i,
  reversible: /\b(update (?:a )?(?:draft|record)|create (?:a )?(?:draft|ticket)|save|tag|queue|schedule internally)\b/i,
  external: /\b(send|publish|post|deploy|notify|change pricing|update (?:\w+ )?(?:public )?prices?|modify account|book|order)\b/i,
  irreversible: /\b(pay|payment|purchase|refund|delete|destroy|terminate|sign contract|execute contract|transfer funds|wire|trade|financial|irreversible)\b/i,
  approve: /\b(human approval|manual approval|requires? approval|approved by|wait for approval|human review|do not .+ without approval)\b/i,
  decide: /\b(decide|choose|select|determine which|set the|approve|reject)\b/i,
  auto: /\b(automatically|autonomously|without approval|without human|no approval|directly)\b/i,
  retry: /\b(retry|repeat|loop|until success)\b/i,
  cap: /\b(max(?:imum)? \d+|up to \d+|retry (?:cap|limit)|at most \d+|stop after \d+)\b/i,
  evidence: /\b(url|http status|transaction id|message id|record id|commit sha|run id|test result|artifact path|evidence|receipt|log)\b/i,
  untrusted: /\b(web|external content|user input|inbox|email|third.party|uploaded)\b/i,
  verify: /\b(verify|validate|policy check|sanitize|structured handoff|trusted|untrusted)\b/i,
  owner: /\b(owner|accountable|responsible|reports? to)\b/i,
  secret: /\b(?:sk|pk)_(?:live|test)_[a-z0-9]{12,}|api[_ -]?key\s*[:=]\s*["']?[a-z0-9_\-]{12,}|bearer\s+[a-z0-9._\-]{16,}/ig
};

function clean(s=''){ return String(s).replace(groups.secret,'[REDACTED SECRET]').trim(); }
function has(re,s){ re.lastIndex=0; return re.test(s); }
function capability(text){
  if(has(groups.irreversible,text)) return 5;
  if(has(groups.external,text)) return 4;
  if(has(groups.reversible,text)) return 3;
  if(has(groups.draft,text)) return 2;
  if(has(groups.read,text)) return 1;
  return 0;
}
function intendedDecision(text, level){
  if(level===5) return 4;
  if(level>=3) return 3;
  if(has(groups.decide,text)) return 2;
  if(has(groups.draft,text)) return 1;
  return 0;
}
function actualDecision(text, level){
  if(level===5) return 4;
  if(level>=3) return 3;
  if(has(groups.decide,text)) return 2;
  if(has(groups.draft,text)) return 1;
  return 0;
}
function excerpt(text,re){ const line=text.split(/\r?\n/).find(x=>has(re,x)); return line ? clean(line).slice(0,180) : 'No explicit evidence found.'; }
function normalizeIntent(intent){
  const t=clean(intent), level=capability(t), decision=intendedDecision(t,level);
  const output=has(groups.draft,t)?'A draft, recommendation, or report described by the goal':level>=3?'A verified action result':'Information relevant to the stated goal';
  return {goal:t,inputs:has(groups.read,t)?'Information needed to research or evaluate the goal':'No input source is explicitly stated',outputs:output,externalActions:level>=4?`External action is implied (L${level})`:'None required by the declared goal',humanDecisionPoints:decision>=3?'Approval should precede material or external execution':decision===2?'Human retains execution authority':'Human reviews the output before any downstream action',requiredLevel:level,intendedDecision:decision};
}

export function auditAgent(rawIntent, rawConfig){
  const intent=clean(rawIntent), config=clean(rawConfig);
  if(!intent) throw new Error('Describe the business outcome first.');
  if(!config) throw new Error('Paste or upload the current agent configuration.');
  const n=normalizeIntent(intent), actual=capability(config), decision=actualDecision(config,actual);
  const findings=[];
  const add=(type,title,why,evidence,fix,severity='medium')=>findings.push({type,title,why,evidence,fix,severity});
  if(actual>n.requiredLevel) add('excess','Capability beyond stated intent',`The configuration reaches L${actual}, while the declared outcome only requires L${n.requiredLevel}. Extra capability can be legitimate, but only when a separate use case and control owner justify it.`,excerpt(config,actual===5?groups.irreversible:groups.external),`Limit default access to L${n.requiredLevel}; place higher-impact tools behind explicit approval.`,actual>=5?'critical':'high');
  if(actual<n.requiredLevel) add('insufficient','Missing capability required by the goal',`The stated outcome implies L${n.requiredLevel}, but the configuration demonstrates only L${actual}. The agent may be unable to finish the intended workflow.`,n.goal,`Add only the specific L${n.requiredLevel} capability needed, with evidence and a human boundary.`,'high');
  if(decision>n.intendedDecision) add('excess','Decision authority exceeds business intent',`The agent acts at D${decision}, while the intended role is D${n.intendedDecision}. This can turn analysis into an unapproved business decision.`,excerpt(config,groups.external),`Keep analysis automated, but require a human decision before D${n.intendedDecision+1} or higher actions.`,'high');
  if(actual>=4 && !has(groups.approve,config)) add('control','External action lacks a human gate','External effects can reach customers, systems, or public surfaces without an explicit approval boundary.',excerpt(config,groups.external),'Require named human approval immediately before the external action.','high');
  if(actual===5 && !has(groups.approve,config)) add('control','Financial or irreversible authority is unapproved','High-impact actions need a specific approver and evidence trail.',excerpt(config,groups.irreversible),'Remove default access and issue single-use approval for each action.','critical');
  if(has(groups.retry,config) && !has(groups.cap,config)) add('control','Retry behavior has no explicit cap','Unbounded retries can duplicate external effects and create runaway cost.',excerpt(config,groups.retry),'Cap retries, stop after the cap, and escalate to the owner.','high');
  if(!has(groups.evidence,config)) add('control','Completion evidence is undefined','A success claim cannot be independently verified.','No URL, ID, test result, receipt, or artifact requirement found.','Require a verifiable identifier or artifact for every completed run.','medium');
  if(has(groups.untrusted,config) && actual>=4 && !has(groups.verify,config)) add('control','Untrusted input can reach privileged action','External or user-controlled content appears able to influence an external action without a verification boundary.',excerpt(config,groups.untrusted),'Use read → structured handoff → verify → policy check → execute.','critical');
  if(!has(groups.owner,config)) add('control','No accountable owner is named','Exceptions and approvals need a human owner.','No owner or accountable role found.','Name one owner and an escalation route.','medium');
  const excess=actual>n.requiredLevel||decision>n.intendedDecision, insufficient=actual<n.requiredLevel;
  const authorityGap=excess?'EXCESS AUTHORITY':insufficient?'INSUFFICIENT CAPABILITY':'ALIGNED';
  const score=Math.max(0,100-findings.reduce((s,f)=>s+({critical:22,high:14,medium:8}[f.severity]||5),0));
  const risk=findings.some(f=>f.severity==='critical')?'CRITICAL':findings.some(f=>f.severity==='high')?'HIGH':findings.length?'MEDIUM':'LOW';
  return {businessIntent:n,actualCapability:{level:actual,label:LEVELS[actual]},recommendedCeiling:{level:n.requiredLevel,label:LEVELS[n.requiredLevel]},decisionAuthority:{intended:n.intendedDecision,intendedLabel:DECISIONS[n.intendedDecision],actual:decision,actualLabel:DECISIONS[decision]},authorityGap,findings,score,risk,readiness:risk==='CRITICAL'||risk==='HIGH'?'NOT READY':risk==='MEDIUM'?'READY WITH RESTRICTIONS':'READY',humanBoundary:actual>=5?'Named human approves every financial, destructive, contractual, or irreversible action.':actual>=4?'Named human approves external execution; the agent may prepare the action.':decision>=2?'Human confirms the decision before execution.':'Human reviews outputs before downstream use.'};
}

export const labels={levels:LEVELS,decisions:DECISIONS};
