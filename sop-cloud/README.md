# SOP 追踪系统 · 云端存储版（MongoDB Atlas + Netlify）

本项目结构：

```
sop-cloud/
├─ public/
│  └─ index.html          ← 前端页面（原 sop.html，已改为从云端读写数据）
├─ netlify/
│  └─ functions/
│     └─ state.js         ← 云函数：读写 MongoDB Atlas
├─ netlify.toml           ← Netlify 配置（发布目录、函数目录、/api 转发规则）
├─ package.json           ← 声明了 mongodb 依赖
└─ .gitignore
```

工作原理：浏览器打开页面 → 调用 `/api/state`（会被转发到 Netlify Function）→
Function 用你的连接串连接 MongoDB Atlas，读出/写入一份 JSON 文档，
这份 JSON 和原来"导出 JSON"按钮导出的内容结构完全一样。

---

## 第一步：注册 MongoDB Atlas 并创建免费集群

1. 打开 https://www.mongodb.com/cloud/atlas/register 注册一个账号（可以用 Google 账号直接登录）。
2. 创建组织/项目后，点击 **Create a deployment**，选择 **M0 Free**（永久免费，512MB，够这个系统用很久）。
3. 选一个离新加坡近的区域（例如 AWS `ap-southeast-1` 新加坡），点 **Create**。
4. 会提示创建数据库用户：设置一个用户名和密码，**记下来**（后面要用）。
5. 在 **Network Access**（网络访问）里点 **Add IP Address**，选择 **Allow Access from Anywhere**（`0.0.0.0/0`）。
   - 因为 Netlify 云函数每次调用的出口 IP 都不固定，必须允许所有 IP，安全性由后面的"访问密钥"来保证。
6. 进入集群页面，点 **Connect** → **Drivers**，会给你一段连接串，形如：
   ```
   mongodb+srv://<用户名>:<密码>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   把 `<用户名>` `<密码>` 换成第4步设置的账号密码，**先存到记事本里**，一会儿要填到 Netlify。

## 第二步：把代码传到 GitHub（推荐方式）

1. 在 https://github.com 新建一个仓库（Repository），比如叫 `sop-tracker`。
2. 把我给你的这个 `sop-cloud` 文件夹解压后，上传/推送到这个仓库（可以直接在 GitHub 网页上 "Add file → Upload files" 把整个文件夹拖进去，不需要会用 git 命令）。

> 如果不想用 GitHub，也可以跳到第四步用"拖拽部署"，但那种方式以后改代码会比较麻烦，长期还是建议用 GitHub。

## 第三步：在 Netlify 创建站点

1. 打开 https://app.netlify.com/signup 注册（同样可以用 Google/GitHub 账号登录，免费版足够用）。
2. 点 **Add new site → Import an existing project**，选择 **GitHub**，授权后选择你刚才建的 `sop-tracker` 仓库。
3. Netlify 会自动识别到 `netlify.toml`，构建设置保持默认即可（不需要 Build command，Publish directory 会自动读取为 `public`）。
4. 先不要点 Deploy，点击 **Show advanced → New variable**，添加两个环境变量：
   | Key | Value |
   |---|---|
   | `MONGODB_URI` | 第一步拿到的完整连接串 |
   | `API_TOKEN` | 自己随便设一个复杂密码，例如 `aw2026-sop-9x7k` |
5. 点击 **Deploy site**，等 1-2 分钟构建完成。

## 第四步（不想用 GitHub 时的替代方案）：拖拽部署

1. 打开 https://app.netlify.com/drop
2. 直接把 `sop-cloud` 文件夹（含 `public`、`netlify` 两个子文件夹）拖进网页。
3. 部署完成后，进入该站点的 **Site configuration → Environment variables**，
   按上面表格添加 `MONGODB_URI` 和 `API_TOKEN`，然后点 **Deploys → Trigger deploy** 重新部署一次让变量生效。

## 第五步：打开网站，输入访问密钥

1. Netlify 会给你一个网址，形如 `https://random-name-123.netlify.app`，可以在 **Site configuration → Change site name** 里改成好记的名字。
2. 第一次打开时，浏览器会弹出一个输入框，要求输入"访问密钥"——填入你在 `API_TOKEN` 里设置的那个值。
3. 之后这个密钥会存在浏览器本地，不用每次都输入；换一台电脑/浏览器打开时需要再输入一次。
4. 把这个网址和密钥发给团队里需要用这个系统的人即可，大家看到的和保存的都是同一份 MongoDB 里的数据。

## 之后如何更新代码

- 用 GitHub 方式部署的：以后改了 `public/index.html` 或函数代码，直接推送到 GitHub 仓库，Netlify 会自动重新部署。
- 用拖拽部署的：改完后重新把文件夹拖到 https://app.netlify.com/drop 一次（会覆盖同一个站点，只要域名没变）。

## 排查问题

- 页面一直显示"正在连接云端数据库…"或报错：多半是 `MONGODB_URI` 填错，或 Atlas 的 Network Access 没设置成"Allow Access from Anywhere"。
- 提示"访问密钥不正确"：检查 Netlify 环境变量里的 `API_TOKEN` 和你输入的是否完全一致（注意有没有多余空格）。
- 想清空重来：直接在 MongoDB Atlas 里把 `sop_tracker` 数据库删掉，刷新页面会自动重新写入一份默认数据。
