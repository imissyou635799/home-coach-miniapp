const { request } = require("../../../utils/request");

Page({
  data: {
    courses: [],
    students: [],
    payments: [],
    packages: [],
    selectedPackage: {},
    lessonContent: "",
    courseForm: {
      name: "",
      price: "",
      lessonCount: ""
    }
  },
  onShow() {
    this.load();
  },
  load() {
    Promise.all([
      request("/api/coach/courses"),
      request("/api/coach/students"),
      request("/api/coach/payment-requests"),
      request("/api/coach/packages")
    ])
      .then(([courses, students, payments, packages]) => {
        this.setData({ courses, students, payments, packages });
      })
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  setCourseName(event) {
    this.setData({ "courseForm.name": event.detail.value });
  },
  setCoursePrice(event) {
    this.setData({ "courseForm.price": event.detail.value });
  },
  setCourseCount(event) {
    this.setData({ "courseForm.lessonCount": event.detail.value });
  },
  createCourse() {
    request("/api/coach/courses", {
      method: "POST",
      data: { ...this.data.courseForm, status: "on" }
    })
      .then(() => {
        wx.showToast({ title: "已新增" });
        this.setData({ courseForm: { name: "", price: "", lessonCount: "" } });
        this.load();
      })
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  toggleCourse(event) {
    const id = event.currentTarget.dataset.id;
    const status = event.currentTarget.dataset.status === "on" ? "off" : "on";
    request(`/api/coach/courses/${id}/status`, { method: "PATCH", data: { status } })
      .then(() => this.load())
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  confirmPay(event) {
    request(`/api/payment-requests/${event.currentTarget.dataset.id}/confirm`, { method: "POST" })
      .then(() => {
        wx.showToast({ title: "已开课包" });
        this.load();
      })
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  },
  pickPackage(event) {
    this.setData({ selectedPackage: this.data.packages[event.detail.value] });
  },
  setLessonContent(event) {
    this.setData({ lessonContent: event.detail.value });
  },
  recordLesson() {
    if (!this.data.selectedPackage.id) {
      wx.showToast({ title: "请选择课包", icon: "none" });
      return;
    }
    request("/api/coach/lessons", {
      method: "POST",
      data: {
        packageId: this.data.selectedPackage.id,
        startTime: "09:00",
        endTime: "10:00",
        content: this.data.lessonContent || "体能基础训练",
        cost: 1
      }
    })
      .then(() => {
        wx.showToast({ title: "已记录" });
        this.setData({ lessonContent: "", selectedPackage: {} });
        this.load();
      })
      .catch((error) => wx.showToast({ title: error.message, icon: "none" }));
  }
});
