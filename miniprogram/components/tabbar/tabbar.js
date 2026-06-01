Component({
  properties: {
    active: String,
    role: String
  },
  data: {
    items: []
  },
  lifetimes: {
    attached() {
      this.refresh();
    }
  },
  observers: {
    role() {
      this.refresh();
    }
  },
  methods: {
    refresh() {
      const role = this.properties.role;
      const prefix = role === "parent" ? "/pages/parent" : "/pages/coach";
      this.setData({
        items: [
          { key: "home", text: "首页", icon: "🏠", page: `${prefix}/home/home` },
          { key: "courses", text: "课程", icon: "📚", page: `${prefix}/courses/courses` },
          { key: "mine", text: "我的", icon: "⚙", page: `${prefix}/mine/mine` }
        ]
      });
    },
    go(event) {
      wx.redirectTo({ url: event.currentTarget.dataset.page });
    }
  }
});
