const { graphqlRequest } = require("../client/graphqlClient");

async function createProduct(input, tenant = "tenant-a") {
  const res = await graphqlRequest(
    `mutation CreateProduct($input: CreateProductInput!) {
       createProduct(input: $input) { id name price status tenantId }
     }`,
    { input },
    tenant,
  );
  return res.body.data?.createProduct;
}

async function deleteProduct(id, tenant = "tenant-a") {
  const res = await graphqlRequest(
    `mutation { deleteProduct(id: ${id}) }`,
    {},
    tenant,
  );
  return res.body.data?.deleteProduct;
}

describe("Products — CRUD", () => {
  let createdId;

  it("creates a product and returns it", async () => {
    const product = await createProduct({
      name: "Test Widget",
      price: 9.99,
      status: "ACTIVE",
    });
    expect(product).toMatchObject({
      name: "Test Widget",
      price: 9.99,
      status: "ACTIVE",
    });
    expect(product.id).toBeDefined();
    createdId = product.id;
  });

  it("fetches the created product by id", async () => {
    const res = await graphqlRequest(
      `query { product(id: ${createdId}) { id name price } }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.product).toMatchObject({
      name: "Test Widget",
      price: 9.99,
    });
  });

  it("updates the product", async () => {
    const res = await graphqlRequest(
      `mutation { updateProduct(id: ${createdId}, input: { price: 19.99 }) { id price } }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.updateProduct.price).toBe(19.99);
  });

  it("deletes the product", async () => {
    const res = await graphqlRequest(
      `mutation { deleteProduct(id: ${createdId}) }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.deleteProduct).toBe(true);
  });

  it("returns null after deletion", async () => {
    const res = await graphqlRequest(
      `query { product(id: ${createdId}) { id } }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.product).toBeNull();
  });
});

describe("Products — filtering", () => {
  beforeAll(async () => {
    await createProduct({
      name: "Expensive Gizmo",
      price: 999.99,
      status: "ACTIVE",
    });
    await createProduct({
      name: "Cheap Gizmo",
      price: 1.99,
      status: "INACTIVE",
    });
    await createProduct({ name: "Mid Gizmo", price: 50.0, status: "ACTIVE" });
  });

  it("filters by partial name (case-insensitive)", async () => {
    const res = await graphqlRequest(
      `query { products(filter: { name: "gizmo" }) { name } }`,
      {},
      "tenant-a",
    );
    const names = res.body.data.products.map((p) => p.name);
    expect(names.length).toBeGreaterThanOrEqual(3);
    names.forEach((n) => expect(n.toLowerCase()).toContain("gizmo"));
  });

  it("filters by status ACTIVE", async () => {
    const res = await graphqlRequest(
      `query { products(filter: { status: ACTIVE }) { status } }`,
      {},
      "tenant-a",
    );
    res.body.data.products.forEach((p) => expect(p.status).toBe("ACTIVE"));
  });

  it("filters by minPrice", async () => {
    const res = await graphqlRequest(
      `query { products(filter: { minPrice: 100 }) { price } }`,
      {},
      "tenant-a",
    );
    res.body.data.products.forEach((p) =>
      expect(p.price).toBeGreaterThanOrEqual(100),
    );
  });

  it("filters by maxPrice", async () => {
    const res = await graphqlRequest(
      `query { products(filter: { maxPrice: 10 }) { price } }`,
      {},
      "tenant-a",
    );
    res.body.data.products.forEach((p) =>
      expect(p.price).toBeLessThanOrEqual(10),
    );
  });

  it("filters by price range", async () => {
    const res = await graphqlRequest(
      `query { products(filter: { minPrice: 10, maxPrice: 100 }) { price } }`,
      {},
      "tenant-a",
    );
    res.body.data.products.forEach((p) => {
      expect(p.price).toBeGreaterThanOrEqual(10);
      expect(p.price).toBeLessThanOrEqual(100);
    });
  });
});

describe("Products — pagination", () => {
  it("respects pageSize", async () => {
    const res = await graphqlRequest(
      `query { products(pageSize: 2) { id } }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.products.length).toBeLessThanOrEqual(2);
  });

  it("returns different results for page 1 vs page 2", async () => {
    const page1 = await graphqlRequest(
      `query { products(page: 1, pageSize: 2) { id } }`,
      {},
      "tenant-a",
    );
    const page2 = await graphqlRequest(
      `query { products(page: 2, pageSize: 2) { id } }`,
      {},
      "tenant-a",
    );
    const ids1 = page1.body.data.products.map((p) => p.id);
    const ids2 = page2.body.data.products.map((p) => p.id);
    expect(ids1.some((id) => ids2.includes(id))).toBe(false);
  });
});

describe("Products — error handling", () => {
  it("returns null for non-existent product id", async () => {
    const res = await graphqlRequest(
      `query { product(id: 999999) { id } }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.product).toBeNull();
  });

  it("returns an error when creating product without name", async () => {
    const res = await graphqlRequest(
      `mutation { createProduct(input: { price: 10.00, status: ACTIVE }) { id } }`,
      {},
      "tenant-a",
    );
    expect(res.body.errors).toBeDefined();
  });

  it("returns an error for invalid status enum", async () => {
    const res = await graphqlRequest(
      `mutation { createProduct(input: { name: "X", price: 1.00, status: INVALID }) { id } }`,
      {},
      "tenant-a",
    );
    expect(res.body.errors).toBeDefined();
  });
});
