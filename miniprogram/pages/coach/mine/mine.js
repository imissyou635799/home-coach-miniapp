const { request } = require("../../../utils/request");

Page({
  data: {
    profile: {}
  },
  onShow() {
    this.load();
  },
  load() {
    request("/api/coach/profile")
      .then((profile) => this.setData({ profile }))
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  setName(event) {
    this.setData({ "profile.name": event.detail.value });
  },
  setArea(event) {
    this.setData({ "profile.serviceArea": event.detail.value });
  },
  setYears(event) {
    this.setData({ "profile.years": event.detail.value });
  },
  setIntro(event) {
    this.setData({ "profile.intro": event.detail.value });
  },
  save() {
    request("/api/coach/profile", { method: "PUT", data: this.data.profile })
      .then(() => wx.showToast({ title: "已保存" }))
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  buyMember() {
    request("/api/membership/orders", { method: "POST" })
      .then((data) => {
        this.setData({ profile: data.coach });
        wx.showToast({ title: "会员已开通" });
      })
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  switchRole() {
    wx.redirectTo({ url: "/pages/role/role" });
  }
});
