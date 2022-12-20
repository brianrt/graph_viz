var width = 2000,
    height = 1300;

var investor_graph;
const radius_x = 50;
const radius_y = 50;
const min_radius = 25;
const max_radius = 130;
const min_distance = 200;
const step_size = 150;

// Colors
const lead_main = "#B4C6E4";
const lead_outline = "#87A3D4";
const investor_main = "#02CAA2";
const investor_outline = "#02A282";
const cousin_main = "#F17EA4";
const cousin_outline = "#CA1652";

var nodes = [];
var links = [];
var simulation;

import {
    initialize_investments,
    find_co_investors_before_date,
    generate_round_leads,
    company_to_categories,
    investor_to_categories,
} from "../generate_investment_graph.js";
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
    // console.log(company_to_leads["H2O.ai"]);
    // let investors = find_co_investors_before_date("Nexus Venture Partners", "H2O.ai", "2016-01-04", false, false);
    // console.log(investors);
    // console.log(company_categories);
    // investor_graph = generate_investor_graph();
    // // Generate investor selector table
    intialize();
});

function intialize() {
    const companies = Object.keys(company_to_categories).sort();
    d3.select("#company-search").on("input", function () {
        d3.select("#round-container").style("visibility", "hidden");
        d3.select("#lead-container").style("visibility", "hidden");
        const company_prefix = this.value;
        var search_results = [];
        if (company_prefix.length > 0) {
            const MAX_SEARCH_RESULTS = 100;
            for (var i = 0; i < companies.length; i++) {
                const curr_company = companies[i];
                if (curr_company.toLowerCase().startsWith(company_prefix.toLowerCase())) {
                    search_results.push(curr_company);
                    if (search_results.length > MAX_SEARCH_RESULTS) {
                        break;
                    }
                }
            }
        }
        d3.select("#company-selector")
            .selectAll("tr")
            .data(search_results)
            .join("tr")
            .attr("id", "company-tr")
            .text(function (company) {
                return company;
            })
            .on("click", function (e, company) {
                // Set clicked company and clear results
                search_results = [];
                d3.select("#company-search").property("value", company);
                d3.select("#company-selector").selectAll("tr").data(search_results).join("tr");
                loadFundingRounds(company);
            });
    });

    // // Generate lead selector table
    // const leads = Object.keys(investor_graph);
    // d3.select("#lead-selector")
    //     .selectAll("tr")
    //     .data(leads)
    //     .join("tr")
    //     .append("td")
    //     .text(function (lead) {
    //         return lead + " (" + investor_graph.length + ")";
    //     })
    //     .on("click", function (e, lead) {
    //         loadInvestorRecs(lead);
    //     });

    // Drag / Zoom handler
    let zoom = d3.zoom().on("zoom", handleZoom);
    function handleZoom(e) {
        d3.selectAll("svg g").attr("transform", e.transform);
    }
    d3.select("svg").call(zoom);
}

function loadFundingRounds(company) {
    console.log(company);
    const company_to_leads = generate_round_leads(company);
    const rounds = Object.keys(company_to_leads).sort();
    console.log(company_to_leads);
    d3.select("#round-container").style("visibility", "visible");
    d3.select("#round-selector")
        .selectAll("tr")
        .data(rounds)
        .join("tr")
        .attr("id", "round-tr")
        .text(function (round) {
            return round;
        })
        .on("click", function (e, round) {
            loadLeadSearch(round, company_to_leads[round], company);
        });
}

function loadLeadSearch(round, suggested_lead, company) {
    // Dynamically set lead search top attribute
    const bottom_round = d3.select("#round-container").node().getBoundingClientRect().bottom;
    d3.select("#lead-container")
        .style("visibility", "visible")
        .style("top", bottom_round + 30 + "px");
    d3.select("#lead-search").property("value", "");
    var search_results = [];
    if (suggested_lead) {
        search_results = [suggested_lead + " (Suggested Lead)"];
    }
    d3.select("#lead-selector")
        .selectAll("tr")
        .data(search_results)
        .join("tr")
        .attr("id", "lead-tr")
        .text(function (lead) {
            return lead;
        })
        .on("click", function (e, lead) {
            // Set clicked lead and clear results
            d3.select("#lead-search").property("value", lead);
            d3.select("#lead-selector")
                .selectAll("tr")
                .data([])
                .join("tr");
            loadInvestorRecs(round, suggested_lead, company);
        });
    const leads = Object.keys(investor_to_categories).sort();
    d3.select("#lead-search").on("input", function () {
        const lead_prefix = this.value;
        var search_results = [];
        if (suggested_lead) {
            search_results = [suggested_lead + " (Suggested Lead)"];
        }
        if (lead_prefix.length > 0) {
            const MAX_SEARCH_RESULTS = 100;
            for (var i = 0; i < leads.length; i++) {
                const curr_lead = leads[i];
                if (curr_lead.toLowerCase().startsWith(lead_prefix.toLowerCase())) {
                    search_results.push(curr_lead);
                    if (search_results.length > MAX_SEARCH_RESULTS) {
                        break;
                    }
                }
            }
        }
        d3.select("#lead-selector")
            .selectAll("tr")
            .data(search_results)
            .join("tr")
            .attr("id", "lead-tr")
            .text(function (lead) {
                return lead;
            })
            .on("click", function (e, lead) {
                // Set clicked lead and clear results
                search_results = [];
                d3.select("#lead-search").property("value", lead);
                d3.select("#lead-selector")
                    .selectAll("tr")
                    .data(search_results)
                    .join("tr");
                if (lead.includes(suggested_lead)) {
                    lead = suggested_lead;
                }
                loadInvestorRecs(round, lead, company)
            });
    });
}

function loadInvestorRecs(round, lead, company) {
    // TODO: put last two booleans behind check boxes
    investor_graph  = find_co_investors_before_date(lead, company, round, true, true);

    generateLeadGraph(lead, investor_graph);
    // // Clear out existing investor recs
    // d3.select("#investor-selector").selectAll("tr").remove();
    // // Populate new investor recs
    // d3.select("#investor-selector")
    //     .selectAll("tr")
    //     .data(investor_graph)
    //     .join("tr")
    //     .append("td")
    //     .text(function (investor_obj) {
    //         return investor_obj.investor + " (" + investor_obj.num_co_investments + ")";
    //     })
    //     .on("click", function (e, i) {
    //         generateCousinsGraph(lead, investor_obj);
    //     });
}

function generateLeadGraph(lead, investor_graph) {
    if (nodes.length > 0 && nodes[0].name == lead) {
        // Discard all but lead
        nodes = [copyNode(nodes[0])];
    } else {
        nodes = [];
        nodes.push({ name: lead, type: "lead", count: 2 });
    }
    links = [];

    // Gather all values of num_co_investments
    var counts = new Set();
    for (var i = 0; i < investor_graph.length; i++) {
        const investor_obj = investor_graph[i];
        counts.add(investor_obj.num_co_investments);
    }

    // Map counts to help with normalizing length of edges
    const sortedCounts = Array.from(counts).sort((a, b) => a - b);
    const countMap = {};
    for (var i = 0; i < sortedCounts.length; i++) {
        countMap[sortedCounts[i]] = i + 1;
    }
    const max_count = sortedCounts.length;

    for (var i = 0; i < investor_graph.length; i++) {
        const investor_obj = investor_graph[i];
        const related_investor = investor_obj.investor;
        const count = investor_obj.num_co_investments;
        nodes.push({ name: related_investor, type: "investor", count });
        links.push({
            source: i + 1,
            target: 0,
            distance: max_count - countMap[count],
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
        y: node.y,
    };
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
    } else {
        nodes = [
            { name: lead, type: "lead", count: 2, x: width / 2, y: height / 2 },
            { name: investor, type: "investor", count: investor_obj.num_co_investments, x: width / 2, y: height / 2 },
        ];
    }
    links = [];

    // Generate nodes and links
    var i = 0;
    portfolio_cousins.forEach(function (portfolio_cousin) {
        nodes.push({ name: portfolio_cousin, type: "cousin", x: width / 2, y: height / 2 });
        links.push({
            source: 1,
            target: i + 2,
        });
        links.push({
            source: 0,
            target: i + 2,
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
            .force(
                "link",
                d3
                    .forceLink()
                    .links(links)
                    .distance(function (link) {
                        return Math.max(link.distance * step_size + step_size, min_distance);
                    })
            )
            .force(
                "collision",
                d3.forceCollide().radius(function (node) {
                    return Math.min(min_radius * node.count, max_radius);
                })
            )
            .on("tick", ticked);
    } else {
        simulation = d3
            .forceSimulation(nodes)
            .force(
                "x",
                d3
                    .forceX()
                    .x(function (node) {
                        if (node.type == "lead") {
                            return 0;
                        } else if (node.type == "investor") {
                            return width;
                        } else {
                            return width / 2;
                        }
                    })
                    .strength(0.075)
            )
            .force(
                "y",
                d3
                    .forceY()
                    .y(function (node) {
                        if (node.type == "lead" || node.type == "investor" || nodes.length == 3) {
                            return height / 2;
                        } else {
                            return height * ((node.index - 2) / (nodes.length - 3));
                        }
                    })
                    .strength(function (node) {
                        console.log((nodes.length - 2) / 40);
                        return (nodes.length - 2) / 40;
                    })
            )
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
            return radius_y;
        })
        .attr("fill", function (node) {
            if (node.type == "lead") return lead_main;
            else if (node.type == "investor") return investor_main;
            else return cousin_main;
        })
        .attr("stroke", function (node) {
            if (node.type == "lead") return lead_outline;
            else if (node.type == "investor") return investor_outline;
            else return cousin_outline;
        })
        .on("click", function (e, node) {
            const lead = nodes[0].name;
            console.log(lead);
            if (node.type == "lead") {
                generateLeadGraph(lead, investor_graph);
            } else if (node.type == "investor") {
                // TODO: Make lookup of investors faster than iteration through whole list
                const lead_investors = investor_graph;
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
