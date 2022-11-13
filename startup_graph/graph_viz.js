var width = 2000,
    height = 2000;

var name_to_index = {};
var nodes = [];
var links = [];
var local_graphs;
var simulation;

import { initialize_investments, generate_local_graphs } from "../generate_investment_graph.js";

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
// Generate local graph for test startup and round from investments.csv
d3.csv("/data/investments.csv").then(function (data) {
    initialize_investments(data);
    local_graphs = generate_local_graphs();
    // Generate company selector table
    intialize();
});

function intialize() {
    // Remove loading
    d3.select("#loading").remove();

    // Generate company selector table
    const companies = Object.keys(local_graphs);
    d3.select("#company-selector")
        .selectAll("tr")
        .data(companies)
        .join("tr")
        .append("td")
        .text(function (d) {
            return d;
        })
        .on("click", function (e, company) {
            loadFundingRounds(company);
        });

    // Drag / Zoom handler
    let zoom = d3.zoom().on("zoom", handleZoom);
    function handleZoom(e) {
        d3.selectAll("svg g").attr("transform", e.transform);
    }
    d3.select("svg").call(zoom);

    // Slider handler
    var node_slider = document.getElementById("node_strength");
    node_slider.oninput = function () {
        var node_strength = -10 * this.value;
        simulation.force("charge", d3.forceManyBody().strength(node_strength));
        simulation.alpha(1).restart();
    };
}

function loadFundingRounds(company) {
    const round_dates = Object.keys(local_graphs[company]).sort();
    const round_sizes = round_dates.map((round_date) => {
        return Object.keys(local_graphs[company][round_date].portfolio_cousins_investors).length;
    });
    // Clear out existing rounds
    d3.select("#round-selector").selectAll("tr").remove();
    // Populate new rounds
    d3.select("#round-selector")
        .selectAll("tr")
        .data(round_dates)
        .join("tr")
        .append("td")
        .text(function (d, i) {
            return d + " (" + round_sizes[i] + ")";
        })
        .on("click", function (e, round_date) {
            generateGraph(company, round_date);
        });
}

function generateGraph(company, round_date) {
    const local_graph = local_graphs[company][round_date];
    // Empty
    name_to_index = {};
    nodes = [];
    links = [];

    // Generate nodes and name_to_index mappings
    nodes.push({ name: "S: " + company });
    nodes.push({ name: "L: " + local_graph.lead_investor });
    name_to_index[company] = 0;
    name_to_index[local_graph.lead_investor] = 1;

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
    runSimulation();
}

function runSimulation() {
    simulation = d3
        .forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-1000))
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
        .attr("ry", 50)
        .attr("fill", function (d) {
            const first_letter = d.name.substring(0, 1);
            if (first_letter == "S") return "#F1948A";
            else if (first_letter == "L") return "#C39BD3";
            else if (first_letter == "C") return "#82E0AA";
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
