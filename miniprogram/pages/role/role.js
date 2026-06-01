const { login } = require("../../utils/request");

Page({
  choose(event) {
    const role = event.currentTarget.dataset.role;
    wx.showLoading({ title: "进入中" });
    login(role)
      .then(() => {
        wx.hideLoading();
        wx.redirectTo({ url: role === "coach" ? "/pages/coach/home/home" : "/pages/parent/home/home" });
      })
      .catch((error) => {
        wx.hideLoading();
        wx.showToast({ title: error.message, icon: "none" });
      });
  }
});
