import { defineRailway, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const docOct = service("doc-oct", {
    replicas: { "ams": 1 },
    env: { EXPERIENTIAL_API_KEY: preserve(), EXPERIENTIAL_BASE_URL: preserve(), LLM_MODEL: preserve() },
  });

  return project("doc-oct", {
    resources: [docOct],
  });
});
