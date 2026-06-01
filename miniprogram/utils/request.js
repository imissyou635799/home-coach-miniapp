const { API_BASE_URL } = require("./config");

function request(path, options = {}) {
  const token = wx.getStorageSync("token") || "";
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${path}`,
      method: options.method || "GET",
      data: options.data || {},
      header: {
        "content-type": "application/json",
        Authorization: token ? `Bearer ${token}` : ""
      },
      success(res) {
        const payload = res.data || {};
        if (res.statusCode >= 200 && res.statusCode < 300 && payload.code === 0) {
          resolve(payload.data);
        } else {
          reject(new Error(payload.message || "请求失败"));
        }
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

function login(role) {
  const isCoach = role === "coach";
  return request("/api/auth/login", {
    method: "POST",
    data: {
      role,
      phone: isCoach ? "13800000001" : "13800000002",
      nickname: isCoach ? "张教练" : "李明轩妈妈"
    }
  }).then((data) => {
    wx.setStorageSync("token", data.token);
    wx.setStorageSync("role", role);
    wx.setStorageSync("user", data.user);
    return data;
  });
}

module.exports = {
  request,
  login
};
