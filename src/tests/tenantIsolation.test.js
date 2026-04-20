const { graphqlRequest } = require("../client/graphqlClient");

async function seedTenantAProduct() {
  const res = await graphqlRequest(
    `mutation { createProduct(input: { name: "Tenant A Product", price: 5.00, status: ACTIVE }) { id } }`,
    {},
    "tenant-a",
  );
  return parseInt(res.body.data.createProduct.id);
}

async function seedTenantAImage(productId) {
  const res = await graphqlRequest(
    `mutation { createImage(input: { url: "https://cdn.example.com/ta.jpg", productId: ${productId} }) { id } }`,
    {},
    "tenant-a",
  );
  return parseInt(res.body.data.createImage.id);
}

describe("Tenant isolation — queries", () => {
  let tenantAProductId;

  beforeAll(async () => {
    tenantAProductId = await seedTenantAProduct();
  });

  it("product(id) should return null for wrong tenant", async () => {
    const res = await graphqlRequest(
      `query { product(id: ${tenantAProductId}) { id name } }`,
      {},
      "tenant-b",
    );
    expect(res.body.data.product).toBeNull();
  });

  it("products() for tenant-b should not contain tenant-a products", async () => {
    const res = await graphqlRequest(
      `query { products { id name tenantId } }`,
      {},
      "tenant-b",
    );
    const ids = res.body.data.products.map((p) => p.id);
    expect(ids).not.toContain(String(tenantAProductId));
  });

  it("images() for tenant-b should not contain tenant-a images", async () => {
    const imageId = await seedTenantAImage(tenantAProductId);
    const res = await graphqlRequest(
      `query { images { id tenantId } }`,
      {},
      "tenant-b",
    );
    const ids = res.body.data.images.map((i) => i.id);
    expect(ids).not.toContain(String(imageId));
  });
});

describe("Tenant isolation — mutations", () => {
  let tenantAProductId;

  beforeEach(async () => {
    tenantAProductId = await seedTenantAProduct();
  });

  it("tenant-b cannot update tenant-a product", async () => {
    const res = await graphqlRequest(
      `mutation { updateProduct(id: ${tenantAProductId}, input: { price: 0.01 }) { id price } }`,
      {},
      "tenant-b",
    );
    const updated = res.body.data?.updateProduct;
    if (updated) {
      expect(updated.price).not.toBe(0.01);
    } else {
      expect(res.body.errors || res.body.data.updateProduct).toBeDefined();
    }

    const check = await graphqlRequest(
      `query { product(id: ${tenantAProductId}) { price } }`,
      {},
      "tenant-a",
    );
    expect(check.body.data.product.price).not.toBe(0.01);
  });

  it("tenant-b cannot delete tenant-a product", async () => {
    const res = await graphqlRequest(
      `mutation { deleteProduct(id: ${tenantAProductId}) }`,
      {},
      "tenant-b",
    );

    const check = await graphqlRequest(
      `query { product(id: ${tenantAProductId}) { id } }`,
      {},
      "tenant-a",
    );
    expect(check.body.data.product).not.toBeNull();
  });
});

describe("Tenant isolation — missing header", () => {
  it("rejects requests with no x-tenant-id header", async () => {
    const res = await graphqlRequest(`query { products { id } }`, {}, null);
    expect(res.body.errors).toBeDefined();
  });
});
