import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const PORT = Number(process.env.PORT || 3000);
const APP_PASSWORD = process.env.APP_PASSWORD || '';
if (APP_PASSWORD.length < 12 || APP_PASSWORD === 'HAY_DAT_MAT_KHAU_RAT_KHO_O_DAY') {
  console.error('Hãy đặt biến môi trường APP_PASSWORD dài tối thiểu 12 ký tự trước khi chạy.');
  process.exit(1);
}

const DIR = path.dirname(fileURLToPath(import.meta.url));
const MAIN_URL = 'https://hoctructuyen.hpu2.edu.vn/login/';
const cookieName = 'hpu2_dashboard';
const cookieToken = crypto.randomBytes(32).toString('hex');
const authAttempts = new Map();
let browser;
let context;
let page;
let busy = false;
let loopBusy = false;
const cfg = { total: 51, seconds: 55, autoPractice: false };
const st = {
  mode: 'idle', message: 'Đăng nhập giao diện quản lý để bắt đầu.',
  current: null, total: 51, estimate: false, url: '', lastAction: null,
  nextTarget: null, lastMove: null, attempts: [], quiz: null, intervention: null,
};
let nextAt = 0;
let practice = null;
let previewCache = null;
let previewCacheAt = 0;
const MAX_BODY = 800_000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const now = () => new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });

function log(message) {
  st.message = message;
  st.lastAction = `${now()} — ${message}`;
  st.attempts.unshift(st.lastAction);
  st.attempts = st.attempts.slice(0, 15);
}
function isAllowedUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && (u.hostname === 'hpu2.edu.vn' || u.hostname.endsWith('.hpu2.edu.vn'));
  } catch { return false; }
}
async function openBrowser() {
  if (page && !page.isClosed()) return page;
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
  browser = await chromium.launch({
    headless: true, executablePath,
    args: ['--disable-dev-shm-usage', '--no-sandbox']
  });
  context = await browser.newContext({
    viewport: { width: 430, height: 900 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    ignoreHTTPSErrors: false,
  });
  page = await context.newPage();
  page.setDefaultTimeout(8_000);
  page.on('crash', () => { st.mode = 'error'; log('Trình duyệt trên máy chủ gặp lỗi. Hãy khởi động lại dịch vụ.'); });
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) { st.url = frame.url(); previewCacheAt = 0; }
  });
  await page.goto(MAIN_URL, { waitUntil: 'domcontentloaded', timeout: 35_000 });
  st.url = page.url();
  st.mode = 'ready';
  log('Đã mở HPU2 trong trình duyệt máy chủ.');
  return page;
}

async function visible(locator) {
  try { return await locator.count() > 0 && await locator.first().isVisible(); } catch { return false; }
}
async function schoolLogin(username, password) {
  if (!username || !password) throw new Error('Bạn cần nhập mã sinh viên và mật khẩu.');
  const p = await openBrowser();
  if (!isAllowedUrl(p.url())) await p.goto(MAIN_URL, { waitUntil: 'domcontentloaded' });
  if (!p.url().includes('/login')) await p.goto(MAIN_URL, { waitUntil: 'domcontentloaded' });
  const psw = p.locator('input[type="password"]').first();
  if (!(await visible(psw))) throw new Error('Không tìm được form đăng nhập. Hãy dùng màn hình điều khiển từ xa.');
  let userField = null;
  for (const selector of [
    'input[name="username"]', 'input[name="identifier"]', 'input[name="user_id"]',
    'input[autocomplete="username"]', 'input[type="text"]', 'input:not([type])'
  ]) {
    const input = p.locator(selector).first();
    if (await visible(input)) { userField = input; break; }
  }
  if (!userField) throw new Error('Không nhận diện được ô mã sinh viên. Dùng màn hình điều khiển từ xa để đăng nhập.');
  await userField.fill(username);
  await psw.fill(password);
  const submit = p.getByRole('button', { name: /đăng nhập|login|sign in/i }).first();
  if (await visible(submit)) await submit.click();
  else await psw.press('Enter');
  await p.waitForLoadState('domcontentloaded', { timeout: 15_000 }).catch(() => {});
  await sleep(1700);
  previewCacheAt = 0;
  st.url = p.url();
  st.mode = 'ready';
  log(st.url.includes('/login') ? 'Đã gửi thông tin đăng nhập. Hãy kiểm tra thông báo trên ảnh xem trước.' : 'Đã chuyển khỏi trang đăng nhập. Mở bài học và chọn nút sang slide.');
}

async function detectProgress() {
  if (!page || page.isClosed()) return null;
  // Ưu tiên số trang thực có trên giao diện (ví dụ 2/51), KHÔNG dùng số lần bấm làm dữ liệu xác thực.
  const regex = new RegExp(String.raw`(?:^|[^\d])(\d{1,3})\s*[/／]\s*${cfg.total}(?!\d)`);
  for (const frame of page.frames()) {
    try {
      const txt = await frame.evaluate(() => document.body?.innerText?.slice(0, 100_000) || '');
      const m = regex.exec(txt);
      if (m && Number(m[1]) >= 1 && Number(m[1]) <= cfg.total) return Number(m[1]);
    } catch { /* inaccessible/unloaded frame */ }
  }
  return null;
}

async function refreshProgress() {
  const found = await detectProgress();
  if (found != null) {
    st.current = found;
    st.estimate = false;
  }
  st.total = cfg.total;
  if (page) st.url = page.url();
  return found;
}

// Ghi nhận yêu cầu can thiệp. Giữ đúng phiên trình duyệt và không tự bấm Next khi chờ người dùng.
function needHuman(kind, reason, signature = '', options = null) {
  const key = String(signature || `${kind}:${st.current ?? '?'}:${st.url}`).slice(0, 500);
  if (st.intervention?.signature === key && st.mode === 'question') return;
  st.intervention = {
    id: crypto.randomUUID(), kind, reason, signature: key, options,
    detectedAt: new Date().toISOString(), slideAtPause: st.current,
    actionAt: null, noBlockCount: 0, verified: false
  };
  st.mode = 'question';
  nextAt = 0;
  previewCacheAt = 0;
  log(`Cần bạn tương tác: ${reason}`);
}
function markHumanAction() {
  if (st.intervention) {
    st.intervention.actionAt = Date.now();
    st.intervention.noBlockCount = 0;
  }
}
function leaveIntervention(message, verified = true) {
  st.intervention = null;
  st.quiz = null;
  practice = null;
  st.mode = 'running';
  // Không chuyển slide ngay lúc người dùng vừa trả lời; bắt đầu lại thời gian chờ.
  nextAt = Date.now() + cfg.seconds * 1000;
  log(`${message}${verified ? '' : ' (chưa xác thực được từ HPU2)'}`);
}
// Nhận diện câu hỏi nhập chữ, radio, checkbox, chọn đáp án, H5P/SCORM theo dấu hiệu giao diện.
// Không cố đoán nội dung Canvas hoặc tự vượt biểu mẫu xác thực.
async function detectBlockingInteraction() {
  if (!page || page.isClosed()) return null;
  for (const frame of page.frames()) {
    try {
      const info = await frame.evaluate(() => {
        if (/\/login(?:\/|\?|$)/i.test(location.pathname)) return null;
        const isVisible = el => {
          if (!el?.getClientRects().length) return false;
          const cs = getComputedStyle(el);
          return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
        };
        const trigger = /(?:câu\s*hỏi|chọn\s+(?:đáp\s*án|câu\s*trả\s*lời|phương\s*án)|hãy\s+(?:chọn|điền|nhập|trả\s*lời)|điền\s+(?:vào|đáp\s*án)|trả\s*lời\s+câu|question\s*\d*|choose\s+(?:one|the|an)|select\s+(?:an\s+)?answer|fill\s+in\s+the\s+blank|type\s+your\s+answer|kiểm\s*tra\s*đáp\s*án)/i;
        const selector = 'input:not([type=hidden]):not([type=password]):not([type=search]),textarea,select,[contenteditable=true],[role=radio],[role=checkbox],[role=option],[role=textbox]';
        const optionsSelector = 'input[type=radio],input[type=checkbox],[role=radio],[role=checkbox],[role=option]';
        const roots = [...document.querySelectorAll('.h5p-question,[class*="question"],[id*="question"],[class*="quiz"],[class*="exercise"],[class*="assessment"],[role=dialog],fieldset,form')].filter(isVisible);
        // Thử vùng liên quan trước, không coi nút tìm kiếm/toàn bộ form của khóa học là câu hỏi.
        let picked = null;
        for (const root of roots) {
          const controls = [...root.querySelectorAll(selector)].filter(isVisible);
          const labels = [...root.querySelectorAll('label,[class*="option"],[class*="answer"]')].filter(isVisible);
          const text = (root.innerText || '').replace(/\s+/g, ' ').slice(0, 1800);
          if (trigger.test(text) && (controls.length > 0 || labels.length >= 2)) {
            if (!picked || root.innerText.length < picked.text.length) picked = {root, controls, labels, text};
          }
        }
        if (!picked) {
          const text = (document.body?.innerText || '').replace(/\s+/g, ' ').slice(-3500);
          const controls = [...document.querySelectorAll(selector)].filter(isVisible);
          const labels = [...document.querySelectorAll('label,[class*="option"],[class*="answer"]')].filter(isVisible);
          if (!trigger.test(text) || controls.length === 0 && labels.length < 2) return null;
          // Không bắt nhầm thanh tìm kiếm/menu nếu thiếu tín hiệu mạnh ở phần câu hỏi.
          if (!/(?:câu\s*hỏi|chọn\s+đáp\s*án|trả\s*lời|question|answer|hãy\s+(?:nhập|điền|chọn))\b/i.test(text)) return null;
          picked = {root: document.body, controls, labels, text};
        }
        const {root,controls,text} = picked;
        const choices = controls.filter(el => el.matches(optionsSelector)).length;
        const written = controls.filter(el => el.matches('textarea,[contenteditable=true],[role=textbox],input[type=text],input:not([type])')).length;
        const kind = written ? 'text' : choices ? 'choice' : 'interactive';
        const body = (root.innerText || document.body?.innerText || '').slice(-2200);
        const wrong = /(?:chưa\s*đúng|không\s*đúng|sai\s*rồi|incorrect|wrong\s*answer|try\s*again)/i.test(body);
        const correct = /(?:trả\s*lời\s*đúng|đáp\s*án\s*chính\s*xác|correct\s*answer|well\s*done|đúng\s*rồi)/i.test(body);
        const hasContinue = [...root.querySelectorAll('button,[role=button],a')].some(el => isVisible(el) && /^(tiếp\s*tục|continue|next\s*question)$/i.test((el.innerText||'').trim()));
        const prompt = text.match(/(?:câu\s*hỏi.{0,130}|hãy\s+(?:chọn|điền|nhập|trả\s*lời).{0,130}|question.{0,130})/i)?.[0] || text.slice(0, 110);
        const formNames = controls.map(el => el.getAttribute('name') || el.getAttribute('id') || el.getAttribute('type') || el.tagName).slice(0,6).join(',');
        return { kind, prompt: prompt.slice(0, 140), correct, wrong, hasContinue,
          signature: `${location.pathname}:${prompt.slice(0,130)}:${formNames}`, frameUrl:location.href };
      });
      if (info) return info;
    } catch { /* frame chưa tải / khác origin hoặc đã bị hủy */ }
  }
  return null;
}

// Khi chờ trả lời, chỉ tự tiếp tục nếu có bằng chứng tiến độ đã đổi hoặc câu hỏi đã biến mất
// sau thao tác của người dùng; không suy diễn từ việc chỉ bấm một đáp án.
async function checkHumanCompletion({manual = false} = {}) {
  const intervention = st.intervention;
  if (!intervention) return { ok:false, message:'Hiện không có câu hỏi chờ xử lý.' };
  const progress = await refreshProgress();
  const blocker = await detectBlockingInteraction();
  const moved = progress != null && intervention.slideAtPause != null && progress > intervention.slideAtPause;
  const answered = !!intervention.actionAt;
  const cleared = answered && !blocker && intervention.kind !== 'blocked';
  if (moved || cleared) {
    intervention.noBlockCount += 1;
    if (manual || intervention.noBlockCount >= 2) {
      leaveIntervention(moved ? 'Trang học đã chuyển tiếp; tiếp tục theo dõi.' : 'Không còn câu hỏi tương tác sau thao tác; tiếp tục theo dõi.');
      return {ok:true};
    }
  } else intervention.noBlockCount = 0;
  const reason = blocker?.hasContinue ? 'Có nút Tiếp tục trên bài học. Hãy bấm nút đó trên ảnh rồi thử lại.' :
    blocker?.wrong ? 'Bài đang báo câu trả lời chưa đúng. Hãy thử lại ngay trên màn hình.' :
    !answered ? 'Hãy trả lời trên màn hình từ xa trước.' :
    'Chưa xác nhận được câu hỏi đã hoàn tất. Kiểm tra màn hình hoặc dùng xác nhận thủ công.';
  return {ok:false, message:reason};
}

// Tìm phần tử được người dùng chỉ trên ảnh screenshot, kể cả khi bài học nằm trong iframe.
async function targetForPoint(x, y) {
  if (!page) return null;
  const frames = [];
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) {
      frames.push({ frame, x, y, area: 430 * 900 });
    } else {
      try {
        const handle = await frame.frameElement();
        const box = await handle.boundingBox();
        if (box && x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height) {
          frames.push({ frame, x: x - box.x, y: y - box.y, area: box.width * box.height });
        }
      } catch { /* detached frame */ }
    }
  }
  frames.sort((a,b) => a.area - b.area);
  for (const target of frames) {
    try {
      const selector = await target.frame.evaluate(({x,y}) => {
        let el = document.elementFromPoint(x, y);
        if (!el || el.tagName === 'IFRAME') return null;
        el = el.closest('button, a, [role="button"], input, label') || el;
        if (el.id && CSS.escape) return '#' + CSS.escape(el.id);
        const parts = [];
        for (let node = el; node && node !== document.body && parts.length < 9; node = node.parentElement) {
          let segment = node.tagName.toLowerCase();
          if (node.id && CSS.escape) { parts.unshift('#' + CSS.escape(node.id)); break; }
          const same = [...(node.parentElement?.children || [])].filter(c => c.tagName === node.tagName);
          if (same.length > 1) segment += `:nth-of-type(${same.indexOf(node)+1})`;
          parts.unshift(segment);
        }
        return parts.join(' > ');
      }, { x: target.x, y: target.y });
      if (selector && await target.frame.locator(selector).count()) {
        return { selector, frameUrl: target.frame.url(), x, y };
      }
    } catch { /* try next frame */ }
  }
  return { x, y, selector: null, frameUrl: '' };
}

async function moveNext() {
  if (!page || !st.nextTarget) throw new Error('Chưa chọn vị trí nút sang slide trên ảnh xem trước.');
  const before = await detectProgress();
  const { selector, frameUrl, x, y } = st.nextTarget;
  let clicked = false;
  if (selector) {
    for (const frame of page.frames()) {
      if (frame.url() !== frameUrl) continue;
      try {
        const loc = frame.locator(selector).first();
        if (await visible(loc)) { await loc.click({ timeout: 5_000 }); clicked = true; break; }
      } catch { /* fallback to original position */ }
    }
  }
  if (!clicked) await page.mouse.click(x, y);
  await sleep(1200);
  const after = await detectProgress();
  if (after != null) {
    st.current = after;
    st.estimate = false;
  } else if (st.current != null && st.current < cfg.total) {
    st.current++;
    st.estimate = true;
  }
  const changed = before != null && after != null && after !== before;
  if (before != null && after != null && !changed) {
    needHuman('blocked', `Bấm Tiếp theo nhưng vẫn ở slide ${before}/${cfg.total}. Có thể cần trả lời hoặc hoàn thành thao tác.`, `blocked:${page.url()}:${before}`);
    return;
  }
  st.lastMove = Date.now();
  if (after === cfg.total) {
    st.mode = 'paused';
    log(`Đã tới slide ${cfg.total}/${cfg.total}. Kiểm tra trạng thái hoàn thành trên HPU2.`);
  } else {
    log(`Đã thử chuyển slide${st.current ? ` — đang hiển thị ${st.current}/${cfg.total}` : ''}${st.estimate ? ' (ước tính)' : ''}.`);
  }
}

async function gatherPracticeQuestion() {
  if (!page) return null;
  for (const frame of page.frames()) {
    try {
      const info = await frame.evaluate(() => {
        const visible = el => !!(el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
        const optionElements = [...document.querySelectorAll('label, button, [role="radio"], [role="option"], [class*="answer"], [class*="choice"], [class*="option"]')];
        const byLetter = {};
        for (const el of optionElements) {
          if (!visible(el)) continue;
          const s = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 260);
          const m = s.match(/^([ABCD])(?:[).:\-]\s*|\s+)(.{1,220})/i);
          if (m && !byLetter[m[1].toUpperCase()]) byLetter[m[1].toUpperCase()] = m[2].trim();
        }
        if (Object.keys(byLetter).length < 4) return null;
        const text = (document.body?.innerText || '').slice(0, 4000);
        // Không tự làm quiz/bài thi chấm điểm.
        const graded = /(?:bài thi|bài kiểm tra|quiz có điểm|nộp bài)/i.test(text) && /(?:thời gian|điểm|lượt làm|nộp bài)/i.test(text);
        const feedback = /(?:câu trả lời (?:của bạn )?(?:chưa đúng|không đúng)|đáp án (?:sai|chưa đúng)|bạn đã trả lời sai|incorrect answer|wrong answer|thử lại để trả lời)/i.test(text) ? 'wrong' :
          /(?:bạn (?:đã )?trả lời đúng|đáp án chính xác(?:!|\.|$)|chúc mừng.{0,45}đúng|correct answer|well done|đúng rồi!)/im.test(text) ? 'correct' : 'none';
        const buttons = [...document.querySelectorAll('button, [role="button"], a')].filter(visible).map(el => (el.innerText || el.textContent || '').trim().toLowerCase());
        return { options: byLetter, graded, feedback,
          retry: buttons.some(t => /^(thử lại|làm lại|try again|retry)$/.test(t)),
          continue: buttons.some(t => /^(tiếp tục|continue|next question)$/.test(t)),
          check: buttons.some(t => /^(kiểm tra|check|trả lời|submit answer)$/.test(t)),
          // Signature để tránh lặp lại lựa chọn cũ trong cùng một câu.
          signature: JSON.stringify(byLetter), frameUrl: location.href };
      });
      if (info) return { ...info, frame };
    } catch { /* unload */ }
  }
  return null;
}
async function pressNamedInFrame(frame, pattern) {
  try {
    const match = frame.getByRole('button', { name: pattern }).first();
    if (await visible(match)) { await match.click({ timeout: 4_000 }); return true; }
    const link = frame.getByRole('link', { name: pattern }).first();
    if (await visible(link)) { await link.click({ timeout: 4_000 }); return true; }
  } catch { /* unavailable */ }
  return false;
}
async function clickOption(frame, letter) {
  return await frame.evaluate((letter) => {
    const candidates = [...document.querySelectorAll('label, button, [role="radio"], [role="option"], [class*="answer"], [class*="choice"], [class*="option"]')];
    const hit = candidates.find(el => {
      if (!el.getClientRects().length) return false;
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      return new RegExp('^' + letter + '(?:[).:\\-]\\s*|\\s+)\\S', 'i').test(text);
    });
    if (!hit) return false;
    hit.click();
    return true;
  }, letter);
}

async function handlePractice(q) {
  if (q.graded) {
    needHuman('graded', 'Phát hiện bài kiểm tra có điểm; bạn cần tự trả lời.', `graded:${q.signature}`, q.options);
    return;
  }
  st.quiz = { options: q.options, signature: q.signature, tried: practice?.tried || [] };
  if (!cfg.autoPractice) {
    needHuman('choice', 'Câu hỏi A/B/C/D cần bạn chọn đáp án trên màn hình.', `choice:${q.signature}`, q.options);
    return;
  }
  if (!practice || practice.signature !== q.signature) {
    practice = { signature: q.signature, frameUrl: q.frameUrl, startSlide: st.current, tried: [], stage: 'choose', at: 0 };
    log('Đang xử lý câu hỏi luyện tập (tối đa bốn lựa chọn, không làm bài thi tính điểm).');
  }
  if (Date.now() - practice.at < 2800) return;
  practice.at = Date.now();
  if (q.feedback === 'correct') {
    await pressNamedInFrame(q.frame, /^(tiếp tục|continue|next question)$/i);
    practice = null;
    st.quiz = null;
    nextAt = Date.now() + cfg.seconds * 1000;
    log('Câu luyện tập đã có phản hồi đúng, tiếp tục chờ slide.');
    return;
  }
  if (q.feedback === 'wrong') {
    if (!q.retry) {
      needHuman('choice', 'Chưa đúng, nhưng không thấy nút Thử lại. Bạn cần tự thao tác.', `choice:${q.signature}`, q.options);
      return;
    }
    await pressNamedInFrame(q.frame, /^(thử lại|làm lại|try again|retry)$/i);
    practice.stage = 'choose';
    return;
  }
  if (practice.stage === 'waiting') {
    // Đã chọn nhưng hệ thống không báo đúng/sai: không chọn bừa tiếp.
    needHuman('choice', 'Chưa nhận được phản hồi đúng/sai. Hãy kiểm tra câu trả lời.', `choice:${q.signature}`, q.options);
    return;
  }
  const letter = ['A','B','C','D'].find(a => !practice.tried.includes(a));
  if (!letter) {
    needHuman('choice', 'Không xác định được đáp án. Bạn cần tự trả lời.', `choice:${q.signature}`, q.options);
    return;
  }
  if (!(await clickOption(q.frame, letter))) {
    needHuman('choice', 'Không bấm được đáp án. Bạn cần tự trả lời.', `choice:${q.signature}`, q.options);
    return;
  }
  practice.tried.push(letter);
  st.quiz.tried = [...practice.tried];
  if (q.check) await pressNamedInFrame(q.frame, /^(kiểm tra|check|trả lời|submit answer)$/i);
  practice.stage = 'waiting';
  log(`Đã thử phương án ${letter}. Đang đợi phản hồi từ bài luyện tập.`);
}

// Một số player ẩn bốn lựa chọn sau khi trả lời, chỉ còn nút Thử lại/Tiếp tục.
// Hỗ trợ bước này mà không xem việc câu hỏi biến mất là đã trả lời đúng.
async function handleFeedbackOnly() {
  if (!practice || !page) return false;
  if (st.current != null && practice.startSlide != null && st.current !== practice.startSlide) {
    practice = null;
    st.quiz = null;
    return false;
  }
  for (const frame of page.frames()) {
    if (frame.url() !== practice.frameUrl) continue;
    try {
      const state = await frame.evaluate(() => {
        const content = (document.body?.innerText || '').slice(-3200);
        const visible = el => !!el.getClientRects().length;
        const names = [...document.querySelectorAll('button, a, [role="button"]')].filter(visible)
          .map(e => (e.innerText||e.textContent||'').trim().toLowerCase());
        return {
          correct: /(?:bạn (?:đã )?trả lời đúng|đáp án chính xác(?:!|\.|$)|correct answer|well done|đúng rồi!)/im.test(content),
          wrong: /(?:bạn đã trả lời sai|incorrect answer|wrong answer|câu trả lời chưa đúng)/i.test(content),
          continue: names.some(s => /^(tiếp tục|continue|next question)$/.test(s)),
          retry: names.some(s => /^(thử lại|làm lại|try again|retry)$/.test(s))
        };
      });
      if (state.correct && state.continue) {
        await pressNamedInFrame(frame, /^(tiếp tục|continue|next question)$/i);
        practice=null; st.quiz=null; nextAt=Date.now()+cfg.seconds*1000;
        log('Đã nhận phản hồi đúng và bấm Tiếp tục sau câu luyện tập.');
        return true;
      }
      if (state.wrong && state.retry && Date.now()-practice.at>2500) {
        await pressNamedInFrame(frame, /^(thử lại|làm lại|try again|retry)$/i);
        practice.stage='choose'; practice.at=Date.now();
        return true;
      }
    } catch { /* unavailable frame */ }
  }
  needHuman('choice', 'Giao diện câu hỏi thay đổi. Bạn cần kiểm tra và trả lời.', `choice:${practice.signature}`);
  return true;
}

async function backgroundTick() {
  if (loopBusy || busy || !['running','question'].includes(st.mode) || !page || page.isClosed()) return;
  loopBusy = true;
  try {
    if (st.mode === 'question') {
      if (st.intervention?.actionAt) await checkHumanCompletion();
      return;
    }
    await refreshProgress();
    const question = await gatherPracticeQuestion();
    if (question) {
      await handlePractice(question);
      return;
    }
    if (practice && await handleFeedbackOnly()) return;
    const generic = await detectBlockingInteraction();
    if (generic) {
      needHuman(generic.kind, generic.kind === 'text' ? 'Câu hỏi yêu cầu nhập đáp án.' : 'Bài học đang yêu cầu thao tác/trả lời câu hỏi.', generic.signature);
      return;
    }
    st.quiz = null;
    practice = null;
    if (Date.now() < nextAt) return;
    await moveNext();
    nextAt = Date.now() + cfg.seconds * 1000;
  } catch (err) {
    st.mode = 'paused';
    log(`Tạm dừng do không thể tương tác: ${err.message.slice(0, 150)}`);
  } finally { loopBusy = false; }
}
setInterval(backgroundTick, 2400).unref();

function send(res, status, data, extraHeaders={}) {
  const buf = Buffer.from(JSON.stringify(data));
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Content-Length': buf.length,
    'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...extraHeaders });
  res.end(buf);
}
function isAuthorized(req) {
  const cookie = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='));
  const token = cookie?.slice(cookieName.length+1) || '';
  const a = Buffer.from(token), b = Buffer.from(cookieToken);
  return a.length === b.length && crypto.timingSafeEqual(a,b);
}
async function parseJson(req) {
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > MAX_BODY) throw new Error('Dữ liệu quá lớn.');
  }
  try { return JSON.parse(data || '{}'); }
  catch { throw new Error('JSON không hợp lệ.'); }
}
function preventForeignOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.host === req.headers.host && (parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
  } catch { return false; }
}
async function handleAction(req, res, route, data) {
  if (busy) return send(res, 409, { error:'Máy chủ đang xử lý lệnh trước. Thử lại sau.' });
  busy = true;
  try {
    if (route === '/api/open') {
      const url = String(data.url || MAIN_URL).trim();
      if (!isAllowedUrl(url)) throw new Error('Chỉ mở đường dẫn HTTPS thuộc hpu2.edu.vn để bảo vệ tài khoản.');
      const p = await openBrowser();
      await p.goto(url, { waitUntil:'domcontentloaded', timeout:35_000 });
      st.mode = 'ready';
      st.nextTarget = null;
      st.current = null;
      st.quiz = null;
      practice = null;
      log('Đã mở trang. Bấm vào khóa học/bài học trên màn hình xem trước.');
      st.intervention = null;
    } else if (route === '/api/school-login') {
      await schoolLogin(String(data.username || ''), String(data.password || ''));
    } else if (route === '/api/tap' || route === '/api/calibrate') {
      const p = await openBrowser();
      st.mode = st.mode === 'running' ? 'paused' : st.mode;
      const x = Number(data.x), y = Number(data.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || x<0 || y<0 || x>430 || y>900) throw new Error('Vị trí bấm không hợp lệ.');
      if (route === '/api/calibrate') {
        st.nextTarget = await targetForPoint(x, y);
        log('Đã đánh dấu nút sang slide. Nút chỉ được bấm khi bạn chọn Bắt đầu.');
      } else {
        markHumanAction();
        await p.mouse.click(x,y);
        await sleep(250);
        await refreshProgress();
        log(`Đã bấm trên trình duyệt từ xa tại (${Math.round(x)}, ${Math.round(y)}).`);
      }
    } else if (route === '/api/type') {
      const p = await openBrowser();
      if (st.mode !== 'question') st.mode = 'paused';
      markHumanAction();
      await p.keyboard.insertText(String(data.text || '').slice(0, 500));
      log('Đã gõ nội dung vào ô đang chọn.');
    } else if (route === '/api/replace') {
      const p = await openBrowser();
      st.mode = st.mode === 'question' ? 'question' : 'paused';
      markHumanAction();
      await p.keyboard.press('ControlOrMeta+A');
      await p.keyboard.insertText(String(data.text || '').slice(0, 500));
      log('Đã thay nội dung ô đang nhập.');
    } else if (route === '/api/key') {
      const p = await openBrowser();
      const key = String(data.key || 'Enter');
      if (!['Enter','Tab','Escape','Backspace','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Space'].includes(key)) throw new Error('Phím không được hỗ trợ.');
      if (st.mode !== 'question') st.mode = 'paused';
      markHumanAction();
      await p.keyboard.press(key);
      log(`Đã bấm phím ${key}.`);
    } else if (route === '/api/scroll') {
      const p = await openBrowser();
      if (st.mode !== 'question') st.mode = 'paused';
      markHumanAction();
      await p.mouse.wheel(0, Number(data.direction) < 0 ? -500 : 500);
      log('Đã cuộn màn hình từ xa.');
    } else if (route === '/api/choose') {
      const letter = String(data.letter || '').trim().toUpperCase();
      if (!['A','B','C','D'].includes(letter)) throw new Error('Hãy chọn A, B, C hoặc D.');
      if (!st.intervention) throw new Error('Chỉ chọn trực tiếp khi có câu hỏi đang dừng.');
      await openBrowser();
      const q = await gatherPracticeQuestion();
      if (!q || !q.options[letter]) throw new Error('Không nhận dạng được nút đáp án. Hãy bấm trên ảnh HPU2 bên dưới.');
      if (!(await clickOption(q.frame, letter))) throw new Error('Nút không bấm được. Hãy chọn trực tiếp trên ảnh.');
      markHumanAction();
      st.quiz = { options:q.options, signature:q.signature, tried:[letter] };
      log(`Đã chọn đáp án ${letter} theo thao tác của bạn. Bấm Kiểm tra/Nộp trên ảnh nếu bài yêu cầu.`);
    } else if (route === '/api/config') {
      const total = Number(data.total), seconds = Number(data.seconds);
      if (!Number.isInteger(total) || total < 1 || total > 500) throw new Error('Tổng slide cần từ 1 đến 500.');
      if (!Number.isInteger(seconds) || seconds < 15 || seconds > 600) throw new Error('Thời gian mỗi slide cần từ 15 đến 600 giây.');
      cfg.total = total; cfg.seconds = seconds; cfg.autoPractice = data.autoPractice === true;
      st.total = total;
      log('Đã lưu cấu hình trong phiên đang chạy.');
    } else if (route === '/api/start') {
      await openBrowser();
      if (st.intervention) throw new Error('Đang chờ câu hỏi: hãy trả lời và nhấn Kiểm tra & tiếp tục trước.');
      if (!st.nextTarget) throw new Error('Bạn cần chọn nút sang slide trên ảnh từ xa trước khi bắt đầu.');
      if (st.current == null) await refreshProgress();
      st.mode = 'running';
      nextAt = Date.now() + cfg.seconds * 1000;
      log('Đang chạy trên máy chủ. Có thể đóng trình duyệt điện thoại; máy chủ vẫn cần hoạt động.');
    } else if (route === '/api/resume') {
      if (!st.intervention) throw new Error('Không có câu hỏi đang chờ. Bấm Bắt đầu để chạy.');
      const checked = await checkHumanCompletion({manual:true});
      if (!checked.ok) throw new Error(checked.message);
    } else if (route === '/api/force-resume') {
      if (!st.intervention) throw new Error('Không có câu hỏi đang chờ.');
      if (data.confirm !== true) throw new Error('Cần xác nhận bạn đã tự hoàn thành câu hỏi.');
      if (!st.intervention.actionAt) throw new Error('Chưa có thao tác trả lời từ xa.');
      leaveIntervention('Bạn xác nhận đã hoàn tất; tiếp tục chạy', false);
    } else if (route === '/api/pause') {
      st.mode = 'paused';
      log('Đã tạm dừng tự chuyển slide. Phiên HPU2 vẫn mở trên máy chủ.');
    } else if (route === '/api/refresh') {
      await openBrowser();
      await refreshProgress();
      log(st.current ? `Hiện ghi nhận slide ${st.current}/${cfg.total}${st.estimate?' (ước tính)':''}.` : 'Chưa đọc được số slide — xem ảnh để kiểm tra.');
    } else if (route === '/api/reset') {
      st.mode='paused';
      if (page) await page.close().catch(()=>{});
      if (context) await context.close().catch(()=>{});
      if (browser) await browser.close().catch(()=>{});
      page=null; context=null; browser=null;
      st.current=null; st.nextTarget=null; st.quiz=null; st.url=''; practice=null; st.intervention=null;
      log('Đã đóng phiên trình duyệt từ xa.');
    } else throw new Error('Lệnh không được hỗ trợ.');
    previewCacheAt = 0;
    send(res,200,{ok:true, status:publicState()});
  } catch (e) { send(res,400,{error:e.message.slice(0,260)}); }
  finally { busy=false; }
}
function publicState() {
  return {
    mode:st.mode, message:st.message, current:st.current, total:st.total,
    estimate:st.estimate, url:st.url, lastAction:st.lastAction,
    configuredNext:!!st.nextTarget, quiz:st.quiz, intervention:st.intervention, log:st.attempts,
    config:{...cfg}, nextIn:st.mode==='running'?Math.max(0,Math.ceil((nextAt-Date.now())/1000)):null,
    serverTime:now(), browserAlive:!!page&&!page.isClosed()
  };
}

const app = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/' && req.method === 'GET') {
      const html = await readFile(path.join(DIR,'public','index.html'));
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'", 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-cache', 'Referrer-Policy':'no-referrer'});
      return res.end(html);
    }
    if (url.pathname === '/healthz') return send(res,200,{ok:true});
    if (!url.pathname.startsWith('/api/')) return send(res,404,{error:'Không tìm thấy.'});
    if (req.method==='POST' && !preventForeignOrigin(req)) return send(res,403,{error:'Yêu cầu không hợp lệ.'});
    if (url.pathname === '/api/unlock' && req.method === 'POST') {
      const ip = req.socket.remoteAddress || 'unknown';
      const attempts = (authAttempts.get(ip)||[]).filter(t=>Date.now()-t<15*60*1000);
      if (attempts.length >= 8) return send(res,429,{error:'Nhập sai quá nhiều. Thử lại sau 15 phút.'});
      const { password } = await parseJson(req);
      const a = crypto.createHash('sha256').update(String(password||'')).digest();
      const b = crypto.createHash('sha256').update(APP_PASSWORD).digest();
      if (!crypto.timingSafeEqual(a,b)) {
        attempts.push(Date.now()); authAttempts.set(ip,attempts);
        return send(res,401,{error:'Mật khẩu quản lý không đúng.'});
      }
      authAttempts.delete(ip);
      const secure = process.env.NODE_ENV==='production' ? '; Secure' : '';
      return send(res,200,{ok:true},{'Set-Cookie':`${cookieName}=${cookieToken}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure}`});
    }
    if (!isAuthorized(req)) return send(res,401,{error:'Cần nhập mật khẩu quản lý.'});
    if (req.method === 'GET' && url.pathname === '/api/status') return send(res,200,publicState());
    if (req.method === 'GET' && url.pathname === '/api/screenshot') {
      if (!page || page.isClosed()) await openBrowser();
      if (!previewCache || Date.now()-previewCacheAt > 2000) {
        previewCache = await page.screenshot({ type:'jpeg', quality:68, timeout:10_000 });
        previewCacheAt=Date.now();
      }
      res.writeHead(200,{'Content-Type':'image/jpeg','Content-Length':previewCache.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      return res.end(previewCache);
    }
    if (req.method === 'POST') {
      const data = await parseJson(req);
      return await handleAction(req,res,url.pathname,data);
    }
    return send(res,405,{error:'Phương thức không hỗ trợ.'});
  } catch (error) {
    if (!res.headersSent) send(res,500,{error: error.message.slice(0,250)});
  }
});
app.listen(PORT,'0.0.0.0',()=>console.log(`Study dashboard on port ${PORT}`));
for (const sig of ['SIGTERM','SIGINT']) process.on(sig,async()=>{
  try { await browser?.close(); } catch {}
  process.exit(0);
});
