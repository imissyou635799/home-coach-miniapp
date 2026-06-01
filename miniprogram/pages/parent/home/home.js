const { request } = require("../../../utils/request");

Page({
  data: {
    home: {
      coach: null,
      courses: []
    }
  },
  onShow() {
    this.load();
  },
  load() {
    request("/api/parent/home")
      .then((home) => this.setData({ home }))
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  payConfirm(event) {
    const courseId = event.currentTarget.dataset.id;
    wx.redirectTo({ url: `/pages/parent/courses/courses?payCourseId=${courseId}` });
  }
});
