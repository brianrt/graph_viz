var width = 2000,
    height = 2000;

var investor_graph;
const min_radius = 20;
const max_radius = 100;
const min_distance = 250;

var name_to_index = {};
var nodes = [];
var links = [];
var simulation;

import { initialize_investments, generate_investor_graph } from "../generate_investment_graph.js";

/*  
    investor_graph: {
        investor_a: [[investor_b: 5], [investor_c: 3],...]
    }
*/
// Generate local graph for test startup and round from investments.csv
d3.csv("/data/investments.csv").then(function (data) {
    initialize_investments(data);
    investor_graph = generate_investor_graph();
    // Generate investor selector table
    intialize();
});

function intialize() {
    // Remove loading
    d3.select("#loading").remove();

    // Generate investor selector table
    const investors = Object.keys(investor_graph);
    d3.select("#investor-selector")
        .selectAll("tr")
        .data(investors)
        .join("tr")
        .append("td")
        .text(function (investor) {
            return investor + ": " + investor_graph[investor].length;
        })
        .on("click", function (e, investor) {
            generateGraph(investor);
        });

    // Drag / Zoom handler
    let zoom = d3.zoom().on("zoom", handleZoom);
    function handleZoom(e) {
        d3.selectAll("svg g").attr("transform", e.transform);
    }
    d3.select("svg").call(zoom);

    // Slider handler
    var link_slider = document.getElementById("link_distance");
    link_slider.oninput = function () {
        const distance_step = parseInt(this.value);
        simulation.force("link", d3.forceLink().links(links).distance(function(link) {
            return Math.max((link.distance * distance_step) + distance_step, min_distance);
        }))
        simulation.alpha(1).restart();
    };
}

function generateGraph(investor) {
    const related_investors = investor_graph[investor];
    const max_count = related_investors[0][1];

    // Empty
    name_to_index = {};
    nodes = [];
    links = [];

    // Generate nodes and links
    nodes.push({ name: "I: " + investor , count: 2});
    for (var i = 0; i < related_investors.length; i++) {
        const related_investor = related_investors[i][0];
        const count = related_investors[i][1];
        nodes.push({ name: "R: " + related_investor, count});
        links.push({
            source: i+1,
            target: 0,
            distance: max_count - count
        });
    }
    runSimulation();
}

function runSimulation() {
    simulation = d3
        .forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-1000))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink().links(links).distance(function(link) {
            return Math.max((link.distance * 150) + 150, min_distance);
        }))
        .force("collision", d3.forceCollide().radius(function (d) {
            return Math.min(min_radius * d.count, max_radius);
        }))
        .on("tick", ticked);

    // Initialize nodes
    d3.select(".nodes")
        .selectAll("ellipse")
        .data(nodes)
        .join("ellipse")
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        })
        .attr("rx", function (d) {
            return Math.min(min_radius * d.count, max_radius);
        })
        .attr("ry", function (d) {
            return Math.min(min_radius * d.count, max_radius);
        })
        .attr("fill", function (d) {
            const first_letter = d.name.substring(0, 1);
            if (first_letter == "I") return "#F1948A";
            else return "#85C1E9";
        });

    function updateLinks() {
        d3.select(".links")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("x1", function (d) {
                return d.source.x;
            })
            .attr("y1", function (d) {
                return d.source.y;
            })
            .attr("x2", function (d) {
                return d.target.x;
            })
            .attr("y2", function (d) {
                return d.target.y;
            });
    }

    function updateNodes() {
        d3.select(".nodes")
            .selectAll("ellipse")
            .data(nodes)
            .join("ellipse")
            .attr("cx", function (d) {
                return d.x;
            })
            .attr("cy", function (d) {
                return d.y;
            });
    }

    function updateText() {
        d3.select(".texts")
            .selectAll("text")
            .data(nodes)
            .join("text")
            .attr("x", function (d) {
                return d.x;
            })
            .attr("y", function (d) {
                return d.y;
            })
            .text(function (d) {
                return d.name.substring(3);
            });
    }

    function ticked() {
        updateLinks();
        updateNodes();
        updateText();
    }
}
