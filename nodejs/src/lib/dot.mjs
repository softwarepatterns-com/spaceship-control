const operationFillColor = "#d3d3e3";

const createNodeProperties = (options) =>
  Object.entries(options)
    .map(([key, value]) => {
      return `, ${key}="${value}"`;
    }, [])
    .join("");

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
  constructor(data, config = {}) {
    this.config = { pretty: true, indent: 1, ...config };
    this.i = 1;
    this.lines = ["digraph G {"];
    this.level = 1;
    data.forEach((item) => this.addCluster("", item));
    this.level--;
    this.push(`}`);
  }

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

  addLabelNode(label, options) {
    const id = this.i++;
    this.push(`${id} [label="${label}"${createNodeProperties(options)}];`);
    return id;
  }

  addHtmlNode(html, options) {
    const properties = createNodeProperties({
      shape: "plain",
      ...(options || {}),
    });
    const id = this.i++;
    this.push(`${id} [label=<${html}>${properties}];`);
    return id;
  }

  addEdge(from, to, label) {
    if (label) {
      this.push(`${from} -> ${to} [label="${label}"];`);
    } else {
      this.push(`${from} -> ${to};`);
    }
  }

  addNode(node, parentId) {
    const nodeId = this.addHtmlNode(
      createOutlinedListHtml([node.relation, node.object]),
      { color: "black" }
    );

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
      const subjectListId = this.addHtmlNode(
        createOutlinedListHtml(node.subjects, { align: "left" }),
        { color: "none" }
      );

      this.addEdge(nodeId, subjectListId);
    }
  }

  push(line) {
    const indent = this.config.pretty
      ? " ".repeat(this.level * this.config.indent)
      : "";
    this.lines.push(indent + line);
  }

  toString() {
    return this.lines.join(this.config.pretty ? "\n" : "");
  }
}

/**
 *
 * `dot -Tpng -o output.png input.dot`
 * `dot -Tpng input.dot | imgcat`
 *
 * @param {*} data
 * @returns
 */
export function toDot(data, config) {
  return new Dot(data, config).toString();
}
