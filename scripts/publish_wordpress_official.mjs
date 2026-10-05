#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const [,, packagePath] = process.argv;
if (!packagePath) throw new Error('usage: publish_wordpress_official.mjs <package.json>');

const pkg = JSON.parse(fs.readFileSync(packagePath,'utf8'));
const fail = m => { console.error('FAIL_CLOSED: '+m); process.exit(1); };

if (pkg.brand !== 'Stratum') fail('BRAND_CHECK failed');
if ((pkg.platform||'').toLowerCase() !== 'wordpress') fail('CHANNEL_CHECK failed');
if (!pkg.site || !pkg.title || !pkg.canonical_url || !pkg.content_id) fail('required fields missing');

const token=(process.env.WPCOM_ACCESS_TOKEN||'').trim();
const expectedSite=(process.env.WPCOM_SITE||'stratumpraxis.wordpress.com').trim();
if (!token) fail('WordPress access token missing');
if (pkg.site.toLowerCase() !== expectedSite.toLowerCase()) fail('SITE_CHECK failed');

const evidenceDir='publishing/evidence';
const evidencePath=path.join(evidenceDir, pkg.content_id+'.json');
if (fs.existsSync(evidencePath)) {
  console.log('ALREADY_EVIDENCED '+evidencePath);
  process.exit(0);
}

const slug=('stratum-'+pkg.content_id)
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,180);

const existingUrl='https://public-api.wordpress.com/rest/v1.1/sites/'+encodeURIComponent(expectedSite)+'/posts/slug:'+encodeURIComponent(slug);
const existing=await fetch(existingUrl,{headers:{authorization:'Bearer '+token}});
if (existing.ok) {
  const found=await existing.json();
  fs.mkdirSync(evidenceDir,{recursive:true});
  fs.writeFileSync(evidencePath,JSON.stringify({
    brand:'Stratum',platform:'wordpress',site:expectedSite,
    platform_accepted:true,account_verified:true,deduped_existing:true,
    post_id:found.ID||found.id||null,public_url:found.URL||found.link||null,
    content_id:pkg.content_id,source_url:pkg.canonical_url,
    published_at:found.date||found.modified||new Date().toISOString()
  },null,2)+'\n');
  console.log('WORDPRESS_EXISTING '+(found.URL||found.link||''));
  process.exit(0);
}

const safe=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const content=
  '<p>'+safe(pkg.excerpt||'Evidence-grounded analysis from Stratum Praxis.')+'</p>'+
  '<p><strong>Full analysis:</strong> <a href="'+safe(pkg.canonical_url)+'" rel="noopener">Read on Stratum Praxis</a></p>'+
  '<p><small>Stratum Praxis publishes decision-support content for AI, SaaS spend and workflow evaluation. Product and platform details can change; verify current terms before acting.</small></p>';

const body=new URLSearchParams();
body.set('title',pkg.title);
body.set('content',content);
body.set('status','publish');
body.set('slug',slug);
if (Array.isArray(pkg.tags) && pkg.tags.length) body.set('tags',pkg.tags.join(','));

const endpoint='https://public-api.wordpress.com/rest/v1/sites/'+encodeURIComponent(expectedSite)+'/posts/new/';
const resp=await fetch(endpoint,{
  method:'POST',
  headers:{
    authorization:'Bearer '+token,
    'content-type':'application/x-www-form-urlencoded'
  },
  body
});
if(!resp.ok){
  const detail=(await resp.text()).replace(/\s+/g,' ').slice(0,500);
  fail('WordPress publish failed '+resp.status+(detail?': '+detail:''));
}
const out=await resp.json();
const publicUrl=out.URL||out.link||out.short_URL||null;
if(!publicUrl) fail('WordPress publish returned no public URL');

const evidence={
  brand:'Stratum',
  platform:'wordpress',
  site:expectedSite,
  platform_accepted:true,
  account_verified:true,
  post_id:out.ID||out.id||null,
  public_url:publicUrl,
  content_id:pkg.content_id,
  source_url:pkg.canonical_url,
  published_at:out.date||new Date().toISOString()
};
fs.mkdirSync(evidenceDir,{recursive:true});
fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence));
