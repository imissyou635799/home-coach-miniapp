const { request } = require("../../../utils/request");

Page({
  data: {
    dashboard: {
      coach: {},
      banners: [],
      todayLessons: []
    },
    actions: [
      { text: "个人资料", icon: "👤" },
      { text: "邀请家长", icon: "💌" },
      { text: "添加学员", icon: "＋" },
      { text: "记录课程", icon: "🗓" },
      { text: "课程管理", icon: "📚" },
      { text: "训练反馈", icon: "📝" },
      { text: "数据统计", icon: "📊" },
      { text: "收款码", icon: "💰" }
    ]
  },
  onShow() {
    this.load();
  },
  load() {
    request("/api/coach/dashboard")
      .then((dashboard) => this.setData({ dashboard }))
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  quickTap(event) {
    const action = event.currentTarget.dataset.action;
    if (["课程管理", "添加学员", "记录课程", "训练反馈", "数据统计"].includes(action)) {
      wx.redirectTo({ url: "/pages/coach/courses/courses" });
      return;
    }
    wx.redirectTo({ url: "/pages/coach/mine/mine" });
  }
});
