var width = 2000,
    height = 1300;

var investor_graph;
const radius_x = 60;
const radius_y = 30;
const min_radius = 20;
const max_radius = 100;
const min_distance = 200;
const step_size = 150;

var nodes = [];
var links = [];
var simulation;

import { initialize_investments, generate_investor_graph } from "../generate_investment_graph.js";

/*  
    investor_graph: {
        investor_a: [
            0: {
                investor: investor_dest,
                num_co_investments: n,
                portfolio_cousins: Set([portfolio_cousin_1, portfolio_cousin_2, ...])
            },
            1: {...}
        ],
        investor_b: {...}
    }
*/
// Generate local graph for test startup and round from investments.csv
d3.csv("/data/investments.csv").then(function (data) {
    initialize_investments(data);
    investor_graph = generate_investor_graph();
    console.log(investor_graph["Y Combinator"]);
    // Generate investor selector table
    intialize();
});

function intialize() {
    // Remove loading
    d3.select("#loading").remove();

    // Generate lead selector table
    const leads = Object.keys(investor_graph);
    d3.select("#lead-selector")
        .selectAll("tr")
        .data(leads)
        .join("tr")
        .append("td")
        .text(function (lead) {
            return lead + " (" + investor_graph[lead].length + ")";
        })
        .on("click", function (e, lead) {
            loadInvestorRecs(lead);
        });

    // Drag / Zoom handler
    let zoom = d3.zoom().on("zoom", handleZoom);
    function handleZoom(e) {
        d3.selectAll("svg g").attr("transform", e.transform);
    }
    d3.select("svg").call(zoom);
}

function loadInvestorRecs(lead) {
    const investor_recs = investor_graph[lead];
    generateLeadGraph(lead, investor_recs);
    // Clear out existing investor recs
    d3.select("#investor-selector").selectAll("tr").remove();
    // Populate new investor recs
    d3.select("#investor-selector")
        .selectAll("tr")
        .data(investor_recs)
        .join("tr")
        .append("td")
        .text(function (investor_obj) {
            return investor_obj.investor + " (" + investor_obj.num_co_investments + ")";
        })
        .on("click", function (e, investor_obj) {
            generateCousinsGraph(lead, investor_obj);
        });
}

function generateLeadGraph(lead, investor_recs) {
    if (nodes.length > 0 && nodes[0].name == lead) {
        // Discard all but lead
        nodes = [copyNode(nodes[0])];
    } else {
        nodes = [];
        nodes.push({ name: lead, type: "lead", count: 2});
    }
    links = [];

    // Compute max number of co-investments
    var max_count = 1;
    for (var i = 0; i < investor_recs.length; i++) {
        const investor_obj = investor_recs[i];
        if (investor_obj.num_co_investments > max_count) {
            max_count = investor_obj.num_co_investments;
        }
    }


    for (var i = 0; i < investor_recs.length; i++) {
        const investor_obj = investor_recs[i];
        const related_investor = investor_obj.investor;
        const count = investor_obj.num_co_investments;
        nodes.push({ name: related_investor, type: "investor", count});
        links.push({
            source: i+1,
            target: 0,
            distance: max_count - count
        });
    }
    runSimulation(true);
}

function copyNode(node) {
    return {
        name: node.name,
        type: node.type,
        count: node.count,
        x: node.x,
        y: node.y
    }
}

function generateCousinsGraph(lead, investor_obj) {
    const portfolio_cousins = investor_obj.portfolio_cousins;
    const investor = investor_obj.investor;

    // Empty all nodes but lead and investor
    const lead_node = copyNode(nodes[0]);
    var investor_node;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].name == investor) {
            investor_node = copyNode(nodes[i]);
        }
    }
    if (investor_node) {
        nodes = [lead_node, investor_node];
    }
    else {
        nodes = [
            { name: lead, type: "lead", count: 2, x: width / 2, y: height / 2 },
            { name: investor, type: "investor", count: investor_obj.num_co_investments, x: width / 2, y: height / 2 }
        ];
    }
    links = [];

    // Generate nodes and links
    var i = 0;
    portfolio_cousins.forEach(function (portfolio_cousin) {
        nodes.push({ name: portfolio_cousin, type: "cousin", x: width / 2, y: height / 2 });
        links.push({
            source: 1,
            target: i+2
        });
        links.push({
            source: 0,
            target: i+2
        });
        i += 1;
    });
    console.log(nodes);
    runSimulation(false);
}

function runSimulation(isLeadGraph) {
    if (isLeadGraph) {
        simulation = d3
            .forceSimulation(nodes)
            .force("charge", d3.forceManyBody().strength(-1000))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("link", d3.forceLink().links(links).distance(function(link) {
                return Math.max((link.distance * step_size) + step_size, min_distance);
            }))
            .force("collision", d3.forceCollide().radius(Math.max(radius_x, radius_y)))
            .on("tick", ticked);
    } else {
        simulation = d3
            .forceSimulation(nodes)
            .force("x", d3.forceX().x(function (node) {
                    if (node.type == "lead") {
                        return 0;
                    } else if (node.type == "investor") {
                        return width;
                    } else {
                        return width / 2;
                    }
                }).strength(0.075)
            )
            .force("y", d3.forceY().y(function (node) {
                if (node.type == "lead" || node.type == "investor" || nodes.length == 3) {
                    return height / 2
                } else {
                    return height * ((node.index - 2) / (nodes.length - 3));
                }
            }).strength(function(node) {
                console.log((nodes.length - 2) / 40);
                return (nodes.length - 2) / 40;
            }))
            .force("link", d3.forceLink().links(links).strength(0.1))
            .on("tick", ticked);
    }

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
        .attr("rx", function (node) {
            if (node.type == "lead" || node.type == "investor") {
                return Math.min(min_radius * node.count, max_radius);
            }
            return radius_x;
        })
        .attr("ry", function (node) {
            if (node.type == "lead" || node.type == "investor") {
                return Math.min(min_radius * node.count, max_radius);
            }
            return 0;
        })
        .attr("fill", function (node) {
            if (node.type == "lead") return "#F1948A";
            else if (node.type == "investor") return "#C39BD3";
            else return "#85C1E9";
        }).on("click", function (e, node) {
            const lead = nodes[0].name;
            console.log(lead);
            if (node.type == "lead") {
                generateLeadGraph(lead, investor_graph[lead]);
            } else if (node.type == "investor") {
                // TODO: Make lookup of investors faster than iteration through whole list
                const lead_investors = investor_graph[lead];
                console.log(node.name);
                for (var i = 0; i < lead_investors.length; i++) {
                    const investor_candidate = lead_investors[i];
                    console.log(investor_candidate);
                    if (investor_candidate.investor == node.name) {
                        generateCousinsGraph(lead, investor_candidate);
                        break;
                    }
                }
                console.log("couldn't find investor");
            }
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
                return d.name;
            });
    }

    function ticked() {
        updateLinks();
        updateNodes();
        updateText();
    }
}
