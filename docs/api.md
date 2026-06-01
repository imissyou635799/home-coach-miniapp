# 接口说明

接口默认前缀：`/api`

## 登录

- `POST /api/auth/login`
  - 入参：`{ "role": "coach|parent|admin", "phone": "13800000001", "nickname": "张教练" }`
  - 返回：`{ token, user }`

## 教练端

- `GET /api/coach/dashboard`
- `GET /api/coach/profile`
- `PUT /api/coach/profile`
- `GET /api/coach/courses`
- `POST /api/coach/courses`
- `PATCH /api/coach/courses/:id/status`
- `GET /api/coach/invitations`
- `POST /api/coach/invitations`
- `GET /api/coach/students`
- `POST /api/coach/students`
- `GET /api/coach/payment-requests`
- `POST /api/payment-requests/:id/confirm`
- `POST /api/payment-requests/:id/reject`
- `GET /api/coach/packages`
- `POST /api/coach/lessons`
- `GET /api/coach/lessons`
- `POST /api/coach/feedback`
- `GET /api/coach/stats`

## 家长端

- `GET /api/parent/home`
- `GET /api/parent/courses`
- `POST /api/payment-requests`
- `GET /api/parent/messages`

## 会员

- `POST /api/membership/orders`

当前为模拟支付：创建订单后会直接标记为已支付，并更新会员到期时间。

## 后台

- `GET /api/admin/stats`
- `GET /api/admin/coaches`
- `GET /api/admin/parents`
- `GET /api/admin/students`
- `GET /api/admin/orders`
- `GET /api/admin/banners`
- `POST /api/admin/banners`
- `POST /api/admin/realname/:coachId/audit`
