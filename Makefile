# 仓库根目录的常用任务。env -u VIRTUAL_ENV 避免终端里激活的其他虚拟环境干扰 uv。
UV := env -u VIRTUAL_ENV uv
DOCS := $(UV) run --project backend python scripts/docs.py

.PHONY: check backend-check frontend-check docs docs-check

## 提交前运行：后端检查与测试、前端类型检查与测试、文档检查
check: backend-check frontend-check docs-check

backend-check:
	cd backend && $(UV) run ruff check . ../scripts --config pyproject.toml
	cd backend && $(UV) run ruff format --check . ../scripts --config pyproject.toml
	cd backend && $(UV) run pytest -q

frontend-check:
	cd frontend && pnpm typecheck
	cd frontend && pnpm test

## 重新生成接口清单与需求追溯矩阵
docs:
	$(DOCS) gen

## 检查文档：frontmatter、链接、规格与 ADR 登记、需求测试覆盖、生成文件是否过期
docs-check:
	$(DOCS) check
