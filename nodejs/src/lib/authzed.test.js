import {
  createObject,
  createObjectStr,
  createSubject,
  createSubjectStr,
  createRelationship,
  createRelationshipStr,
  createPermissionRequestStr,
  getRelationships,
  getResourceTypeRelationships,
  simplifyPermissionRelationshipTree,
} from "./authzed.js";
import { jest } from "@jest/globals";

describe("createObject", () => {
  it("should create an object", () => {
    expect(createObject("a:b")).toEqual({ objectType: "a", objectId: "b" });
  });
});

describe("createObjectStr", () => {
  it("should create an object string", () => {
    expect(createObjectStr({ objectType: "a", objectId: "b" })).toEqual("a:b");
  });
});

describe("createSubject", () => {
  it("should create a subject", () => {
    expect(createSubject("a:b")).toEqual({ object: { objectType: "a", objectId: "b" }, optionalRelation: "" });
  });
});

describe("createSubjectStr", () => {
  it("should create a subject string", () => {
    expect(createSubjectStr({ object: { objectType: "a", objectId: "b" }, optionalRelation: "" })).toEqual("a:b");
  });
});

describe("createRelationship", () => {
  it("should create a relationship", () => {
    expect(createRelationship("a:b#c@d:e")).toEqual({
      resource: { objectType: "a", objectId: "b" },
      relation: "c",
      subject: { object: { objectType: "d", objectId: "e" }, optionalRelation: "" },
    });
  });
});

describe("createRelationshipStr", () => {
  it("should create a relationship string", () => {
    expect(
      createRelationshipStr({
        resource: { objectType: "a", objectId: "b" },
        relation: "c",
        subject: { object: { objectType: "d", objectId: "e" }, optionalRelation: "" },
      })
    ).toEqual("a:b#c@d:e");
  });
});

describe("createPermissionRequestStr", () => {
  it("should create a permission request string", () => {
    expect(
      createPermissionRequestStr({
        resource: { objectType: "a", objectId: "b" },
        permission: "c",
        subject: { object: { objectType: "d", objectId: "e" }, optionalRelation: "" },
      })
    ).toEqual("a:b#c@d:e");
  });
});

describe("getRelationships", () => {
  it("returns an array of relationship strings", async () => {
    const mockData = [
      {
        relationships: [createRelationship("a:b#c@d:e"), createRelationship("f:g#h@i:j")],
      },
    ];

    const mockClient = {
      bulkExportRelationships: jest.fn().mockImplementation(() => ({
        toArray: () => Promise.resolve(mockData),
      })),
    };

    const limit = 1000;
    const result = await getRelationships(mockClient, limit);

    expect(mockClient.bulkExportRelationships).toHaveBeenCalledWith({ optionalLimit: limit });
    expect(result).toEqual(["a:b#c@d:e", "f:g#h@i:j"]);
  });

  it("handles empty data correctly", async () => {
    const mockData = [{ relationships: [] }];

    const mockClient = {
      bulkExportRelationships: jest.fn().mockImplementation(() => ({
        toArray: () => Promise.resolve(mockData),
      })),
    };

    const result = await getRelationships(mockClient, 1000);
    expect(result).toEqual([]);
  });

  it("handles errors in bulkExportRelationships correctly", async () => {
    const mockClient = {
      bulkExportRelationships: jest.fn().mockImplementation(() => ({
        toArray: () => Promise.reject(new Error("Test Error")),
      })),
    };

    await expect(getRelationships(mockClient, 1000)).rejects.toThrow("Test Error");
  });
});

describe("getResourceTypeRelationships", () => {
  it("returns an array of formatted relationship strings for a given resource type", async () => {
    const mockResponse = [
      {
        relationship: {
          resource: { objectType: "user", objectId: "picard" },
          relation: "operate",
          subject: { object: { objectType: "starship_system", objectId: "enterprise_bridge" } },
        },
      },
    ];

    const mockClient = {
      promises: {
        readRelationships: jest.fn().mockResolvedValue(mockResponse),
      },
    };

    const resourceType = "user";
    const result = await getResourceTypeRelationships(mockClient, resourceType);

    expect(mockClient.promises.readRelationships).toHaveBeenCalledWith({
      optionalLimit: 0,
      relationshipFilter: {
        optionalRelation: "",
        optionalResourceId: "",
        resourceType,
      },
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(["user:picard#operate@starship_system:enterprise_bridge"]);
  });

  it("returns an empty array when no relationships are found", async () => {
    const mockClient = {
      promises: {
        readRelationships: jest.fn().mockResolvedValue([]),
      },
    };

    const resourceType = "user";
    const result = await getResourceTypeRelationships(mockClient, resourceType);

    expect(result).toEqual([]);
  });

  it("handles errors from readRelationships correctly", async () => {
    const mockClient = {
      promises: {
        readRelationships: jest.fn().mockRejectedValue(new Error("Test Error")),
      },
    };

    const resourceType = "user";
    await expect(getResourceTypeRelationships(mockClient, resourceType)).rejects.toThrow("Test Error");
  });
});

describe("simplifyPermissionRelationshipTree", () => {
  it("returns null for null input", async () => {
    const mockClient = {
      promises: {},
    };
    const result = await simplifyPermissionRelationshipTree(mockClient, null);
    expect(result).toBeNull();
  });

  it("correctly processes a leaf node", async () => {
    const mockClient = {
      promises: {},
    };

    const mockPermissionRelationshipTree = {
      expandedRelation: "operate",
      expandedObject: { objectType: "starship_system", objectId: "enterprise_bridge" },
      treeType: {
        oneofKind: "leaf",
        leaf: {
          subjects: [{ object: { objectType: "user", objectId: "picard" }, optionalRelation: "" }],
        },
      },
    };

    const result = await simplifyPermissionRelationshipTree(mockClient, mockPermissionRelationshipTree);

    expect(result).toEqual({
      relation: "operate",
      object: "starship_system:enterprise_bridge",
      subjects: ["user:picard"],
    });
  });

  it("handles special cases like UNION with one child", async () => {
    const mockUnionOneChildTree = {
      expandedRelation: "control",
      expandedObject: createObject("network:mainframe"),
      treeType: {
        oneofKind: "intermediate",
        intermediate: {
          operation: 1,
          children: [
            {
              expandedRelation: "access",
              expandedObject: createObject("system:database"),
              treeType: { oneofKind: "leaf", leaf: { subjects: [] } },
            },
          ],
        },
      },
    };

    const mockClient = {};
    const result = await simplifyPermissionRelationshipTree(mockClient, mockUnionOneChildTree);

    expect(result).toEqual({
      relation: "access",
      object: "system:database",
    });
  });

  it("correctly processes an intermediate node", async () => {
    const mockIntermediateTree = {
      expandedRelation: "manage",
      expandedObject: createObject("group:engineering"),
      treeType: {
        oneofKind: "intermediate",
        intermediate: {
          operation: 1,
          children: [
            {
              expandedRelation: "access",
              expandedObject: createObject("system:database"),
              treeType: { oneofKind: "leaf", leaf: { subjects: [] } },
            },
            {
              expandedRelation: "modify",
              expandedObject: createObject("system:server"),
              treeType: { oneofKind: "leaf", leaf: { subjects: [] } },
            },
          ],
        },
      },
    };

    const mockClient = {};
    const result = await simplifyPermissionRelationshipTree(mockClient, mockIntermediateTree);

    expect(result).toEqual({
      relation: "manage",
      object: "group:engineering",
      operation: "UNION",
      children: [
        {
          relation: "access",
          object: "system:database",
        },
        {
          relation: "modify",
          object: "system:server",
        },
      ],
    });
  });
});
