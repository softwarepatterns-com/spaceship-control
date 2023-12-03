const operationFillColor = "#d3d3e3";

/**
 * Create a list of properties for a GraphViz node.
 * @param {object} options - i.e., { shape: "trapezium", color: "red" }
 * @returns {string} - i.e., ', shape="trapezium", color="red"'
 */
const createNodeProperties = (options) =>
  Object.entries(options)
    .map(([key, value]) => {
      return `, ${key}="${value}"`;
    }, [])
    .join("");

/**
 * Create GraphViz html table.
 * @param {array} rows - i.e., ["a", "b"]
 * @param {object} options - i.e., { align: "center", border: 0 }
 * @returns {string} - i.e., '<table border="0"><tr><td align="center">a</td></tr><tr><td align="center">b</td></tr></table>'
 */
const createRowsHtml = (rows, options) => {
  const { align = "center", ...tableAttributes } = options || {};
  let tableAttributesStr = Object.entries(
    Object.assign(
      {
        border: 0,
        cellspacing: 0,
        cellpadding: 1,
        cellborder: 1,
      },
      tableAttributes || {}
    )
  )
    .map(([key, value]) => ` ${key}="${value}"`)
    .join("");
  let html = `<table${tableAttributesStr}>`;
  rows.forEach((row) => {
    html += `<tr><td align="${align}">${row}</td></tr>`;
  });
  html += `</table>`;
  return html;
};

/**
 * Create a GraphViz html table with a black outline. Alignment of inner table can be anything,
 * but outer table is centered.
 * @param {array} list - i.e., ["a", "b"]
 * @param {object} tableAttributes - i.e., { align: "center", border: 0 }
 * @returns {string}
 */
const createOutlinedListHtml = (list, tableAttributes) => {
  return createRowsHtml(
    [
      createRowsHtml(list, {
        align: "center",
        cellborder: 0,
        ...(tableAttributes || {}),
      }),
    ],
    {
      align: "center",
      cellborder: 1,
      cellpadding: 4,
    }
  );
};

export class Dot {
  /**
   * Convert a simplified tree structure to a GraphViz dot file.
   * @param {array} data
   * @param {object} [config]
   */
  constructor(data, config = {}) {
    this.config = { pretty: true, indent: 1, ...config };
    this.i = 1;
    this.lines = ["digraph G {"];
    this.level = 1;
    data.forEach((item) => this.addCluster("", item));
    this.level--;
    this.push(`}`);
  }

  /**
   * Add a cluster to the graph.
   * @param {string} label - Can also be an empty string, i.e., "Cluster 1", ""
   * @param {object} node - i.e., { relation: "a:b#c@d:e", children: [] }
   * @returns {number} - The id of the cluster, i.e., 1
   */
  addCluster(label, node) {
    const id = this.i++;
    this.push(`subgraph cluster_${id} {`);
    this.level++;
    this.push(`style="dashed";`);
    this.push(`label="${label}";`);
    this.addNode(node);
    this.level--;
    this.push(`}`);
    return id;
  }

  /**
   * Add a node to the graph using a GraphViz label.
   * @param {string} label - i.e., "Alice"
   */
  addLabelNode(label, options) {
    const id = this.i++;
    this.push(`${id} [label="${label}"${createNodeProperties(options)}];`);
    return id;
  }

  /**
   * Add a node to the graph using a GraphViz html table.
   * @param {string} html - i.e., '<table border="0"><tr><td align="center">a</td></tr><tr><td align="center">b</td></tr></table>'
   * @param {object} options - i.e., { color: "black" }
   * @returns {number} - The id of the node, i.e., 1
   */
  addHtmlNode(html, options) {
    const properties = createNodeProperties({
      shape: "plain",
      ...(options || {}),
    });
    const id = this.i++;
    this.push(`${id} [label=<${html}>${properties}];`);
    return id;
  }

  /**
   * Add an edge to the graph.
   * @param {number} from - i.e., 1
   * @param {number} to - i.e., 2
   * @param {string} [label] - i.e., "Connects to"
   * @returns {number} - The id of the edge, i.e., 1
   */
  addEdge(from, to, label) {
    if (label) {
      this.push(`${from} -> ${to} [label="${label}"];`);
    } else {
      this.push(`${from} -> ${to};`);
    }
  }

  /**
   * Add a node to the graph.
   * @param {object} node - i.e., { relation: "edit", object: "form:form_a", children: [] }
   * @param {number} [parentId] - i.e., 1, undefined
   * @returns {number} - The id of the node, i.e., 2
   */
  addNode(node, parentId) {
    const nodeId = this.addHtmlNode(createOutlinedListHtml([node.relation, node.object]), { color: "black" });

    if (parentId) {
      this.addEdge(parentId, nodeId);
    }

    if (node.children && node.children.length > 0) {
      if (node.operation) {
        const operationId = this.addLabelNode(node.operation.toLowerCase(), {
          shape: node.operation === "UNION" ? "trapezium" : "invtrapezium",
          fillcolor: operationFillColor,
          color: operationFillColor,
          style: "filled",
        });

        this.addEdge(nodeId, operationId);

        node.children.forEach((child) => this.addNode(child, operationId));
      } else {
        node.children.forEach((child) => this.addNode(child, nodeId));
      }
    }

    if (node.subjects && node.subjects.length > 0) {
      const subjectListId = this.addHtmlNode(createOutlinedListHtml(node.subjects, { align: "left" }), {
        color: "none",
      });

      this.addEdge(nodeId, subjectListId);
    }
  }

  /**
   * Add a line to the list of lines, adding indentation if config.pretty is true.
   * @param {string} line - i.e., "  2 -> 3"
   */
  push(line) {
    const indent = this.config.pretty ? " ".repeat(this.level * this.config.indent) : "";
    this.lines.push(indent + line);
  }

  /**
   * Returns the GraphViz dot file as a string.
   */
  toString() {
    return this.lines.join(this.config.pretty ? "\n" : "");
  }
}

/**
 * Convert a simplified tree structure to a GraphViz dot file.
 *
 * Use the results with GraphViz:
 * `dot -Tpng -o output.png input.dot`
 * `dot -Tpng input.dot | imgcat`
 *
 * @param {object[]} data - i.e., [{ relation: "edit", object: "form:form_a", children: [] }]
 * @returns {string} - i.e., 'digraph G { 1 [label="Alice"]; 2 [label="Bob"]; 1 -> 2; }'
 */
export function toDot(data, config) {
  return new Dot(data, config).toString();
}
