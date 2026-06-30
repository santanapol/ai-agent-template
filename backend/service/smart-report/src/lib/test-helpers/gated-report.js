import assert from "node:assert/strict";

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {Record<string, string>} headers
 * @param {{ script: string, params?: object }} input
 */
export async function validateAndTestRun(app, headers, { script, params }) {
  const validateResponse = await app.inject({
    method: "POST",
    url: "/api/v1/smart-reports/validate",
    headers,
    payload: { script },
  });
  assert.equal(validateResponse.statusCode, 200);
  const validateBody = validateResponse.json();
  assert.equal(validateBody.data.valid, true);

  const testRunResponse = await app.inject({
    method: "POST",
    url: "/api/v1/smart-reports/test-run",
    headers,
    payload: {
      script,
      compiledScript: validateBody.data.compiledScript,
      params,
    },
  });
  assert.equal(testRunResponse.statusCode, 200);

  return {
    compiledScript: validateBody.data.compiledScript,
    testRunToken: testRunResponse.json().data.testRunToken,
  };
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {Record<string, string>} headers
 * @param {object} payload
 */
export async function createGatedReport(app, headers, payload) {
  const { compiledScript, testRunToken } = await validateAndTestRun(
    app,
    headers,
    {
      script: payload.script,
      params: payload.params,
    },
  );

  return app.inject({
    method: "POST",
    url: "/api/v1/smart-reports",
    headers,
    payload: {
      ...payload,
      compiledScript,
      testRunToken,
    },
  });
}
