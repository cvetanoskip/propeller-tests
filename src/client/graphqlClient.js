const request = require("supertest");
const BASE_URL = "http://localhost:3000/graphql";

async function graphqlRequest(query, variables = {}, tenant = "tenant-a") {
  const req = request(BASE_URL).post("").send({ query, variables });
  if (tenant !== null) {
    req.set("x-tenant-id", tenant);
  }
  return req;
}

module.exports = { graphqlRequest };
