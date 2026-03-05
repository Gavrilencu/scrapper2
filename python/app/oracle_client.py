import oracledb
from typing import Any


def build_connect_string(host: str, port: int, service_name: str) -> str:
    return f"{host}:{port}/{service_name}"


def get_connection(user: str, password: str, connect_string: str) -> oracledb.Connection:
    return oracledb.connect(
        user=user,
        password=password,
        dsn=connect_string,
    )


def run_script(
    user: str,
    password: str,
    connect_string: str,
    script: str,
    bind_params: dict[str, Any] | None = None,
) -> dict:
    bind_params = bind_params or {}
    conn = get_connection(user, password, connect_string)
    try:
        script_stripped = script.strip()
        is_select = script_stripped.upper().startswith("SELECT")
        cursor = conn.cursor()
        if is_select:
            cursor.execute(script, bind_params or {})
            rows = cursor.fetchall()
            cols = [d[0] for d in cursor.description]
            result = [dict(zip(cols, row)) for row in rows]
            return {"rows": result}
        else:
            cursor.execute(script, bind_params or {})
            conn.commit()
            return {"rowsAffected": cursor.rowcount}
    finally:
        conn.close()


def test_connection(
    host: str, port: int, service_name: str, user: str, password: str
) -> tuple[bool, str | None]:
    try:
        conn = get_connection(
            user, password, build_connect_string(host, port, service_name)
        )
        conn.close()
        return True, None
    except Exception as e:
        return False, str(e)
