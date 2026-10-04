from playwright.sync_api import sync_playwright
from pathlib import Path
import argparse,json,shutil
parser=argparse.ArgumentParser()
parser.add_argument("bundle",type=Path)
parser.add_argument("--browser",default=shutil.which("chromium") or shutil.which("google-chrome"))
parser.add_argument("--output-dir",type=Path,default=Path("artifacts"))
args=parser.parse_args();args.output_dir.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=args.browser,headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1600,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(args.bundle.read_text(encoding='utf-8'));page.click('#tutorialBtn');page.wait_for_function('__LEX.intro===0&&__LEX.running')
 steps=[]
 page.screenshot(path=str(args.output_dir/'lexburner-v0.2-tutorial.png'))
 page.keyboard.down('KeyD');page.wait_for_timeout(280);page.keyboard.up('KeyD');page.keyboard.press('KeyW');page.wait_for_function('__LEX.lesson===1')
 steps.append('movement + jump')
 page.keyboard.press('KeyJ');page.wait_for_function('__LEX.lesson===2');steps.append('normal hit')
 for key,n in [('KeyJ',1),('KeyJ',2),('KeyK',3)]:
  page.keyboard.press(key);page.wait_for_function(f'__LEX.world.fighters[0].combo>={n}')
 page.wait_for_function('__LEX.lesson===3');steps.append('true three-hit combo')
 page.keyboard.down('KeyL');page.wait_for_function('__LEX.lesson===4');page.keyboard.up('KeyL');steps.append('guard enemy attack')
 page.keyboard.press('KeyU');page.wait_for_function('__LEX.lesson===5');steps.append('cross slash')
 for key in ['KeyJ','KeyK','KeyL']:page.keyboard.down(key)
 page.wait_for_function('__LEX.world.cinematic>0')
 for key in ['KeyJ','KeyK','KeyL']:page.keyboard.up(key)
 page.wait_for_function('!__LEX.running&&document.querySelector("#resultTitle").textContent==="入门完成"',timeout=10000)
 steps.append('super cut-in, hit and completion')
 page.screenshot(path=str(args.output_dir/'lexburner-v0.2-tutorial-complete.png'))
 assert not errors,errors
 report={'steps_completed_by_physical_keys':steps,'errors':errors};print(json.dumps(report,ensure_ascii=False,indent=2))
 (args.output_dir/'tutorial-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 b.close()
