import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const port = Number(process.env.PORT || 3000);
const now = () => new Date().toISOString();
const db = { users: [], profiles: [], pets: [], trees: [], valueCards: [], wishes: [], matches: [], connections: [], messages: [], growthEvents: [] };

function seed() {
  const user = { id: 'user_demo', nickname: '体验用户', avatar: '', city: '上海', bio: '寻找有趣的互助连接', created_at: now(), updated_at: now() };
  db.users.push(user);
  db.profiles.push({ user_id: user.id, skills: ['AI产品策划'], resources: ['创业项目经验'], interests: ['AI', '社交产品'], needs: ['产品设计'], industries: ['互联网'], available_time: '工作日晚间', preferred_exchange_type: ['技能互换'], preferred_online_offline: ['线上'], city: '上海', ai_summary: '关注 AI 产品与创业的产品策划者', embedding: null, updated_at: now() });
  db.pets.push({ id: 'pet_demo', user_id: user.id, species: 'rabbit', name: '啾啾', level: 1, companion_value: 60, curiosity_value: 70, trust_value: 50, mood: 'happy', experience: 0, skin_id: null, created_at: now(), updated_at: now() });
  db.trees.push({ user_id: user.id, level: 1, growth_value: 0, fruit_count: 0, leaf_count: 0, updated_at: now() });
}
seed();

const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization' }); res.end(JSON.stringify(body)); };
const body = req => new Promise((resolve, reject) => { let raw = ''; req.on('data', c => { raw += c; if (raw.length > 1e6) reject(new Error('payload too large')); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid json')); } }); });
const getUser = id => db.users.find(u => u.id === id) || db.users[0];
const score = (wish, card) => { const a = new Set([...(wish.tags || []), ...(wish.structured_need?.skills || [])].map(x => String(x).toLowerCase())); const b = new Set([...(card.tags || []), card.title].map(x => String(x).toLowerCase())); const overlap = [...a].filter(x => [...b].some(y => y.includes(x) || x.includes(y))).length; return Math.min(0.99, 0.55 + overlap * 0.12 + (card.online_available && wish.online_available ? 0.1 : 0)); };

async function route(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host}`); const path = url.pathname; const parts = path.split('/').filter(Boolean);
  if (req.method === 'GET' && path === '/health') return json(res, 200, { status: 'ok', service: 'angel-bridge', timestamp: now() });
  if (req.method === 'GET' && path === '/ready') return json(res, 200, { status: 'ready' });
  try {
    if (req.method === 'POST' && path === '/api/users') { const b = await body(req); if (!b.nickname) return json(res, 400, { error: 'nickname is required' }); const u = { id: randomUUID(), nickname: b.nickname, avatar: b.avatar || '', city: b.city || '', bio: b.bio || '', created_at: now(), updated_at: now() }; db.users.push(u); db.profiles.push({ user_id: u.id, skills: [], resources: [], interests: [], needs: [], industries: [], available_time: '', preferred_exchange_type: [], preferred_online_offline: [], city: u.city, ai_summary: '', embedding: null, updated_at: now() }); db.pets.push({ id: randomUUID(), user_id: u.id, species: 'rabbit', name: '啾啾', level: 1, companion_value: 50, curiosity_value: 50, trust_value: 50, mood: 'happy', experience: 0, skin_id: null, created_at: now(), updated_at: now() }); db.trees.push({ user_id: u.id, level: 1, growth_value: 0, fruit_count: 0, leaf_count: 0, updated_at: now() }); return json(res, 201, u); }
    if (req.method === 'GET' && path === '/api/home') { const u = getUser(url.searchParams.get('user_id')); return json(res, 200, { user: u, pet: db.pets.find(p => p.user_id === u.id), today_stats: { connections: db.connections.filter(c => c.initiator_user_id === u.id || c.target_user_id === u.id).length, responses: db.messages.filter(m => m.sender_id !== u.id).length, angel_energy: 1000 }, tree: db.trees.find(t => t.user_id === u.id), recommendations: db.matches.filter(m => m.requester_id === u.id).slice(0, 5), pending_connections: db.connections.filter(c => c.target_user_id === u.id && c.status === 'pending') }); }
    if (req.method === 'POST' && path === '/api/ai/parse-wish') { const b = await body(req); if (!b.text?.trim()) return json(res, 400, { error: 'text is required' }); const tags = [...new Set((b.text.match(/[\u4e00-\u9fa5A-Za-z]{2,}/g) || []).slice(0, 6))]; return json(res, 200, { title: b.text.slice(0, 30), category: 'skill', tags, structured_need: { target: tags[0] || '互助伙伴', purpose: b.text, mode: '线上', priority: 'normal' }, suggested_exchange: ['AI产品经验交流'] }); }
    if (req.method === 'POST' && path === '/api/wishes') { const b = await body(req); if (!b.user_id || !b.raw_text) return json(res, 400, { error: 'user_id and raw_text are required' }); const w = { id: randomUUID(), user_id: b.user_id, title: b.title || b.raw_text.slice(0, 30), raw_text: b.raw_text, category: b.category || 'skill', need_type: b.need_type || 'help', structured_need: b.structured_need || {}, structured_need_json: b.structured_need || {}, tags: b.tags || [], location: b.location || '', online_available: b.online_available !== false, deadline: b.deadline || null, exchange_offer: b.exchange_offer || '', status: 'published', created_at: now(), updated_at: now() }; db.wishes.push(w); db.matches.push(...db.valueCards.filter(c => c.user_id !== w.user_id).map(c => ({ id: randomUUID(), wish_id: w.id, requester_id: w.user_id, target_type: 'value_card', target_id: c.id, score: score(w, c), semantic_score: score(w, c), skill_score: 0.7, location_score: 0.8, availability_score: 0.8, exchange_score: 0.6, ai_reason: `对方提供“${c.title}”，与这条心愿的方向互补。`, status: 'suggested', created_at: now() }))); return json(res, 201, w); }
    if (req.method === 'POST' && path === '/api/value-cards') { const b = await body(req); if (!b.user_id || !b.title) return json(res, 400, { error: 'user_id and title are required' }); const c = { id: randomUUID(), user_id: b.user_id, type: b.type || 'skill', title: b.title, description: b.description || '', tags: b.tags || [], category: b.category || '', location: b.location || '', online_available: b.online_available !== false, status: 'active', embedding: null, created_at: now(), updated_at: now() }; db.valueCards.push(c); return json(res, 201, c); }
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'wishes' && parts[3] === 'matches') return json(res, 200, { items: db.matches.filter(m => m.wish_id === parts[2]).sort((a, b) => b.score - a.score) });
    if (req.method === 'POST' && path === '/api/connections') { const b = await body(req); if (!b.initiator_user_id || !b.target_user_id) return json(res, 400, { error: 'initiator_user_id and target_user_id are required' }); const c = { id: randomUUID(), ...b, status: 'pending', created_at: now(), updated_at: now() }; db.connections.push(c); return json(res, 201, c); }
    if (req.method === 'GET' && path === '/api/connections') return json(res, 200, { items: db.connections });
    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'connections' && parts[3] === 'messages') return json(res, 200, { items: db.messages.filter(m => m.connection_id === parts[2]) });
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'connections' && parts[3] === 'messages') { const b = await body(req); if (!b.sender_id || !b.content) return json(res, 400, { error: 'sender_id and content are required' }); const m = { id: randomUUID(), connection_id: parts[2], sender_id: b.sender_id, content: b.content, message_type: b.message_type || 'text', created_at: now() }; db.messages.push(m); return json(res, 201, m); }
    if (req.method === 'GET' && path === '/api/feed') return json(res, 200, { items: db.wishes.filter(w => w.status === 'published').map(w => ({ ...w, user: getUser(w.user_id) })), page: 1, page_size: 20 });
    if (req.method === 'GET' && path === '/api/pet') return json(res, 200, db.pets.find(p => p.user_id === url.searchParams.get('user_id')) || db.pets[0]);
    if (req.method === 'GET' && path === '/api/growth-events') return json(res, 200, { items: db.growthEvents.filter(e => !url.searchParams.get('user_id') || e.user_id === url.searchParams.get('user_id')) });
    return json(res, 404, { error: 'not found' });
  } catch (e) { return json(res, 400, { error: e.message }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) http.createServer(route).listen(port, () => console.log(`Angel Bridge API listening on http://localhost:${port}`));
export { route, db };
