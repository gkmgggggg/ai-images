"""命令行：uv run atlas <命令>。"""

import asyncio
import getpass
from pathlib import Path

import typer
from sqlalchemy import select

from app.core.security import hash_password
from app.db import SessionLocal
from app.importers.image_inspirer import ImportAlreadyRunning, run_import
from app.models import AdminUser
from app.search import index as search_index

app = typer.Typer(help="AI 图集后端命令", no_args_is_help=True)


@app.command("import")
def import_upstream(
    resources: Path | None = typer.Option(None, help="素材目录，默认 resources/image-inspirer"),
) -> None:
    """从仓库内的上游素材快照导入案例和图片，完成后重建搜索索引。"""

    async def main() -> None:
        try:
            run = await run_import(trigger="cli", resources_dir=resources, log=typer.echo)
        except ImportAlreadyRunning as exc:
            typer.secho(str(exc), fg="red")
            raise typer.Exit(1) from exc
        color = "green" if run.status == "succeeded" and not run.failed else "yellow"
        typer.secho(f"导入 #{run.id} {run.status}", fg=color)
        if run.status != "succeeded":
            raise typer.Exit(1)

    asyncio.run(main())


@app.command()
def reindex() -> None:
    """用数据库全量重建 Meilisearch 索引。"""

    async def main() -> None:
        async with SessionLocal() as session:
            count = await search_index.reindex_all(session)
        typer.secho(f"搜索索引已重建：{count} 条", fg="green")

    asyncio.run(main())


@app.command("create-admin")
def create_admin(
    username: str = typer.Argument(..., help="管理员用户名"),
    password: str | None = typer.Option(None, help="不传则交互输入"),
    reset: bool = typer.Option(False, "--reset", help="用户已存在时重置密码"),
) -> None:
    """创建管理员账号（本期不开放注册，管理员只能通过命令行创建）。"""
    if password is None:
        password = getpass.getpass("密码：")
        if password != getpass.getpass("再输入一次："):
            typer.secho("两次输入不一致", fg="red")
            raise typer.Exit(1)
    if len(password) < 8:
        typer.secho("密码至少 8 位", fg="red")
        raise typer.Exit(1)

    async def main() -> None:
        async with SessionLocal() as session:
            admin = await session.scalar(select(AdminUser).where(AdminUser.username == username))
            if admin is not None and not reset:
                typer.secho(f"用户 {username} 已存在，如需重置密码请加 --reset", fg="red")
                raise typer.Exit(1)
            if admin is None:
                session.add(AdminUser(username=username, password_hash=hash_password(password)))
            else:
                admin.password_hash = hash_password(password)
            await session.commit()
        typer.secho(f"管理员 {username} 已{'更新' if admin else '创建'}", fg="green")

    asyncio.run(main())


if __name__ == "__main__":
    app()
