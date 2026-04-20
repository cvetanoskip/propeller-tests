const { graphqlRequest } = require("../client/graphqlClient");

async function createProduct(name = "Image Test Product", tenant = "tenant-a") {
  const res = await graphqlRequest(
    `mutation { createProduct(input: { name: "${name}", price: 1.00, status: ACTIVE }) { id } }`,
    {},
    tenant,
  );
  return res.body.data.createProduct;
}

async function createImage(input, tenant = "tenant-a") {
  const res = await graphqlRequest(
    `mutation CreateImage($input: CreateImageInput!) {
       createImage(input: $input) { id url priority productId }
     }`,
    { input },
    tenant,
  );
  return res.body.data?.createImage;
}

describe("Images — CRUD", () => {
  let productId, imageId;

  beforeAll(async () => {
    const product = await createProduct();
    productId = parseInt(product.id);
  });

  it("creates an image linked to a product", async () => {
    const image = await createImage({
      url: "https://cdn.example.com/img1.jpg",
      productId,
    });
    expect(image).toMatchObject({
      url: "https://cdn.example.com/img1.jpg",
      productId,
    });
    expect(image.priority).toBe(100);
    imageId = parseInt(image.id);
  });

  it("creates an unlinked image (no productId)", async () => {
    const image = await createImage({
      url: "https://cdn.example.com/unlinked.jpg",
    });
    expect(image.productId).toBeNull();
  });

  it("creates image with custom priority", async () => {
    const image = await createImage({
      url: "https://cdn.example.com/prio.jpg",
      priority: 500,
      productId,
    });
    expect(image.priority).toBe(500);
  });

  it("updates the image url", async () => {
    const res = await graphqlRequest(
      `mutation { updateImage(id: ${imageId}, input: { url: "https://cdn.example.com/updated.jpg" }) { url } }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.updateImage.url).toBe(
      "https://cdn.example.com/updated.jpg",
    );
  });

  it("deletes the image", async () => {
    const res = await graphqlRequest(
      `mutation { deleteImage(id: ${imageId}) }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.deleteImage).toBe(true);
  });
});

describe("Images — filtering by productId", () => {
  let productId;

  beforeAll(async () => {
    const product = await createProduct("Filter Images Product");
    productId = parseInt(product.id);
    await createImage({ url: "https://cdn.example.com/a.jpg", productId });
    await createImage({ url: "https://cdn.example.com/b.jpg", productId });
  });

  it("images(productId) returns only images for that product", async () => {
    const res = await graphqlRequest(
      `query { images(productId: ${productId}) { id productId } }`,
      {},
      "tenant-a",
    );
    const images = res.body.data.images;
    expect(images.length).toBeGreaterThanOrEqual(2);
    images.forEach((img) => expect(img.productId).toBe(productId));
  });
});

describe("Images — product relationship", () => {
  it("product.images returns the product's images", async () => {
    const product = await createProduct("Relationship Test");
    const productId = parseInt(product.id);
    await createImage({ url: "https://cdn.example.com/rel.jpg", productId });

    const res = await graphqlRequest(
      `query { product(id: ${productId}) { id images { url } } }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.product.images.length).toBeGreaterThanOrEqual(1);
  });

  it("image.product returns the parent product", async () => {
    const product = await createProduct("Reverse Rel Test");
    const productId = parseInt(product.id);
    const image = await createImage({
      url: "https://cdn.example.com/rev.jpg",
      productId,
    });

    const res = await graphqlRequest(
      `query { image(id: ${parseInt(image.id)}) { id product { id name } } }`,
      {},
      "tenant-a",
    );
    expect(res.body.data.image.product.id).toBe(String(productId));
  });
});

describe("Images — validation", () => {
  it("rejects priority below 1", async () => {
    const res = await graphqlRequest(
      `mutation { createImage(input: { url: "https://x.com/img.jpg", priority: 0 }) { id } }`,
      {},
      "tenant-a",
    );
    expect(res.body.errors).toBeDefined();
  });

  it("rejects priority above 1000", async () => {
    const res = await graphqlRequest(
      `mutation { createImage(input: { url: "https://x.com/img.jpg", priority: 1001 }) { id } }`,
      {},
      "tenant-a",
    );
    expect(res.body.errors).toBeDefined();
  });
});
