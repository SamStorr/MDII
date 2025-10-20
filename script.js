d3.csv("method_sunburst_data.csv").then(data => {
  const dataMap = new Map(data.map(d => [d.name, {
    name: d.name,
    description: d.description,
    children: []
  }]));

  let start = null;

  let zoomDirection = "down";
let lastDepth = 0;

  data.forEach(d => {
    if (d.name === "MDII") {
      start = dataMap.get(d.name);
    } else {
      const parent = dataMap.get(d.parent);
      if (parent) {
        parent.children.push(dataMap.get(d.name));
      }
    }
  });

function cleanLeaves(node) {
  if (!node.children || node.children.length === 0) {
    node.value = 1;
    delete node.children;
  } else {
    node.children.forEach(cleanLeaves);
  }
}

  cleanLeaves(start);

  const hierarchy = d3.hierarchy(start).sum(d => d.value);

  var root = d3.partition()
      .size([2 * Math.PI, hierarchy.height + 1])
    (hierarchy);
  root.each(d => d.current = d);

const width = 928;
  const height = width;
  const radius = width / 14;
  
  // Create the color scale.
  const baseColors = ["#591FD5", "#067A42", "#37CFFF"];
const color = d3.scaleOrdinal().range(baseColors);

function getOpacityByDepth(depth) {
  const maxOpacity = 1;
  const decay = 0.2; // Opacity decreases by this amount per level
  return Math.max(0.2, maxOpacity - depth * decay); // Don't go below 0.2
}


// Create the arc generator.
  const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 5)
  .innerRadius (d => {
    const node = d.current || d;
    const y0 = node.y0;
    //const innerRadius = (y0 < 2) ? (y0 + 1) * radius : (y0 + 2) * radius 
    const innerRadius = (zoomDirection === "down" ? y0 < 2: y0 <= 1) ? (y0 + 1) * radius : (y0 + 2) * radius 
    return innerRadius
  })
  .outerRadius(d => {
    const node = d.current || d;
    const y0 = node.y0;
    const y1 = node.y1;
    const thickness = (y0 <= 2) ? (y1 - y0) * 3 * radius : (y1 - y0 + 2) * radius;
    return y0 * radius + thickness - 1;
  });

  // Create the SVG container.
  const svg = d3.select("#method_sunburst")
      .attr("viewBox", [-width / 2, -height / 2, width, width])
      .style("font", "10px sans-serif");

  // Append the arcs.
  const path = svg.append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
      .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
      .attr("fill-opacity", d => arcVisible(d.current) ? getOpacityByDepth(d.depth) : 0)
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
      .attr("d", d => arc(d.current))
      .on("mouseover", function(event, d) {
      const currentOpacity = parseFloat(d3.select(this).attr("fill-opacity")) || 1;
      if (d.depth != 4){d3.select(this).attr("fill-opacity", Math.max(0, currentOpacity + 0.2));}
    })
    .on("mouseout", function(event, d) {
      const currentOpacity = parseFloat(d3.select(this).attr("fill-opacity")) || 0;
      if (d.depth != 4){d3.select(this).attr("fill-opacity", Math.max(0, currentOpacity - 0.2));}
    });

  // Make them clickable if they have children.
  path.filter(d => d.children)
      .style("cursor", "pointer")
      .on("pointerdown", clicked);

      path.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join(" > ")}`);

const label = svg.append("g")
  .attr("pointer-events", "none")
  .attr("text-anchor", "middle")
  .attr("class", "label")
  .selectAll("text")
  .data(root.descendants().slice(1))
  .join("text")
    .attr("fill-opacity", d => +labelVisible(d.current))
    .text(d => d.data.name)
    .call(wrap, 160)
    .attr("transform", d => labelTransform(d))


  const parent = svg.append("circle")
  .datum(root)
  .attr("r", radius * 2)
  .attr("fill-opacity", 0)
  .style("cursor", "pointer")
  .attr("pointer-events", "all")
  .on("pointerdown", clicked);
      
const centerLabel = svg.append("text")
    .attr("text-anchor", "middle")
    //.attr("dy", "0.35em")
    .attr("class", "center-label")
    .text(root.data.name)
    .call(wrap, 200)

updateDetails(root);


  // Handle zoom on click.
  function clicked(event, p) {
    
    // Determine zoom direction
  if (p.depth > lastDepth) {
    zoomDirection = "down";
  } else if (p.depth < lastDepth) {
    zoomDirection = "up";
  } else {
    zoomDirection = "same"; // optional, if clicking on the same level
  }

  // Update lastDepth for next click
  lastDepth = p.depth;
    
    parent.datum(p.parent || root)

    const anc = p.ancestors()

const breadcrumbDiv = d3.select(".breadcrumb");
const ancestors = p.ancestors().reverse()
ancestors.pop()


breadcrumbDiv.selectAll("button")
  .data(ancestors)
  .join(
    enter => enter.append("button")
      .text(d => d.data.name)
      .style("padding", "4px 8px")
      .style("cursor", "pointer")
      .on("click", (event, d) => clicked(event, d)), // Zoom to clicked ancestor
    update => update.text(d => d.data.name),
    exit => exit.remove()
  );

    centerLabel.text(p.data.name).call(wrap, 200);

    updateDetails(p);

    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });


const t = svg.transition().duration(event.altKey ? 7500 : 750);

path.attr("fill-opacity", d => arcVisible(d.target) ? getOpacityByDepth(d.depth) : 0)
.filter(function(d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })

    path.transition(t)
        .tween("data", d => {
          const i = d3.interpolate(d.current, d.target);
          return t => d.current = i(t);
        })
        .attrTween("d", d => () => arc(d.current))
        .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none") 
        

    label.filter(function(d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      }).transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current));
    }
  
  function arcVisible(d) {
    return d.y1 <= 5 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 2 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

function labelTransform(d) {
  const angle = (d.x0 + d.x1) / 2;
  const radiusPos = (d.y0 + d.y1) * radius;

  const x = Math.sin(angle) * radiusPos;
  let y = -Math.cos(angle) * radiusPos;


  return `translate(${x},${y})`;
}

function wrap(text, width) {
  text.each(function() {
    const textEl = d3.select(this);
    const words = textEl.text().split(/\s+/).reverse();
    let word;
    let line = [];
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const y = textEl.attr("y") || 0;
    const x = textEl.attr("x") || 0;
    let tspan = textEl.text(null)
      .append("tspan")
      .attr("x", x)
      .attr("y", y)
      .attr("dy", 0 + "em");
      
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width && line.length > 1) {
  line.pop();
  tspan.text(line.join(" "));
  line = [word];
  tspan = textEl.append("tspan")
    .attr("x", x)
    .attr("y", y)
    .attr("dy", ++lineNumber * lineHeight + "em")
    .text(word);
}
    }
  });
}

function updateDetails(node) {
  const col2 = d3.select(".details");

  // Clear previous content
  col2.html("");

  // Add current node name
  col2.append("div")
  .attr("class", "details_heading")
  .text(node.data.name);

  // 👉 Add depth-based label
  const depthLabels = {
    0: "Megagroups:",
    1: "Dimensions:",
    2: "Subdimensions:",
    3: "Indicators:"
  };

  const label = depthLabels[node.depth];
  if (label) {
    col2.append("div")
      .attr("class", "details_depth")
      .text(label);
  }

  // Add immediate children details
  if (node.children && node.children.length > 0) {
    const list = col2.append("div").attr("style", "details_children");

    node.children.forEach(child => {
      list.append("div")
        .attr("class", "details_child")
        .html(`<details><summary><strong>${child.data.name}</strong></summary><p>${child.data.description}</p></details>`);
    });
  } else {
    col2.append("p").text("");
  }
}

  return svg.node();

});