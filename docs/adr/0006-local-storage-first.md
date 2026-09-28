---
title: ADR-0006 图片先存服务器磁盘，通过存储接口预留 OSS
status: accepted
updated: 2026-09-28
requirements: [F09]
---

# ADR-0006 图片先存服务器磁盘，通过存储接口预留 OSS

## 背景

首批图片 336 张，原图约 72 MB，加上衍生图约 115 MB；部署在单台阿里云 ECS。

## 决定

定义 `Storage` 接口（`save`、`delete`、`exists`、`url`），当前只实现 `LocalStorage`：文件写在 `ATLAS_MEDIA_ROOT`，由 Nginx 以 `/media/` 提供并长期缓存，每日备份到 OSS。流量或容量增长后再实现 OSS 版本并切换配置，同时在 OSS 前加 CDN。

## 后果

- 起步零额外成本、少一个外部依赖；开发环境与生产一致。
- 图片与服务器绑定，扩容到多台机器前必须先切换到 OSS。
- 切换时需要把现有文件迁移到 OSS（key 不变，可直接同步目录）。
