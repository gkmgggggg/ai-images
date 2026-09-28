---
title: ADR-0008 生产环境为单台阿里云 ECS 上的 Docker Compose
status: accepted
updated: 2026-09-28
requirements: []
---

# ADR-0008 生产环境为单台阿里云 ECS 上的 Docker Compose

## 背景

确定部署到阿里云；数据量千条级，访问量未知但预计不大；不开放用户注册。

## 决定

一台 ECS 上用 Docker Compose 运行 `web`（Nginx + 前端静态文件）、`api`、`postgres`、`meilisearch` 四个容器；不引入 Redis 与消息队列，导入这类低频任务用 FastAPI BackgroundTasks 或命令行执行。数据库与图片每日备份到 OSS。

## 备选方案

| 方案 | 为什么没选 |
| --- | --- |
| RDS PostgreSQL + OSS + 多台 ECS | 当前规模成本高、运维面大；需要时可逐项迁移 |
| Kubernetes（ACK） | 远超当前需要 |
| Celery / arq + Redis 任务队列 | 导入每次约 40 秒且很少触发，后台任务足够 |

## 后果

- 部署与恢复简单，一条命令起全部服务。
- 单点：ECS 故障会导致整站不可用，依赖备份恢复。
- BackgroundTasks 在进程重启时会中断导入，下次导入会把超过 1 小时的 running 记录标记为失败。
