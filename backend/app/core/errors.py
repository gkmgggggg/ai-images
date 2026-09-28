from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message


def not_found(message: str = "资源不存在") -> AppError:
    return AppError(404, "not_found", message)


def conflict(message: str) -> AppError:
    return AppError(409, "conflict", message)


def bad_request(message: str) -> AppError:
    return AppError(400, "bad_request", message)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse({"code": exc.code, "message": exc.message}, status_code=exc.status_code)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "请求失败"
        return JSONResponse(
            {"code": f"http_{exc.status_code}", "message": message}, status_code=exc.status_code
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {"field": ".".join(str(p) for p in err["loc"][1:]), "message": err["msg"]} for err in exc.errors()
        ]
        first = errors[0] if errors else {"field": "", "message": "参数错误"}
        return JSONResponse(
            {
                "code": "validation_error",
                "message": f"{first['field']}: {first['message']}",
                "errors": errors,
            },
            status_code=422,
        )
