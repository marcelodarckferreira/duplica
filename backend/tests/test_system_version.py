import unittest

from app.api.routes import system
from app.core.deps import get_current_user
from app.core.version import APPLICATION_VERSION


class _FakeResult:
    def scalars(self) -> "_FakeResult":
        return self

    def all(self) -> list[str]:
        return ["62ad30878cdf"]


class _FakeSession:
    async def execute(self, _statement: object) -> _FakeResult:
        return _FakeResult()


class SystemVersionRouteTest(unittest.IsolatedAsyncioTestCase):
    async def test_returns_application_commit_and_database_versions(self) -> None:
        route = next(
            (route for route in system.router.routes if getattr(route, "path", None) == "/api/v1/system/version"),
            None,
        )

        self.assertIsNotNone(route)
        payload = await route.endpoint(db=_FakeSession(), _user=object())
        self.assertEqual(APPLICATION_VERSION, payload["application_version"])
        self.assertEqual("62ad30878cdf", payload["database_revision"])
        self.assertTrue(payload["git_sha"])

    async def test_declares_current_user_as_a_route_dependency(self) -> None:
        route = next(route for route in system.router.routes if getattr(route, "path", None) == "/api/v1/system/version")
        dependency_calls = {dependency.call for dependency in route.dependant.dependencies}

        self.assertIn(get_current_user, dependency_calls)


if __name__ == "__main__":
    unittest.main()
