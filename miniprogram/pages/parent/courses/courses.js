const { request } = require("../../../utils/request");

Page({
  data: {
    packages: [],
    firstPackage: {},
    payCourseId: "",
    payAmount: ""
  },
  onLoad(query) {
    this.setData({ payCourseId: query.payCourseId || "" });
  },
  onShow() {
    this.load();
  },
  load() {
    request("/api/parent/courses")
      .then((data) => {
        const packages = data.packages.map((item) => ({
          ...item,
          percent: item.totalLessons ? Math.round((item.usedLessons / item.totalLessons) * 100) : 0
        }));
        this.setData({ packages, firstPackage: packages[0] || {} });
      })
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  setPayAmount(event) {
    this.setData({ payAmount: event.detail.value });
  },
  submitPayment() {
    const first = this.data.firstPackage;
    if (!first.student) {
      wx.showToast({ title: "请先让教练添加学员", icon: "none" });
      return;
    }
    request("/api/payment-requests", {
      method: "POST",
      data: {
        courseId: this.data.payCourseId || first.courseId,
        studentId: first.student.id,
        amount: this.data.payAmount || first.course.price
      }
    })
      .then(() => wx.showToast({ title: "已提交" }))
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  }
});
