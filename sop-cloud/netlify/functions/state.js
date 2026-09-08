// netlify/functions/state.js
// 一个最简单的云端存储接口：
//   GET  /api/state  -> 返回数据库里保存的整份 state JSON（没有则返回 null）
//   POST /api/state  -> 用请求体里的 JSON 覆盖保存到数据库
//
// 数据库连接串通过 Netlify 环境变量 MONGODB_URI 提供，绝不写死在代码里。
// API_TOKEN 是一个简单的共享密钥，防止别人拿到你的网址后随意读写数据。

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'sop_tracker';
const COLLECTION = 'app_state';
const DOC_ID = 'singleton'; // 整个系统的数据只存成一份文档，和"导出JSON"功能思路一致
const API_TOKEN = process.env.API_TOKEN; // 可选，但强烈建议设置

let cachedClient = null;
async function getClient() {
  if (cachedClient) return cachedClient;
  if (!MONGODB_URI) throw new Error('缺少环境变量 MONGODB_URI');
  cachedClient = new MongoClient(MONGODB_URI, { maxPoolSize: 5 });
  await cachedClient.connect();
  return cachedClient;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // 简单的共享密钥校验
  if (API_TOKEN) {
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token !== API_TOKEN) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: '访问密钥不正确' }) };
    }
  }

  try {
    const client = await getClient();
    const col = client.db(DB_NAME).collection(COLLECTION);

    if (event.httpMethod === 'GET') {
      const doc = await col.findOne({ _id: DOC_ID });
      return { statusCode: 200, headers, body: JSON.stringify(doc ? doc.data : null) };
    }

    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      let data;
      try {
        data = JSON.parse(event.body || '{}');
      } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '请求体不是合法 JSON' }) };
      }
      await col.updateOne(
        { _id: DOC_ID },
        { $set: { data, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || '服务器错误' }) };
  }
};
