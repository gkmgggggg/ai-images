"""文档工具：生成接口文档与需求追溯矩阵，并检查文档与代码是否一致。

用法（仓库根目录）：
    uv run --project backend python scripts/docs.py gen     # 或 make docs
    uv run --project backend python scripts/docs.py check   # 或 make docs-check

生成接口文档需要导入后端应用，所以要用后端的虚拟环境运行。
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
REQUIREMENTS = DOCS / "product" / "requirements.md"
TRACEABILITY = DOCS / "product" / "traceability.md"
ENDPOINTS = DOCS / "api" / "endpoints.md"

STATUSES = {
    "specs": {"draft", "review", "approved", "in-progress", "done", "rejected"},
    "adr": {"proposed", "accepted", "superseded", "deprecated"},
    "default": {"draft", "active", "deprecated", "generated"},
}
REQ_ID = re.compile(r"\b([FN]\d{2})\b")
LINK = re.compile(r"(?<!!)\[[^\]]*\]\(([^)\s]+)\)")
FENCE = re.compile(r"^(```|~~~)")


# ---------------------------------------------------------------- 通用


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def frontmatter(text: str) -> dict[str, str] | None:
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---", 4)
    if end == -1:
        return None
    meta: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if ":" in line and not line.startswith(" "):
            key, value = line.split(":", 1)
            meta[key.strip()] = value.split("#", 1)[0].strip()
    return meta


def doc_files() -> list[Path]:
    return sorted(p for p in DOCS.rglob("*.md") if not p.name.startswith("_"))


def markdown_files() -> list[Path]:
    extra = [ROOT / name for name in ("README.md", "CHANGELOG.md", "CLAUDE.md") if (ROOT / name).exists()]
    return extra + doc_files() + sorted(DOCS.rglob("_*.md"))


def strip_code(text: str) -> str:
    """去掉代码块和行内代码，避免把示例里的链接当成真实链接。"""
    lines, in_fence = [], False
    for line in text.splitlines():
        if FENCE.match(line.strip()):
            in_fence = not in_fence
            continue
        if not in_fence:
            lines.append(re.sub(r"`[^`]*`", "", line))
    return "\n".join(lines)


# ---------------------------------------------------------------- 需求与测试


@dataclass
class Requirement:
    id: str
    title: str
    priority: str
    status: str


def parse_requirements() -> dict[str, Requirement]:
    requirements: dict[str, Requirement] = {}
    for line in read(REQUIREMENTS).splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if not cells or not re.fullmatch(r"[FN]\d{2}", cells[0]):
            continue
        if cells[0].startswith("F"):  # 编号 | 模块 | 需求 | 优先级 | 状态 | 规格
            requirements[cells[0]] = Requirement(cells[0], f"{cells[1]}：{cells[2]}", cells[3], cells[4])
        else:  # 编号 | 类别 | 要求 | 状态
            requirements[cells[0]] = Requirement(cells[0], f"{cells[1]}：{cells[2]}", "—", cells[3])
    return requirements


@dataclass
class TestRef:
    file: str
    name: str


def python_test_refs(path: Path) -> list[tuple[str, TestRef]]:
    refs = []
    tree = ast.parse(read(path))
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) and node.name.startswith("test_"):
            doc = ast.get_docstring(node) or ""
            for req in sorted(set(REQ_ID.findall(doc))):
                refs.append((req, TestRef(rel(path), node.name)))
    return refs


TS_TITLE = re.compile(r"\b(?:describe|it|test)\(\s*(['\"`])(.+?)\1")


def ts_test_refs(path: Path) -> list[tuple[str, TestRef]]:
    refs = []
    for match in TS_TITLE.finditer(read(path)):
        title = match.group(2)
        for req in sorted(set(REQ_ID.findall(title))):
            refs.append((req, TestRef(rel(path), title)))
    return refs


def collect_test_refs() -> dict[str, list[TestRef]]:
    refs: dict[str, list[TestRef]] = defaultdict(list)
    for path in sorted((ROOT / "backend" / "tests").rglob("test_*.py")):
        for req, ref in python_test_refs(path):
            refs[req].append(ref)
    frontend = ROOT / "frontend"
    ts_files = sorted([*frontend.glob("src/**/*.test.ts"), *frontend.glob("src/**/*.test.tsx")])
    ts_files += sorted(frontend.glob("e2e/**/*.spec.ts"))
    for path in ts_files:
        for req, ref in ts_test_refs(path):
            refs[req].append(ref)
    return refs


def render_traceability() -> str:
    requirements = parse_requirements()
    refs = collect_test_refs()
    lines = [
        "---",
        "title: 需求追溯矩阵",
        "status: generated",
        "---",
        "",
        "# 需求追溯矩阵",
        "",
        "> 由 `make docs`（`scripts/docs.py gen`）根据 [需求清单](requirements.md) "
        "和测试中标注的需求编号生成，不要手改。"
        "测试如何标注见 [测试指南](../guides/testing.md#写测试的约定)。",
        "",
    ]
    summary = []
    for prefix, label in (("F", "功能需求"), ("N", "非功能需求")):
        done = [r for r in requirements.values() if r.id.startswith(prefix) and r.status.startswith("已实现")]
        covered = [r for r in done if refs.get(r.id)]
        summary.append(f"{label} {len(covered)}/{len(done)}")
    lines += [
        f"已实现且有测试引用：{'，'.join(summary)}。功能需求必须全部有测试（`make docs-check` 强制），"
        "非功能需求多数靠评审与上线检查验证。",
        "",
    ]
    lines += ["| 编号 | 需求 | 状态 | 测试 |", "| --- | --- | --- | --- |"]
    for req in requirements.values():
        tests = refs.get(req.id, [])
        title = req.title if len(req.title) <= 40 else req.title[:40] + "…"
        cell = "<br>".join(f"`{t.file}` › {t.name}" for t in tests) or "—"
        lines.append(f"| {req.id} | {title} | {req.status} | {cell} |")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------- 接口文档


def load_openapi() -> dict:
    sys.path.insert(0, str(ROOT / "backend"))
    from app.main import create_app  # noqa: PLC0415

    return create_app().openapi()


def type_of(schema: dict) -> str:
    if "$ref" in schema:
        name = schema["$ref"].rsplit("/", 1)[-1]
        return f"[{name}](#{name.lower()})"
    if "anyOf" in schema:
        return " \\| ".join(type_of(s) for s in schema["anyOf"])
    if "enum" in schema:
        return " \\| ".join(f"`{v}`" for v in schema["enum"])
    if "const" in schema:
        return f"`{schema['const']}`"
    kind = schema.get("type")
    if kind == "array":
        return f"{type_of(schema.get('items', {}))}[]"
    if kind == "null":
        return "null"
    if kind == "object" and "additionalProperties" in schema:
        return "object"
    fmt = schema.get("format")
    return f"{kind}（{fmt}）" if fmt and kind == "string" else (kind or "any")


def constraints(schema: dict) -> str:
    parts = []
    for key, label in (
        ("minimum", "≥"),
        ("maximum", "≤"),
        ("minLength", "最短 "),
        ("maxLength", "最长 "),
        ("pattern", "格式 "),
    ):
        if key in schema:
            value = schema[key]
            parts.append(f"{label}`{value}`" if key == "pattern" else f"{label}{value}")
    for sub in schema.get("anyOf", []):
        if sub.get("type") != "null":
            parts.extend(p for p in constraints(sub).split("，") if p)
    if "default" in schema and schema["default"] not in (None, [], {}):
        parts.append(f"默认 `{json.dumps(schema['default'], ensure_ascii=False)}`")
    return "，".join(parts)


def needs_login(path: str) -> bool:
    return path.startswith("/api/v1/admin") or path == "/api/v1/auth/me"


def render_endpoints(spec: dict) -> str:
    tag_titles = {"public": "前台", "auth": "鉴权", "admin": "管理后台"}
    groups: dict[str, list[tuple[str, str, dict]]] = defaultdict(list)
    for path, item in spec["paths"].items():
        for method, op in item.items():
            groups[(op.get("tags") or ["other"])[0]].append((method.upper(), path, op))

    lines = [
        "---",
        "title: 接口清单",
        "status: generated",
        "---",
        "",
        "# 接口清单",
        "",
        "> 由 `make docs`（`scripts/docs.py gen`）从后端 FastAPI 的 OpenAPI 生成，不要手改；"
        "要修改说明，请改后端路由的 `summary`、参数的 `description` 或 Pydantic 模型。"
        "通用约定（错误格式、分页、鉴权）见 [接口约定](README.md)。",
        "",
        f"共 {sum(len(v) for v in groups.values())} 个接口，统一前缀 `/api/v1`。"
        "所有带参数或请求体的接口在校验失败时返回 422，下文不再逐一列出。",
        "",
        "| 分组 | 方法 | 路径 | 说明 | 登录 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for tag, ops in groups.items():
        for method, path, op in ops:
            anchor = re.sub(r"[^\w\u4e00-\u9fff -]", "", f"{method} {path}").strip().lower().replace(" ", "-")
            login = "是" if needs_login(path) else ""
            group = tag_titles.get(tag, tag)
            lines.append(
                f"| {group} | {method} | [`{path}`](#{anchor}) | {op.get('summary', '')} | {login} |"
            )

    for tag, ops in groups.items():
        lines += ["", f"## {tag_titles.get(tag, tag)}"]
        for method, path, op in ops:
            lines += [
                "",
                f"### {method} {path}",
                "",
                f"{op.get('summary', '')}。" + (" 需要管理员登录。" if needs_login(path) else ""),
            ]
            params = op.get("parameters", [])
            if params:
                lines += ["", "| 参数 | 位置 | 类型 | 必填 | 说明 |", "| --- | --- | --- | --- | --- |"]
                for p in params:
                    schema = p.get("schema", {})
                    desc = "，".join(x for x in (p.get("description", ""), constraints(schema)) if x)
                    required = "是" if p.get("required") else ""
                    lines.append(f"| `{p['name']}` | {p['in']} | {type_of(schema)} | {required} | {desc} |")
            body = op.get("requestBody")
            if body:
                content_type, content = next(iter(body["content"].items()))
                lines += ["", f"请求体（`{content_type}`）：{type_of(content.get('schema', {}))}"]
            responses = [(code, resp) for code, resp in op.get("responses", {}).items() if code != "422"]
            lines += ["", "| 状态码 | 响应 |", "| --- | --- |"]
            for code, resp in responses:
                schema = resp.get("content", {}).get("application/json", {}).get("schema")
                lines.append(f"| {code} | {type_of(schema) if schema else '无内容'} |")

    lines += ["", "## 数据结构"]
    for name, schema in spec.get("components", {}).get("schemas", {}).items():
        if name in {"HTTPValidationError", "ValidationError"} or name.startswith("Body_"):
            continue
        lines += ["", f"### {name}"]
        if schema.get("description"):
            lines += ["", " ".join(schema["description"].split())]
        props = schema.get("properties", {})
        if props:
            required = set(schema.get("required", []))
            lines += ["", "| 字段 | 类型 | 必填 | 说明 |", "| --- | --- | --- | --- |"]
            for prop, prop_schema in props.items():
                desc = "，".join(
                    x for x in (prop_schema.get("description", ""), constraints(prop_schema)) if x
                )
                lines.append(
                    f"| `{prop}` | {type_of(prop_schema)} | {'是' if prop in required else ''} | {desc} |"
                )
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------- 检查


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)

    def error(self, message: str) -> None:
        self.errors.append(message)


def check_frontmatter(report: Report) -> None:
    for path in doc_files():
        meta = frontmatter(read(path))
        if meta is None:
            report.error(f"{rel(path)}：缺少 frontmatter")
            continue
        area = path.relative_to(DOCS).parts[0]
        allowed = STATUSES.get(area, STATUSES["default"]) if path.name != "README.md" else STATUSES["default"]
        status = meta.get("status", "")
        if not meta.get("title"):
            report.error(f"{rel(path)}：frontmatter 缺少 title")
        if status not in allowed:
            report.error(f"{rel(path)}：status「{status}」不合法，可选 {sorted(allowed)}")
        if status != "generated" and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", meta.get("updated", "")):
            report.error(f"{rel(path)}：frontmatter 缺少 updated（YYYY-MM-DD）")


def check_links(report: Report) -> None:
    for path in markdown_files():
        if path.name.startswith("_"):
            continue
        for target in LINK.findall(strip_code(read(path))):
            if re.match(r"^[a-z]+:", target) or target.startswith("#"):
                continue
            file_part = target.split("#", 1)[0]
            if file_part and not (path.parent / file_part).resolve().exists():
                report.error(f"{rel(path)}：链接指向不存在的文件 {target}")


def check_numbered(report: Report, folder: str) -> None:
    directory = DOCS / folder
    numbered = sorted(p for p in directory.glob("[0-9][0-9][0-9][0-9]-*.md"))
    numbers = [int(p.name[:4]) for p in numbered]
    if numbers != list(range(1, len(numbers) + 1)):
        report.error(f"docs/{folder}：编号不连续 {numbers}")
    index = read(directory / "README.md")
    for path in numbered:
        if f"({path.name})" not in index:
            report.error(f"docs/{folder}/README.md：未登记 {path.name}")
        meta = frontmatter(read(path)) or {}
        row = next((line for line in index.splitlines() if f"({path.name})" in line), "")
        if row and meta.get("status") and meta["status"] not in row:
            report.error(f"docs/{folder}/README.md：{path.name} 的状态应为 {meta['status']}")


def check_requirements(report: Report) -> None:
    requirements = parse_requirements()
    refs = collect_test_refs()
    for req in requirements.values():
        if req.id.startswith("F") and req.status.startswith("已实现") and not refs.get(req.id):
            report.error(
                f"需求 {req.id} 标为已实现，但没有任何测试引用（在测试名称或文档字符串中写上 {req.id}）"
            )
    for req_id, tests in refs.items():
        if req_id not in requirements:
            report.error(f"测试引用了不存在的需求编号 {req_id}：{tests[0].file} › {tests[0].name}")
    for path in sorted((DOCS / "specs").glob("[0-9]*.md")) + sorted((DOCS / "adr").glob("[0-9]*.md")):
        meta = frontmatter(read(path)) or {}
        for req_id in REQ_ID.findall(meta.get("requirements", "")):
            if req_id not in requirements:
                report.error(f"{rel(path)}：requirements 中的 {req_id} 不在需求清单里")


def check_generated(report: Report) -> None:
    expected = {TRACEABILITY: render_traceability()}
    try:
        expected[ENDPOINTS] = render_endpoints(load_openapi())
    except Exception as exc:  # noqa: BLE001
        report.error(f"无法导入后端生成接口文档（请用 uv run --project backend 运行）：{exc}")
    for path, content in expected.items():
        if not path.exists() or read(path) != content:
            report.error(f"{rel(path)} 已过期，请运行 make docs 并提交")


def command_gen() -> int:
    ENDPOINTS.parent.mkdir(parents=True, exist_ok=True)
    ENDPOINTS.write_text(render_endpoints(load_openapi()), encoding="utf-8")
    TRACEABILITY.write_text(render_traceability(), encoding="utf-8")
    print(f"已生成 {rel(ENDPOINTS)}、{rel(TRACEABILITY)}")
    return 0


def command_check() -> int:
    report = Report()
    check_frontmatter(report)
    check_links(report)
    check_numbered(report, "specs")
    check_numbered(report, "adr")
    check_requirements(report)
    check_generated(report)
    if report.errors:
        print(f"文档检查失败（{len(report.errors)} 项）：")
        for message in report.errors:
            print(f"  - {message}")
        return 1
    print(f"文档检查通过：{len(doc_files())} 篇文档，{len(parse_requirements())} 条需求。")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="文档生成与检查")
    parser.add_argument("command", choices=["gen", "check"])
    args = parser.parse_args()
    return command_gen() if args.command == "gen" else command_check()


if __name__ == "__main__":
    sys.exit(main())
