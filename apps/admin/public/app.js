const API_BASE = localStorage.getItem("apiBase") || "http://localhost:3100";
let token = localStorage.getItem("adminToken") || "";
let currentView = "dashboard";

const notice = document.querySelector("#notice");
const content = document.querySelector("#content");
const title = document.querySelector("#pageTitle");

function setNotice(text, type = "info") {
  notice.textContent = text;
  notice.style.display = text ? "block" : "none";
  notice.className = `notice ${type}`;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...(options.headers || {})
    }
  });
  const payload = await res.json();
  if (!res.ok || payload.code !== 0) {
    throw new Error(payload.message || "请求失败");
  }
  return payload.data;
}

function money(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function table(headers, rows) {
  return `
    <div class="panel">
      <table>
        <thead><tr>${headers.map((item) => `<th>${item}</th>`).join("")}</tr></thead>
        <tbody>${rows.join("") || `<tr><td colspan="${headers.length}">暂无数据</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

async function renderDashboard() {
  title.textContent = "首页数据";
  const stats = await api("/api/admin/stats");
  content.innerHTML = `
    <div class="cards">
      <div class="card">教练总数<strong>${stats.coaches}</strong></div>
      <div class="card">家长总数<strong>${stats.parents}</strong></div>
      <div class="card">学员总数<strong>${stats.students}</strong></div>
      <div class="card">会员收入<strong>${money(stats.ordersAmount)}</strong></div>
    </div>
    <div class="panel">
      <h2>待办提醒</h2>
      <p>待实名审核：${stats.pendingRealname} 个</p>
    </div>
  `;
}

async function renderCoaches() {
  title.textContent = "教练管理";
  const rows = await api("/api/admin/coaches");
  content.innerHTML = table(
    ["姓名", "手机号", "实名", "会员", "到期日", "服务区域"],
    rows.map((item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.phone}</td>
        <td><span class="tag">${item.realnameStatus}</span></td>
        <td>${item.memberStatus}</td>
        <td>${item.memberExpireAt || "-"}</td>
        <td>${item.serviceArea || "-"}</td>
      </tr>
    `)
  );
}

async function renderParents() {
  title.textContent = "家长管理";
  const rows = await api("/api/admin/parents");
  content.innerHTML = table(
    ["昵称", "手机号", "绑定教练数", "注册时间"],
    rows.map((item) => `
      <tr>
        <td>${item.nickname}</td>
        <td>${item.phone}</td>
        <td>${item.bindings.length}</td>
        <td>${item.createdAt}</td>
      </tr>
    `)
  );
}

async function renderStudents() {
  title.textContent = "学员管理";
  const rows = await api("/api/admin/students");
  content.innerHTML = table(
    ["姓名", "性别", "学校", "年级", "训练目标"],
    rows.map((item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.gender || "-"}</td>
        <td>${item.school || "-"}</td>
        <td>${item.grade || "-"}</td>
        <td>${item.goal || "-"}</td>
      </tr>
    `)
  );
}

async function renderOrders() {
  title.textContent = "会员订单";
  const rows = await api("/api/admin/orders");
  content.innerHTML = table(
    ["订单号", "教练", "金额", "状态", "支付时间"],
    rows.map((item) => `
      <tr>
        <td>${item.id}</td>
        <td>${item.coach?.name || "-"}</td>
        <td>${money(item.amount)}</td>
        <td>${item.status}</td>
        <td>${item.paidAt || "-"}</td>
      </tr>
    `)
  );
}

async function renderBanners() {
  title.textContent = "轮播图";
  const rows = await api("/api/admin/banners");
  content.innerHTML = `
    <div class="panel">
      <h2>新增轮播图</h2>
      <div class="form-row">
        <input id="bannerTitle" placeholder="标题">
        <input id="bannerSubtitle" placeholder="简介">
        <input id="bannerButton" placeholder="按钮文案" value="查看">
        <select id="bannerFor">
          <option value="coach">教练端</option>
          <option value="parent">家长端</option>
          <option value="all">全部</option>
        </select>
        <button id="addBanner">保存</button>
      </div>
    </div>
    ${table(
      ["标题", "简介", "展示端", "状态", "排序"],
      rows.map((item) => `
        <tr>
          <td>${item.title}</td>
          <td>${item.subtitle}</td>
          <td>${item.visibleFor}</td>
          <td>${item.status}</td>
          <td>${item.sort}</td>
        </tr>
      `)
    )}
  `;
  document.querySelector("#addBanner").addEventListener("click", async () => {
    await api("/api/admin/banners", {
      method: "POST",
      body: JSON.stringify({
        title: document.querySelector("#bannerTitle").value,
        subtitle: document.querySelector("#bannerSubtitle").value,
        buttonText: document.querySelector("#bannerButton").value,
        visibleFor: document.querySelector("#bannerFor").value
      })
    });
    setNotice("轮播图已保存");
    renderBanners();
  });
}

const renderers = {
  dashboard: renderDashboard,
  coaches: renderCoaches,
  parents: renderParents,
  students: renderStudents,
  orders: renderOrders,
  banners: renderBanners
};

async function render() {
  try {
    if (!token) {
      setNotice("请先登录后台账号。");
      content.innerHTML = "";
      return;
    }
    setNotice("");
    await renderers[currentView]();
  } catch (error) {
    setNotice(error.message, "error");
  }
}

document.querySelector("#loginBtn").addEventListener("click", async () => {
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        role: "admin",
        username: document.querySelector("#username").value,
        password: document.querySelector("#password").value
      })
    });
    token = data.token;
    localStorage.setItem("adminToken", token);
    setNotice("登录成功");
    render();
  } catch (error) {
    setNotice(error.message, "error");
  }
});

document.querySelectorAll(".nav").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    currentView = button.dataset.view;
    render();
  });
});

render();
