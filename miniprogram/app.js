App({
  globalData: {
    token: "",
    role: "",
    user: null
  },
  onLaunch() {
    this.globalData.token = wx.getStorageSync("token") || "";
    this.globalData.role = wx.getStorageSync("role") || "";
    this.globalData.user = wx.getStorageSync("user") || null;
  }
});
