import { URL } from "node:url";
import { addMonths, fail, id, nowISO, ok, parseBody, readToken, toNumber, today } from "./utils.js";
import { store } from "./store.js";

function publicUser(user) {
  if (!user) return null;
  const { id: userId, phone, nickname, avatar, roles, defaultRole, status } = user;
  return { id: userId, phone, nickname, avatar, roles, defaultRole, status };
}

function context(req, requiredRole = "") {
  const data = store.load();
  const token = readToken(req);
  const session = store.getSession(token);
  if (!session) throw fail("请先登录", 401);
  if (requiredRole && session.role !== requiredRole) throw fail("没有权限", 403);
  const user = data.users.find((item) => item.id === session.userId);
  if (!user) throw fail("用户不存在", 401);
  const coach = data.coaches.find((item) => item.userId === user.id);
  const parent = data.parents.find((item) => item.userId === user.id);
  return { data, session, user, coach, parent };
}

function requireCoach(req) {
  const ctx = context(req, "coach");
  if (!ctx.coach) throw fail("教练资料不存在", 404);
  return ctx;
}

function requireParent(req) {
  const ctx = context(req, "parent");
  if (!ctx.parent) throw fail("家长资料不存在", 404);
  return ctx;
}

function joinStudent(data, studentId) {
  return data.students.find((item) => item.id === studentId);
}

function joinCourse(data, courseId) {
  return data.courses.find((item) => item.id === courseId);
}

function packageView(data, pkg) {
  return {
    ...pkg,
    student: joinStudent(data, pkg.studentId),
    course: joinCourse(data, pkg.courseId),
    coach: data.coaches.find((item) => item.id === pkg.coachId)
  };
}

function trainingSummary(data, studentId) {
  const rows = data.trainingData.filter((item) => item.studentId === studentId);
  const latestByItem = new Map();
  for (const row of rows) {
    latestByItem.set(row.item, row);
  }
  return [...latestByItem.values()].map((row) => {
    const same = rows.filter((item) => item.item === row.item).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const first = same[0];
    let change = "";
    if (first && first.id !== row.id) {
      const diff = row.value - first.value;
      if (row.direction === "down") change = diff <= 0 ? `提升 ${Math.abs(diff)} 秒` : `慢了 ${diff} 秒`;
      if (row.direction === "up") change = diff >= 0 ? `增加 ${diff}${row.unit}` : `减少 ${Math.abs(diff)}${row.unit}`;
    }
    return { ...row, change };
  });
}

export async function route(req) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  const method = req.method;
  const data = store.load();

  if (method === "GET" && path === "/api/health") {
    return ok({ status: "running", date: today() });
  }

  if (method === "POST" && path === "/api/auth/login") {
    const body = await parseBody(req);
    const role = body.role || "coach";
    if (role === "admin") {
      const admin = data.admins.find((item) => item.username === body.username && item.password === body.password);
      if (!admin) throw fail("后台账号或密码错误", 401);
      let adminUser = data.users.find((item) => item.id === admin.id);
      if (!adminUser) {
        adminUser = {
          id: admin.id,
          phone: "",
          nickname: admin.name,
          avatar: "",
          roles: ["admin"],
          defaultRole: "admin",
          status: "active",
          createdAt: nowISO()
        };
        data.users.push(adminUser);
      }
      const token = store.createSession(adminUser.id, "admin");
      return ok({ token, user: publicUser(adminUser), admin });
    }

    const phone = body.phone;
    if (!phone) throw fail("手机号不能为空");
    let user = data.users.find((item) => item.phone === phone);
    if (!user) {
      user = {
        id: id("usr"),
        phone,
        nickname: body.nickname || phone,
        avatar: "",
        roles: [role],
        defaultRole: role,
        status: "active",
        createdAt: nowISO()
      };
      data.users.push(user);
    }
    if (!user.roles.includes(role)) user.roles.push(role);
    user.defaultRole = role;
    if (role === "coach" && !data.coaches.some((item) => item.userId === user.id)) {
      data.coaches.push({
        id: id("coach"),
        userId: user.id,
        name: body.nickname || "新教练",
        phone,
        city: "",
        serviceArea: "",
        years: 0,
        specialties: [],
        intro: "",
        realnameStatus: "pending",
        realnameReason: "",
        memberStatus: "inactive",
        memberExpireAt: "",
        paymentQr: "",
        status: "active",
        createdAt: nowISO()
      });
    }
    if (role === "parent" && !data.parents.some((item) => item.userId === user.id)) {
      data.parents.push({ id: id("parent"), userId: user.id, phone, nickname: body.nickname || "家长", createdAt: nowISO() });
    }
    const token = store.createSession(user.id, role);
    store.save();
    return ok({ token, user: publicUser(user), role });
  }

  if (method === "GET" && path === "/api/coach/dashboard") {
    const { coach } = requireCoach(req);
    const banners = data.banners.filter((item) => item.status === "on" && ["coach", "all"].includes(item.visibleFor)).sort((a, b) => a.sort - b.sort);
    const packages = data.packages.filter((item) => item.coachId === coach.id);
    const todayLessons = data.lessonRecords
      .filter((item) => item.coachId === coach.id && item.lessonDate === today())
      .map((item) => ({ ...item, student: joinStudent(data, item.studentId), package: data.packages.find((pkg) => pkg.id === item.packageId) }));
    return ok({
      coach,
      banners,
      quickActions: ["个人资料", "邀请家长", "添加学员", "记录课程", "课程管理", "训练反馈", "数据统计", "收款码"],
      todayLessons,
      stats: {
        students: data.students.filter((item) => item.coachId === coach.id).length,
        parents: data.bindings.filter((item) => item.coachId === coach.id && item.status === "bound").length,
        activePackages: packages.filter((item) => item.status === "active").length,
        pendingPayments: data.paymentRequests.filter((item) => item.coachId === coach.id && item.status === "pending").length
      }
    });
  }

  if (method === "GET" && path === "/api/coach/profile") {
    const { coach } = requireCoach(req);
    return ok(coach);
  }

  if (method === "PUT" && path === "/api/coach/profile") {
    const { coach } = requireCoach(req);
    const body = await parseBody(req);
    Object.assign(coach, {
      name: body.name ?? coach.name,
      city: body.city ?? coach.city,
      serviceArea: body.serviceArea ?? coach.serviceArea,
      years: toNumber(body.years, coach.years),
      specialties: Array.isArray(body.specialties) ? body.specialties : coach.specialties,
      intro: body.intro ?? coach.intro,
      paymentQr: body.paymentQr ?? coach.paymentQr
    });
    store.save();
    return ok(coach, "资料已保存");
  }

  if (method === "GET" && path === "/api/coach/courses") {
    const { coach } = requireCoach(req);
    return ok(data.courses.filter((item) => item.coachId === coach.id));
  }

  if (method === "POST" && path === "/api/coach/courses") {
    const { coach } = requireCoach(req);
    const body = await parseBody(req);
    if (!body.name) throw fail("课程名称不能为空");
    const course = {
      id: id("course"),
      coachId: coach.id,
      name: body.name,
      price: toNumber(body.price),
      lessonCount: toNumber(body.lessonCount, 12),
      durationMinutes: toNumber(body.durationMinutes, 60),
      target: body.target || "",
      goal: body.goal || "",
      intro: body.intro || "",
      cover: body.cover || "",
      video: body.video || "",
      paymentQr: body.paymentQr || "",
      status: body.status || "draft",
      createdAt: nowISO()
    };
    data.courses.push(course);
    store.save();
    return ok(course, "课程已创建");
  }

  const courseStatusMatch = path.match(/^\/api\/coach\/courses\/([^/]+)\/status$/);
  if (method === "PATCH" && courseStatusMatch) {
    const { coach } = requireCoach(req);
    const body = await parseBody(req);
    const course = data.courses.find((item) => item.id === courseStatusMatch[1] && item.coachId === coach.id);
    if (!course) throw fail("课程不存在", 404);
    course.status = body.status || course.status;
    store.save();
    return ok(course, "课程状态已更新");
  }

  if (method === "GET" && path === "/api/coach/invitations") {
    const { coach } = requireCoach(req);
    return ok(data.bindings.filter((item) => item.coachId === coach.id).map((item) => ({
      ...item,
      parent: data.parents.find((parent) => parent.id === item.parentId)
    })));
  }

  if (method === "POST" && path === "/api/coach/invitations") {
    const { coach } = requireCoach(req);
    const invite = {
      id: id("bind"),
      coachId: coach.id,
      parentId: "",
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      status: "invited",
      invitedAt: nowISO(),
      boundAt: ""
    };
    data.bindings.push(invite);
    store.save();
    return ok(invite, "邀请已生成");
  }

  if (method === "GET" && path === "/api/coach/students") {
    const { coach } = requireCoach(req);
    return ok(data.students.filter((item) => item.coachId === coach.id).map((student) => ({
      ...student,
      packages: data.packages.filter((pkg) => pkg.studentId === student.id)
    })));
  }

  if (method === "POST" && path === "/api/coach/students") {
    const { coach } = requireCoach(req);
    const body = await parseBody(req);
    if (!body.name) throw fail("学员姓名不能为空");
    const parentId = body.parentId || data.bindings.find((item) => item.coachId === coach.id && item.status === "bound")?.parentId;
    if (!parentId) throw fail("请先绑定家长");
    const student = {
      id: id("student"),
      coachId: coach.id,
      parentId,
      name: body.name,
      gender: body.gender || "",
      birthday: body.birthday || "",
      height: toNumber(body.height),
      weight: toNumber(body.weight),
      school: body.school || "",
      grade: body.grade || "",
      weakItems: Array.isArray(body.weakItems) ? body.weakItems : [],
      goal: body.goal || "",
      tags: Array.isArray(body.tags) ? body.tags : [],
      createdAt: nowISO()
    };
    data.students.push(student);
    store.save();
    return ok(student, "学员已添加");
  }

  if (method === "GET" && path === "/api/coach/payment-requests") {
    const { coach } = requireCoach(req);
    return ok(data.paymentRequests.filter((item) => item.coachId === coach.id).map((item) => ({
      ...item,
      parent: data.parents.find((parent) => parent.id === item.parentId),
      student: joinStudent(data, item.studentId),
      course: joinCourse(data, item.courseId)
    })));
  }

  const confirmMatch = path.match(/^\/api\/payment-requests\/([^/]+)\/confirm$/);
  if (method === "POST" && confirmMatch) {
    const { coach } = requireCoach(req);
    const request = data.paymentRequests.find((item) => item.id === confirmMatch[1] && item.coachId === coach.id);
    if (!request) throw fail("付款申请不存在", 404);
    const course = joinCourse(data, request.courseId);
    if (!course) throw fail("课程不存在", 404);
    request.status = "confirmed";
    request.handledAt = nowISO();
    const pkg = {
      id: id("pkg"),
      courseId: course.id,
      coachId: coach.id,
      parentId: request.parentId,
      studentId: request.studentId,
      name: course.name,
      totalLessons: course.lessonCount,
      usedLessons: 0,
      remainingLessons: course.lessonCount,
      startedAt: today(),
      expiredAt: "",
      status: "active",
      createdAt: nowISO()
    };
    data.packages.push(pkg);
    store.addMessage({
      receiverRole: "parent",
      receiverId: request.parentId,
      title: "课包已开通",
      content: `${course.name} 已开通，共 ${course.lessonCount} 次课。`,
      type: "package"
    });
    store.save();
    return ok(pkg, "已确认并开通课包");
  }

  const rejectMatch = path.match(/^\/api\/payment-requests\/([^/]+)\/reject$/);
  if (method === "POST" && rejectMatch) {
    const { coach } = requireCoach(req);
    const body = await parseBody(req);
    const request = data.paymentRequests.find((item) => item.id === rejectMatch[1] && item.coachId === coach.id);
    if (!request) throw fail("付款申请不存在", 404);
    request.status = "rejected";
    request.rejectReason = body.reason || "教练未确认到账";
    request.handledAt = nowISO();
    store.addMessage({
      receiverRole: "parent",
      receiverId: request.parentId,
      title: "付款未确认",
      content: request.rejectReason,
      type: "payment"
    });
    store.save();
    return ok(request, "已驳回");
  }

  if (method === "GET" && path === "/api/coach/packages") {
    const { coach } = requireCoach(req);
    return ok(data.packages.filter((item) => item.coachId === coach.id).map((pkg) => packageView(data, pkg)));
  }

  if (method === "GET" && path === "/api/coach/lessons") {
    const { coach } = requireCoach(req);
    return ok(data.lessonRecords.filter((item) => item.coachId === coach.id).map((item) => ({
      ...item,
      student: joinStudent(data, item.studentId),
      package: data.packages.find((pkg) => pkg.id === item.packageId)
    })));
  }

  if (method === "POST" && path === "/api/coach/lessons") {
    const { coach } = requireCoach(req);
    const body = await parseBody(req);
    const pkg = data.packages.find((item) => item.id === body.packageId && item.coachId === coach.id);
    if (!pkg) throw fail("课包不存在", 404);
    const cost = toNumber(body.cost, 1);
    if (pkg.remainingLessons < cost) throw fail("课包剩余次数不足");
    pkg.usedLessons += cost;
    pkg.remainingLessons -= cost;
    if (pkg.remainingLessons <= 0) pkg.status = "finished";
    const lesson = {
      id: id("lesson"),
      packageId: pkg.id,
      studentId: pkg.studentId,
      coachId: coach.id,
      parentId: pkg.parentId,
      lessonDate: body.lessonDate || today(),
      startTime: body.startTime || "",
      endTime: body.endTime || "",
      content: body.content || "",
      cost,
      remainingAfter: pkg.remainingLessons,
      status: "published",
      createdAt: nowISO()
    };
    data.lessonRecords.push(lesson);
    store.addMessage({
      receiverRole: "parent",
      receiverId: pkg.parentId,
      title: "已记录课程",
      content: `本次消耗 ${cost} 次，剩余 ${pkg.remainingLessons} 次。`,
      type: "lesson"
    });
    store.save();
    return ok(lesson, "课程已记录");
  }

  if (method === "POST" && path === "/api/coach/feedback") {
    const { coach } = requireCoach(req);
    const body = await parseBody(req);
    const lesson = data.lessonRecords.find((item) => item.id === body.lessonId && item.coachId === coach.id);
    if (!lesson) throw fail("课程记录不存在", 404);
    const feedback = {
      id: id("fb"),
      lessonId: lesson.id,
      coachId: coach.id,
      parentId: lesson.parentId,
      studentId: lesson.studentId,
      content: body.content || "",
      weakness: body.weakness || "",
      nextPlan: body.nextPlan || "",
      images: Array.isArray(body.images) ? body.images : [],
      videos: Array.isArray(body.videos) ? body.videos : [],
      status: "published",
      createdAt: nowISO()
    };
    data.feedback.push(feedback);
    for (const row of Array.isArray(body.trainingData) ? body.trainingData : []) {
      data.trainingData.push({
        id: id("td"),
        studentId: lesson.studentId,
        lessonId: lesson.id,
        item: row.item,
        value: toNumber(row.value),
        displayValue: row.displayValue || String(row.value),
        unit: row.unit || "",
        direction: row.direction || "up",
        recordedAt: lesson.lessonDate
      });
    }
    store.addMessage({
      receiverRole: "parent",
      receiverId: lesson.parentId,
      title: "训练反馈已更新",
      content: feedback.content.slice(0, 50),
      type: "feedback"
    });
    store.save();
    return ok(feedback, "反馈已发布");
  }

  if (method === "GET" && path === "/api/coach/stats") {
    const { coach } = requireCoach(req);
    return ok({
      students: data.students.filter((item) => item.coachId === coach.id).length,
      packages: data.packages.filter((item) => item.coachId === coach.id).length,
      lessons: data.lessonRecords.filter((item) => item.coachId === coach.id).length,
      feedback: data.feedback.filter((item) => item.coachId === coach.id).length
    });
  }

  if (method === "GET" && path === "/api/parent/home") {
    const { parent } = requireParent(req);
    const bindings = data.bindings.filter((item) => item.parentId === parent.id && item.status === "bound");
    const currentCoachId = url.searchParams.get("coachId") || bindings[0]?.coachId;
    const coach = data.coaches.find((item) => item.id === currentCoachId);
    const courses = coach ? data.courses.filter((item) => item.coachId === coach.id && item.status === "on") : [];
    return ok({ parent, bindings, coach, courses });
  }

  if (method === "GET" && path === "/api/parent/courses") {
    const { parent } = requireParent(req);
    const packages = data.packages.filter((item) => item.parentId === parent.id).map((pkg) => ({
      ...packageView(data, pkg),
      lessons: data.lessonRecords.filter((lesson) => lesson.packageId === pkg.id),
      summary: trainingSummary(data, pkg.studentId)
    }));
    return ok({ packages });
  }

  if (method === "POST" && path === "/api/payment-requests") {
    const { parent } = requireParent(req);
    const body = await parseBody(req);
    const course = joinCourse(data, body.courseId);
    if (!course) throw fail("课程不存在", 404);
    const student = data.students.find((item) => item.id === body.studentId && item.parentId === parent.id);
    if (!student) throw fail("学员不存在", 404);
    const request = {
      id: id("payreq"),
      coachId: course.coachId,
      parentId: parent.id,
      studentId: student.id,
      courseId: course.id,
      amount: toNumber(body.amount, course.price),
      screenshot: body.screenshot || "",
      note: body.note || "",
      status: "pending",
      rejectReason: "",
      createdAt: nowISO()
    };
    data.paymentRequests.push(request);
    store.addMessage({
      receiverRole: "coach",
      receiverId: course.coachId,
      title: "家长已付款待核实",
      content: `${parent.nickname} 提交了 ${course.name} 的付款确认。`,
      type: "payment"
    });
    store.save();
    return ok(request, "已提交，等待教练核实");
  }

  if (method === "GET" && path === "/api/parent/messages") {
    const { parent } = requireParent(req);
    return ok(data.messages.filter((item) => item.receiverRole === "parent" && item.receiverId === parent.id));
  }

  if (method === "POST" && path === "/api/membership/orders") {
    const { coach } = requireCoach(req);
    const amount = 99;
    const order = {
      id: id("order"),
      coachId: coach.id,
      amount,
      status: "paid",
      paidAt: nowISO(),
      months: 1,
      createdAt: nowISO()
    };
    coach.memberExpireAt = addMonths(coach.memberExpireAt, 1);
    coach.memberStatus = "active";
    data.memberOrders.push(order);
    store.save();
    return ok({ order, coach }, "会员已开通");
  }

  if (method === "GET" && path === "/api/admin/stats") {
    context(req, "admin");
    return ok({
      coaches: data.coaches.length,
      parents: data.parents.length,
      students: data.students.length,
      paidCoaches: data.coaches.filter((item) => item.memberStatus === "active").length,
      ordersAmount: data.memberOrders.reduce((sum, item) => sum + item.amount, 0),
      pendingRealname: data.coaches.filter((item) => item.realnameStatus === "pending").length
    });
  }

  if (method === "GET" && path === "/api/admin/coaches") {
    context(req, "admin");
    return ok(data.coaches);
  }

  if (method === "GET" && path === "/api/admin/parents") {
    context(req, "admin");
    return ok(data.parents.map((parent) => ({
      ...parent,
      bindings: data.bindings.filter((item) => item.parentId === parent.id)
    })));
  }

  if (method === "GET" && path === "/api/admin/students") {
    context(req, "admin");
    return ok(data.students);
  }

  if (method === "GET" && path === "/api/admin/orders") {
    context(req, "admin");
    return ok(data.memberOrders.map((order) => ({
      ...order,
      coach: data.coaches.find((coach) => coach.id === order.coachId)
    })));
  }

  if (method === "GET" && path === "/api/admin/banners") {
    context(req, "admin");
    return ok(data.banners);
  }

  if (method === "POST" && path === "/api/admin/banners") {
    context(req, "admin");
    const body = await parseBody(req);
    const banner = {
      id: id("banner"),
      title: body.title || "",
      subtitle: body.subtitle || "",
      image: body.image || "",
      buttonText: body.buttonText || "查看",
      target: body.target || "",
      visibleFor: body.visibleFor || "coach",
      status: body.status || "on",
      sort: toNumber(body.sort, data.banners.length + 1)
    };
    data.banners.push(banner);
    store.save();
    return ok(banner, "轮播图已保存");
  }

  const auditMatch = path.match(/^\/api\/admin\/realname\/([^/]+)\/audit$/);
  if (method === "POST" && auditMatch) {
    context(req, "admin");
    const body = await parseBody(req);
    const coach = data.coaches.find((item) => item.id === auditMatch[1]);
    if (!coach) throw fail("教练不存在", 404);
    coach.realnameStatus = body.status || "approved";
    coach.realnameReason = body.reason || "";
    store.save();
    return ok(coach, "审核完成");
  }

  throw fail("接口不存在", 404);
}
