var width = 2000,
    height = 2000;

var name_to_index = {};
var nodes = [];
var links = [];

var test_startup = "0-6.com"; //try: 0-6.com, 2008-03-19 | cloud.IQ, 2012-02-01 | Brick2Click, 2011-05-30
var test_round = "2008-03-19";

import { initialize_investments, generate_local_graphs } from "./generate_investment_graph.js";

/*  
    local_graphs = {
        company_a: {
            2008-03-19: {
                lead_investor: investor_a,
                portfolio_cousins_investors: {
                    portfolio_cousin_1: [ investor_b, investor_c, ... ],
                    portfolio_cousin_2: [ investor_d, investor_e, ... ]
                }
            },
            2010-05-11: {...},
            ...
        },
        company_b: {...}
    }
*/
// Generate local graph for test startup and round
d3.csv("/data/investments.csv").then(function (data) {
    initialize_investments(data);
    const local_graphs = generate_local_graphs();
    const local_graph = local_graphs[test_startup][test_round];
    console.log(local_graph);
    nodes.push({ name: "S: " + test_startup });
    nodes.push({ name: "L: " + local_graph.lead_investor });
    name_to_index[test_startup] = 0;
    name_to_index[local_graph.lead_investor] = 1;

    // Generate nodes and name_to_index mappings
    var i = 2;
    for (const portfolio_cousin in local_graph.portfolio_cousins_investors) {
        if (!(portfolio_cousin in name_to_index)) {
            nodes.push({ name: "C: " + portfolio_cousin });
            name_to_index[portfolio_cousin] = i++;
        }
        const investors = local_graph.portfolio_cousins_investors[portfolio_cousin];
        for (const investors_index in investors) {
            const investor = investors[investors_index];
            if (!(investor in name_to_index)) {
                nodes.push({ name: "I: " + investor });
                name_to_index[investor] = i++;
            }
        }
    }

    // Generate links
    const start_up_index = 0;
    const lead_investor_index = 1;
    links.push({
        source: start_up_index,
        target: lead_investor_index,
    });

    for (const portfolio_cousin in local_graph.portfolio_cousins_investors) {
        const portfolio_cousin_index = name_to_index[portfolio_cousin];
        links.push({
            source: lead_investor_index,
            target: portfolio_cousin_index,
        });
        const investors = local_graph.portfolio_cousins_investors[portfolio_cousin];
        for (const investors_index in investors) {
            const investor = investors[investors_index];
            links.push({
                source: portfolio_cousin_index,
                target: name_to_index[investor],
            });
        }
    }

    // Run simulation
    runSimulation();
});

function runSimulation() {
    var simulation = d3
        .forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-1100))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink().links(links).strength(0.1))
        .force("collision", d3.forceCollide().radius(80))
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
        .attr("rx", 80)
        .attr("ry", 80);

    // Drag / Zoom handler
    let zoom = d3.zoom().on("zoom", handleZoom);
    function handleZoom(e) {
        d3.selectAll("svg g").attr("transform", e.transform);
    }
    d3.select("svg").call(zoom);

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
