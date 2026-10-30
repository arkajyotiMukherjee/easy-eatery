import os, subprocess, tempfile, time, json, urllib.request, pathlib, shutil, socket
from playwright.sync_api import sync_playwright, expect
root=str(pathlib.Path(__file__).resolve().parents[1])
tmp=tempfile.TemporaryDirectory(prefix='loyalty-browser-')
key='local-synthetic-browser-test-key'
with socket.socket() as sock:
 sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}'
env={**os.environ,'LOYALTY_DEMO_PORT':str(port),'LOYALTY_DEMO_TOKEN':key,'LOYALTY_DEMO_FILE':tmp.name+'/loyalty.json'}
process=None

def start():
 global process
 process=subprocess.Popen(['npm','run','demo:loyalty'],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,start_new_session=True)
 for i in range(100):
  try:
   if urllib.request.urlopen(base+'/health').status==200:return
  except Exception:time.sleep(.1)
 raise Exception('server not ready')
def stop():
 import signal
 if process:
  os.killpg(process.pid,signal.SIGTERM);process.wait(timeout=10)
def api(path='',body=None):
 req=urllib.request.Request(base+'/api/demo/loyalty/'+path,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
 return json.loads(urllib.request.urlopen(req).read())
start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser'),headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1100})
  errors=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(base+'/loyalty')
  expect(page.locator('html')).to_have_attribute('lang','es')
  page.locator('#token').fill(key)
  page.locator('#access button').first.click();expect(page.locator('#workspace')).to_be_visible()
  page.locator('#sync').click();expect(page.locator('#wallet-balance')).to_have_text('0')
  page.locator('[data-view=staff]').click();page.locator('#amount').fill('10500');page.locator('#sale-form button').click()
  expect(page.locator('#live-balance')).to_have_text('10')
  page.locator('#repeat-sale').click();expect(page.locator('#live-balance')).to_have_text('10')
  assert len(api('state')['ledger'])==1
  page.locator('[data-view=customer]').click();expect(page.locator('#wallet-balance')).to_have_text('10')
  page.locator('#rewards button').first.click();expect(page.locator('#live-balance')).to_have_text('5')
  page.locator('[data-view=staff]').click();page.locator('#staff-redemptions input[id^=reason-]').fill('Entrega ficticia confirmada');page.locator('#staff-redemptions input[id^=receipt-]').fill('demo-receipt-1');page.locator('#staff-redemptions button[type=submit]').click();expect(page.locator('#staff-redemptions button')).to_have_count(0)
  page.locator('#language').select_option('en');expect(page.locator('html')).to_have_attribute('lang','en')
  page.locator('[data-view=owner]').click();page.locator('#wallet-available').uncheck()
  expect(page.locator('#wallet-status')).to_have_text('Interrupted')
  page.locator('[data-view=staff]').click();page.locator('#amount').fill('5000');page.locator('#channel').select_option('dine_in');page.locator('#sale-form button').click()
  expect(page.locator('#live-balance')).to_have_text('10')
  page.locator('[data-view=customer]').click();expect(page.locator('#wallet-balance')).to_have_text('5')
  page.locator('#sync').click();expect(page.locator('#notice')).to_contain_text('unavailable')
  page.locator('[data-view=owner]').click();page.locator('#wallet-available').check()
  page.locator('[data-view=customer]').click();page.locator('#sync').click();expect(page.locator('#wallet-balance')).to_have_text('10')
  evidence=pathlib.Path(root)/'.demo/evidence'; evidence.mkdir(parents=True,exist_ok=True)
  page.screenshot(path=str(evidence/'desktop-en.png'),full_page=True)
  # Credential storage must remain memory only.
  assert page.evaluate('Object.keys(localStorage)')==['easy-eatery-loyalty-language']
  page.set_viewport_size({'width':390,'height':844});page.locator('#language').select_option('es')
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  page.screenshot(path=str(evidence/'mobile-es.png'),full_page=True)
  page.locator('[data-view=staff]').click();page.locator('#sales button').first.click()
  expect(page.locator('#live-balance')).to_have_text('5')
  before=api('state');stop();start();after=api('state');assert before==after
  page.reload();page.locator('#token').fill(key);page.locator('#access button').first.click();expect(page.locator('#workspace')).to_be_visible()
  expect(page.locator('#live-balance')).to_have_text('5')
  page.locator('[data-view=owner]').click();page.once('dialog',lambda dialog:dialog.accept());page.locator('#reset').click()
  expect(page.locator('#live-balance')).to_have_text('0');assert len(api('state')['ledger'])==0
  # Owner edits affect only future actions; member lookup and enrollment use text DOM.
  page.locator('#rate').fill('2000');page.locator('#coffee-cost').fill('6');page.locator('#discount-cost').fill('12');page.locator('#program-form button').click()
  expect(page.locator('#notice')).to_contain_text('registrada')
  assert api('state')['program']['clpPerToken']==2000
  page.locator('[data-view=staff]').click();page.locator('#lookup-id').fill('demo-alex');page.locator('#lookup-form button').click()
  expect(page.locator('#member')).to_have_value('demo-alex')
  page.locator('#name').fill('<img src=x onerror=alert(1)>');page.locator('#loyalty-accepted').check();page.locator('#member-form button').click()
  expect(page.locator('#member option:checked')).to_contain_text('<img')
  assert page.locator('#workspace img').count()==0
  # Drop an already-committed HTTP response: resubmission must keep its original event ID.
  def lose_response(route):
   route.fetch();route.abort()
  page.route('**/api/demo/loyalty/sales',lose_response,times=1)
  page.locator('#amount').fill('12000');page.locator('#sale-form button').click()
  expect(page.locator('#pending-sale')).not_to_have_text('')
  assert len(api('state')['ledger'])==1
  page.locator('#sale-form button').click();expect(page.locator('#pending-sale')).to_have_text('')
  assert len(api('state')['ledger'])==1
  expect(page.locator('#live-balance')).to_have_text('6')
  page.locator('[data-view=customer]').click();page.locator('#rewards button').first.click();expect(page.locator('#live-balance')).to_have_text('0')
  page.locator('[data-view=staff]').click();page.locator('#staff-redemptions input[id^=reason-]').fill('Cancelación del ensayo');page.locator('#staff-redemptions button.secondary').click();expect(page.locator('#live-balance')).to_have_text('6')
  page.locator('[data-view=owner]').click();page.locator('#adjustment-delta').fill('2');page.locator('#adjustment-reason').fill('Corrección ficticia autorizada');page.locator('#adjustment-form button').click();expect(page.locator('#live-balance')).to_have_text('8')
  member_id=page.locator('#member').input_value();old_barcode=next(m['barcode'] for m in api('state')['members'] if m['id']==member_id)
  page.once('dialog',lambda dialog:dialog.accept());page.locator('#revoke-barcode').click()
  expect(page.locator('#wallet-member')).not_to_have_text(old_barcode)
  page.locator('[data-view=staff]').click();page.locator('#lookup-id').fill(old_barcode);page.locator('#lookup-form button').click()
  expect(page.locator('#notice')).to_contain_text('encontr')
  # A definite validation rejection must allow correction of the same fulfillment form.
  page.locator('[data-view=customer]').click();page.locator('#rewards button').first.click()
  expect(page.locator('#live-balance')).to_have_text('2')
  page.locator('[data-view=staff]').click()
  page.locator('#staff-redemptions input[id^=reason-]').fill('     ')
  page.locator('#staff-redemptions input[id^=receipt-]').fill('correction-demo')
  page.locator('#staff-redemptions button[type=submit]').click()
  expect(page.locator('#notice')).to_have_class('error')
  page.locator('#staff-redemptions input[id^=reason-]').fill('Corrected demo fulfillment')
  page.locator('#staff-redemptions input[id^=receipt-]').fill('correction-demo')
  page.locator('#staff-redemptions button[type=submit]').click()
  expect(page.locator('#staff-redemptions button')).to_have_count(0)
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.tagName')!='BODY'
  assert not errors,errors
  browser.close()
  print('PASS: Chromium Spanish/English, desktop/mobile no overflow, sale/replay, issue/use, outage/recovery, reverse, process restart, reset, no JS errors; owner rules/lookup/enrollment, uncertain HTTP replay, reasoned adjustment/cancellation, keyboard focus; screenshots .demo/evidence')
finally:
 stop();tmp.cleanup()
