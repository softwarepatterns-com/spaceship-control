import { Dot } from "./dot.js";

describe("Dot", () => {
  it("correctly generates a GraphViz dot file string from a simplified tree structure", () => {
    const data = [
      {
        relation: "edit",
        object: "form:form_a",
        children: [{ relation: "view", object: "form:form_b", children: [] }],
      },
    ];
    const dot = new Dot(data);
    const dotString = dot.toString();

    // Check the start and end of the dot file
    expect(dotString.startsWith("digraph G {")).toBe(true);
    expect(dotString.endsWith("}")).toBe(true);

    // Check for presence of key elements
    expect(dotString).toMatch(/edit/);
    expect(dotString).toMatch(/form:form_a/);
    expect(dotString).toMatch(/view/);
    expect(dotString).toMatch(/form:form_b/);

    // Check for generated html table GraphViz node
    expect(dotString).toMatch(/\d+ \[label=</); // Node with label
    expect(dotString).toMatch(/\d+ -> \d+/); // Edge pattern
  });

  it("correctly applies node properties in the GraphViz dot file", () => {
    const data = [
      {
        relation: "specialRelation",
        object: "form:form_a",
        children: [],
      },
    ];

    const dot = new Dot(data);
    const dotString = dot.toString();

    // Check for presence of style properties
    expect(dotString).toMatch(/shape="[^"]*"/); // Check for a shape property
    expect(dotString).toMatch(/color="[^"]*"/); // Check for a color property
  });

  it("handles empty data correctly", () => {
    const dot = new Dot([]);
    const dotString = dot.toString();
    expect(dotString).toBe("digraph G {\n}");
  });
});
