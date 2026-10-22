import postgres from 'npm:postgres@3.4.7';

const DB=Deno.env.get('SUPABASE_DB_URL');
if(!DB) throw new Error('SUPABASE_DB_URL unavailable');
const sql=postgres(DB,{max:2,prepare:false,idle_timeout:5,connect_timeout:5});

const ALLOWED_ORIGINS=new Set(['https://stratumpraxis.com','https://www.stratumpraxis.com']);
const PROJECT='stratum';
const ROUTES=new Set(['b2b_intro','b2b_diagnostic']);
const CHECKOUT_ROUTE=/^checkout_[a-z0-9_]{1,68}$/;
const EVENTS=new Set([
  'INTRO_ENGAGED',
  'INTRO_CTA_CLICK',
  'DIAGNOSTIC_START',
  'DIAGNOSTIC_COMPLETE',
  'DIAGNOSTIC_AUDIT_CLICK',
  'DIAGNOSTIC_SAMPLE_CLICK',
  'CHECKOUT_CLICK'
]);

function cors(origin:string|null){
  const allow=origin&&ALLOWED_ORIGINS.has(origin)?origin:'https://stratumpraxis.com';
  return {
    'access-control-allow-origin':allow,
    'access-control-allow-methods':'GET,POST,OPTIONS',
    'access-control-allow-headers':'content-type',
    'vary':'Origin'
  };
}
function json(data:unknown,status=200,origin:string|null=null){
  return new Response(JSON.stringify(data),{
    status,
    headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...cors(origin)}
  });
}
function clean(v:unknown,max=180){
  return String(v??'').replace(/[\r\n\t]/g,' ').trim().slice(0,max);
}
async function sha256(v:string){
  const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function snapshot(){
  const rows=await sql`
    select
      count(*) filter(where qa=false and webdriver=false and input_trusted=true and event_type='INTRO_ENGAGED' and created_at>now()-interval '24 hours')::int as intro_engaged_24h,
      count(*) filter(where qa=false and webdriver=false and input_trusted=true and event_type='INTRO_CTA_CLICK' and created_at>now()-interval '24 hours')::int as intro_cta_24h,
      count(*) filter(where qa=false and webdriver=false and input_trusted=true and event_type='DIAGNOSTIC_START' and created_at>now()-interval '24 hours')::int as diagnostic_start_24h,
      count(*) filter(where qa=false and webdriver=false and input_trusted=true and event_type='DIAGNOSTIC_COMPLETE' and created_at>now()-interval '24 hours')::int as diagnostic_complete_24h,
      count(*) filter(where qa=false and webdriver=false and input_trusted=true and event_type='DIAGNOSTIC_AUDIT_CLICK' and created_at>now()-interval '24 hours')::int as audit_click_24h,
      count(*) filter(where qa=false and webdriver=false and input_trusted=true and created_at>now()-interval '7 days')::int as events_7d,
      count(*) filter(where qa=false and created_at>now()-interval '24 hours')::int as raw_non_qa_events_24h,
      count(*) filter(where qa=true and created_at>now()-interval '24 hours')::int as qa_events_24h,
      count(*) filter(where qa=false and webdriver=false and event_type='INTRO_ENGAGED' and created_at>now()-interval '7 days')::int as intro_engaged_nonwebdriver_7d,
      count(*) filter(where qa=false and webdriver=false and input_trusted=true and event_type='INTRO_ENGAGED' and created_at>now()-interval '7 days')::int as intro_engaged_trusted_7d,
      max(created_at) filter(where qa=false and webdriver=false) as latest_unverified_browser_candidate_at,
      count(*) filter(where qa=false and created_at>now()-interval '7 days')::int as raw_non_qa_events_7d,
      max(created_at) filter(where qa=false and webdriver=false and input_trusted=true) as latest_non_qa_at,
      max(created_at) filter(where qa=true) as latest_qa_at
    from public.company_funnel_events
    where project_unit_id='stratum'
      and route_id in ('b2b_intro','b2b_diagnostic')
  `;
  return {
    ok:true,
    project:PROJECT,
    official_entry:'https://stratumpraxis.com/b2b-intro/?v=b0a7a7a',
    measurement_boundary:'TRUSTED_NON_WEBDRIVER_BROWSER_INTERACTION_CANDIDATE_ONLY',
    auto_human_promotion:false,
    auto_buyer_promotion:false,
    payment_inference:false,
    counts:rows[0]??{}
  };
}

Deno.serve(async(req)=>{
  const origin=req.headers.get('origin');
  try{
    if(req.method==='OPTIONS') return new Response(null,{status:204,headers:cors(origin)});
    if(req.method==='GET') return json(await snapshot(),200,origin);
    if(req.method!=='POST') return json({error:'method_not_allowed'},405,origin);
    if(!origin || !ALLOWED_ORIGINS.has(origin)) return json({error:'origin_not_allowed'},403,origin);
    const body=await req.json().catch(()=>null);
    if(!body || typeof body!=='object') return json({error:'invalid_json'},400,origin);

    const eventId=clean((body as any).event_id,120);
    const route=clean((body as any).route_id,80);
    const eventType=clean((body as any).event_type,60);
    const path=clean((body as any).path,240);
    const routeAllowed=ROUTES.has(route) || CHECKOUT_ROUTE.test(route);
    if(!eventId || !routeAllowed || !EVENTS.has(eventType) || !path){
      return json({error:'invalid_event'},400,origin);
    }

    const sessionRaw=clean((body as any).session_key,180);
    const sessionHash=sessionRaw?await sha256(sessionRaw):null;
    const dwellRaw=Number((body as any).dwell_ms);
    const dwell=Number.isFinite(dwellRaw)?Math.max(0,Math.min(3600000,Math.round(dwellRaw))):null;
    const qa=Boolean((body as any).qa);
    const trusted=Boolean((body as any).input_trusted);
    const webdriver=Boolean((body as any).webdriver);

    const duplicate = await sql.begin(async (tx) => {
    const inserted = await tx`
      insert into public.company_funnel_events(
        event_id,project_unit_id,route_id,event_type,path,
        utm_source,utm_medium,utm_campaign,utm_content,referrer_host,
        session_hash,input_trusted,webdriver,dwell_ms,qa
      ) values(
        ${eventId},${PROJECT},${route},${eventType},${path},
        ${clean((body as any).utm_source,100)||null},
        ${clean((body as any).utm_medium,100)||null},
        ${clean((body as any).utm_campaign,160)||null},
        ${clean((body as any).utm_content,160)||null},
        ${clean((body as any).referrer_host,160)||null},
        ${sessionHash},${trusted},${webdriver},${dwell},${qa}
      ) on conflict(event_id) do nothing returning event_id
    `;
    if (!inserted.length) return true;

    if(!qa && !webdriver && trusted && eventType==='DIAGNOSTIC_COMPLETE'){
      await tx`
        insert into public.company_state_evidence(
          unit_id,evidence_type,title,detail,confidence,occurred_at,created_at
        ) values(
          'stratum',
          'HUMAN_TRAFFIC_CANDIDATE',
          'B2B diagnostic completed',
          ${JSON.stringify({
            route,
            event_type:eventType,
            measurement_boundary:'TRUSTED_NON_WEBDRIVER_BROWSER_INTERACTION_CANDIDATE_ONLY',
            buyer_inference:false,
            payment_inference:false
          })},
          'MEDIUM',
          now(),now()
        )
      `;
    }

    if(!qa && !webdriver && trusted && eventType==='CHECKOUT_CLICK'){
      await tx`
        insert into public.company_state_evidence(
          unit_id,evidence_type,title,detail,confidence,occurred_at,created_at
        ) values(
          'stratum',
          'CHECKOUT_CLICK_CANDIDATE',
          'Revenue checkout clicked',
          ${JSON.stringify({
            event_id:eventId,
            route,
            event_type:eventType,
            path,
            measurement_boundary:'TRUSTED_NON_WEBDRIVER_BROWSER_INTERACTION_CANDIDATE_ONLY',
            checkout_inference:false,
            payment_inference:false
          })},
          'MEDIUM',
          now(),now()
        )
      `;
    }

    if(!qa && !webdriver && trusted && eventType==='DIAGNOSTIC_AUDIT_CLICK'){
      await tx`
        insert into public.company_state_evidence(
          unit_id,evidence_type,title,detail,confidence,occurred_at,created_at
        ) values(
          'stratum',
          'QUALIFIED_ACTION_CANDIDATE',
          'B2B audit CTA clicked',
          ${JSON.stringify({
            route,
            event_type:eventType,
            destination:'https://buy.stripe.com/14A00kgfqavh4Wkgoj6Zy02',
            measurement_boundary:'TRUSTED_NON_WEBDRIVER_BROWSER_INTERACTION_CANDIDATE_ONLY',
            buyer_inference:false,
            checkout_inference:false,
            payment_inference:false
          })},
          'MEDIUM',
          now(),now()
        )
      `;
      await tx`
        update public.company_state_units
        set blocker='QUALIFIED_ACTION_CANDIDATE_OBSERVED__VERIFY_BUYER_OR_CHECKOUT',
            next_action='Verify checkout or buyer evidence. Do not infer payment from a browser click.',
            updated_at=now()
        where id='stratum'
      `;
    }

    return false;
    });

    return json({
      accepted:true,
      duplicate,
      classification:'CANDIDATE_ONLY',
      human_promoted:false,
      buyer_promoted:false,
      payment_promoted:false
    },202,origin);
  }catch(e){
    return json({error:e instanceof Error?e.message:String(e)},500,origin);
  }
});
