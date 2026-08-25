import { apiFetch } from "../../../shared/api/apiClient";
import { SystemVersionInfo } from "../model/types";

interface ApiSystemVersion {
  application_version: string;
  git_sha: string;
  database_revision: string;
}

export function createSystemRepository() {
  return {
    async getVersion(): Promise<SystemVersionInfo> {
      const result = await apiFetch<ApiSystemVersion>("/api/v1/system/version");
      return {
        applicationVersion: result.application_version,
        gitSha: result.git_sha,
        databaseRevision: result.database_revision,
      };
    },
  };
}
