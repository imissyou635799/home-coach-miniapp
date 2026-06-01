import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { id, nowISO, today } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const dataFile = process.env.DATA_FILE
  ? path.resolve(root, process.env.DATA_FILE)
  : path.resolve(root, "data/app.runtime.json");

function defaultData() {
  const coachUserId = "usr_coach_demo";
  const parentUserId = "usr_parent_demo";
  const coachId = "coach_demo";
  const parentId = "parent_demo";
  const studentId = "student_demo";
  const courseId = "course_demo";
  const packageId = "pkg_demo";
  return {
    users: [
      {
        id: coachUserId,
        phone: "13800000001",
        nickname: "张教练",
        avatar: "",
        roles: ["coach"],
        defaultRole: "coach",
        status: "active",
        createdAt: nowISO()
      },
      {
        id: parentUserId,
        phone: "13800000002",
        nickname: "李明轩妈妈",
        avatar: "",
        roles: ["parent"],
        defaultRole: "parent",
        status: "active",
        createdAt: nowISO()
      }
    ],
    admins: [
      {
        id: "admin_demo",
        username: "admin",
        password: "admin123",
        name: "管理员"
      }
    ],
    coaches: [
      {
        id: coachId,
        userId: coachUserId,
        name: "张教练",
        phone: "13800000001",
        city: "杭州",
        serviceArea: "滨江、萧山、西湖",
        years: 6,
        specialties: ["中考体育", "体能训练", "体态矫正"],
        intro: "专注青少年中考体育训练，重视动作细节和长期记录。",
        realnameStatus: "approved",
        realnameReason: "",
        memberStatus: "active",
        memberExpireAt: "2026-08-31",
        paymentQr: "",
        status: "active",
        createdAt: nowISO()
      }
    ],
    parents: [
      {
        id: parentId,
        userId: parentUserId,
        phone: "13800000002",
        nickname: "李明轩妈妈",
        createdAt: nowISO()
      }
    ],
    bindings: [
      {
        id: "bind_demo",
        coachId,
        parentId,
        inviteCode: "DEMO888",
        status: "bound",
        invitedAt: nowISO(),
        boundAt: nowISO()
      }
    ],
    students: [
      {
        id: studentId,
        coachId,
        parentId,
        name: "李明轩",
        gender: "男",
        birthday: "2011-09-01",
        height: 158,
        weight: 48,
        school: "杭州某中学",
        grade: "初三",
        weakItems: ["1000 米", "引体向上"],
        goal: "中考体育冲刺满分",
        tags: ["重点学员"],
        createdAt: nowISO()
      }
    ],
    courses: [
      {
        id: courseId,
        coachId,
        name: "中考体育特训包",
        price: 3999,
        lessonCount: 30,
        durationMinutes: 60,
        target: "初中生中考体育提升",
        goal: "提升耐力、跳远和力量项目",
        intro: "适合中考体育备考学生，按阶段记录训练数据。",
        cover: "",
        video: "",
        paymentQr: "",
        status: "on",
        createdAt: nowISO()
      }
    ],
    paymentRequests: [],
    packages: [
      {
        id: packageId,
        courseId,
        coachId,
        parentId,
        studentId,
        name: "中考体育特训包",
        totalLessons: 30,
        usedLessons: 12,
        remainingLessons: 18,
        startedAt: "2026-05-15",
        expiredAt: "",
        status: "active",
        createdAt: nowISO()
      }
    ],
    lessonRecords: [
      {
        id: "lesson_demo_1",
        packageId,
        studentId,
        coachId,
        parentId,
        lessonDate: today(),
        startTime: "09:00",
        endTime: "10:00",
        content: "体能基础训练 + 中考体育专项",
        cost: 1,
        remainingAfter: 18,
        status: "published",
        createdAt: nowISO()
      }
    ],
    feedback: [
      {
        id: "fb_demo",
        lessonId: "lesson_demo_1",
        coachId,
        parentId,
        studentId,
        content: "本节课完成度较好，1000 米后半程速度保持还需要加强。",
        weakness: "耐力和摆臂稳定性",
        nextPlan: "下节课加强间歇跑和核心力量。",
        images: [],
        videos: [],
        status: "published",
        createdAt: nowISO()
      }
    ],
    trainingData: [
      {
        id: "td_1",
        studentId,
        lessonId: "lesson_demo_1",
        item: "1000 米",
        value: 272,
        displayValue: "4'32\"",
        unit: "秒",
        direction: "down",
        recordedAt: today()
      },
      {
        id: "td_2",
        studentId,
        lessonId: "lesson_demo_1",
        item: "引体向上",
        value: 12,
        displayValue: "12",
        unit: "个",
        direction: "up",
        recordedAt: today()
      }
    ],
    memberOrders: [],
    banners: [
      {
        id: "banner_demo",
        title: "抖音 / 小红书教练账号运营全攻略",
        subtitle: "0 成本获客，每月新增 10+ 家长",
        image: "",
        buttonText: "免费试看",
        target: "learning",
        visibleFor: "coach",
        status: "on",
        sort: 1
      }
    ],
    messages: [],
    sessions: []
  };
}

export class Store {
  constructor() {
    this.data = null;
  }

  load() {
    if (this.data) return this.data;
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    if (!fs.existsSync(dataFile)) {
      this.data = defaultData();
      this.save();
      return this.data;
    }
    this.data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return this.data;
  }

  save() {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(this.data, null, 2), "utf8");
  }

  reset() {
    this.data = defaultData();
    this.save();
  }

  createSession(userId, role) {
    const token = id("tok");
    this.data.sessions.push({ token, userId, role, createdAt: nowISO() });
    this.save();
    return token;
  }

  getSession(token) {
    return this.data.sessions.find((item) => item.token === token);
  }

  addMessage(message) {
    this.data.messages.push({
      id: id("msg"),
      read: false,
      createdAt: nowISO(),
      ...message
    });
  }
}

export const store = new Store();
