import asyncio,json,urllib.parse as up
from playwright.async_api import async_playwright
B="https://eduos-staging.lovable.app"; S="/tmp/browser/p0/s/"; H="eduos-staging.lovable.app"
cap=json.load(open("/tmp/browser/roles/cap.json"))
calls={}
for k,v in cap.items():
  for x in v:
    if not x["u"].endswith("7d8d5de835c4") and k!="pilot" or x["u"].endswith("9b25e89a0fb1"): calls[k+":"+x["u"][-12:]]=x
ROLES={"founder":"/tmp/founder.json","centre_admin":"/tmp/s_admin.json","educator":"/tmp/s_educator.json","parent":"/tmp/s_parent.json","reviewer":"/tmp/s_reviewer.json"}
NEXT=["//evil.com","https://evil.com","/\\evil.com","\\\\evil.com","/\\/evil.com","\\/evil.com","//\\evil.com","/\t/evil.com","/%2F%2Fevil.com","%2F%2Fevil.com","https%3A%2F%2Fevil.com","/%5Cevil.com","/%2F\\evil.com","/\\%2Fevil.com","/%5C/evil.com","/%252F%252Fevil.com","/exam-pattern","/exam-pattern?board=cbse#papers"]
OWN=["/pilot-access","/payment-settings","/feedback-review"]
R={"links":{},"roles":{}}
async def login(b,f,vp={"width":1280,"height":1800}):
  m=json.load(open(f)); c=await b.new_context(viewport=vp); pg=await c.new_page()
  for ck in m["cookies"]: ck["url"]=B
  await c.add_cookies(m["cookies"]); await pg.goto(B)
  await pg.evaluate(f"localStorage.setItem({json.dumps(m['storage_key'])},{json.dumps(json.dumps(m['session']))})")
  return c,pg,m
async def replay(pg,tok):
  out={}
  for k,x in calls.items():
    out[k]=await pg.evaluate("""async ([x,t])=>{const h={};if(t)h.authorization='Bearer '+t;if(x.m=='POST')h['content-type']='application/json';const r=await fetch(x.u,{method:x.m,headers:h,body:x.m=='POST'?x.b:undefined});const s=await r.text();return [r.status,(s.match(/"message":\\{"t":1,"s":"([^"]*)"/)||[])[1]||s.slice(0,60)]}""",[x,tok])
  return out
async def matrix(pg,label):
  for i,n in enumerate(NEXT):
    await pg.goto(B+"/auth?next="+up.quote(n,safe="")); await pg.wait_for_timeout(4500)
    host=up.urlparse(pg.url).netloc
    R["links"].setdefault(n,{})[label]=("SAFE " if host==H else "UNSAFE ")+pg.url.replace(B,"")
    if i in (0,16): await pg.screenshot(path=S+f"next_{label}_{i}.png")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(headless=True)
    c=await b.new_context(); pg=await c.new_page(); await pg.goto(B)
    await matrix(pg,"signed_out")
    a={"server":await replay(pg,None)}
    for r in OWN: await pg.goto(B+r); await pg.wait_for_timeout(3000); a[r]=pg.url.replace(B,"")
    R["roles"]["anonymous"]=a; await c.close()
    for role,f in ROLES.items():
      c,pg,m=await login(b,f)
      await pg.goto(B+"/home"); await pg.wait_for_timeout(7000)
      for t in ["Maybe later","Essential only"]:
        l=pg.get_by_role("button",name=t)
        if await l.count():
          try: await l.first.click(timeout=2000)
          except Exception: pass
      hrefs=await pg.eval_on_selector_all("a[href]","e=>[...new Set(e.map(a=>a.getAttribute('href')))]")
      d={"landing":pg.url.replace(B,""),"nav_owner_links":[h for h in OWN if h in hrefs]}
      await pg.screenshot(path=S+f"{role}_home.png")
      for r in OWN:
        await pg.goto(B+r); await pg.wait_for_timeout(5000); d[r]=pg.url.replace(B,"")
        if role!="founder": await pg.screenshot(path=S+f"{role}{r.replace('/','_')}.png")
      if role=="founder":
        d["server"]={k:v for k,v in (await replay(pg,m["session"]["access_token"])).items() if not k.startswith(("create","revoke"))}
        await matrix(pg,"signed_in_founder")
      else:
        d["server"]=await replay(pg,m["session"]["access_token"])
      R["roles"][role]=d; await c.close()
    await b.close()
asyncio.run(main()); print(json.dumps(R,indent=1))
