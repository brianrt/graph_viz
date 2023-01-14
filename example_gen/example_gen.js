const radius_x = 50;
const radius_y = 50;
const min_radius = 25;
const max_radius = 130;
const delta_radius = 7;
const min_distance = 220;
const step_size = 140;
const hover_count = 6;

// Colors
const lead_main = "#B4C6E4";
const lead_outline = "#87A3D4";
const investor_match_main = "#02CAA2";
const investor_match_outline = "#02A282";
const investor_no_match_main = "#A6FEEC";
const investor_no_match_outline = "#02CAA2";
const cousin_main = "#F17EA4";
const cousin_outline = "#CA1652";

var simulation;
var investor_graph;
var actual_investors;
var nodes = [];
var links = [];
var width;
var height;
var filter_cousins = false;
var filter_investors = false;
var company_to_round_bottom = {};
var company_to_lead_bottom = {};
var company_to_filter_bottom = {};
var is_cousin_graph = false;

import {
    initialize_investments,
    find_co_investors_before_date,
    find_co_investors_for_multiple_investors,
    generate_round_leads,
    company_to_categories,
    company_to_round_investors,
    investor_to_categories
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
    intialize();
});

function intialize() {
    const companies = Object.keys(company_to_categories).sort();
    d3.select("#company-search").on("input", function () {
        d3.select("#round-container").style("visibility", "hidden");
        d3.select("#lead-container").style("visibility", "hidden");
        d3.select("#filter-container").style("visibility", "hidden");
        d3.select("#actual-investors-container").style("visibility", "hidden");
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

    // Drag / Zoom handler
    let zoom = d3.zoom().on("zoom", handleZoom);
    function handleZoom(e) {
        d3.selectAll("svg g").attr("transform", e.transform);
    }
    d3.select("svg").call(zoom);
}

function loadFundingRounds(company) {
    const company_to_leads = generate_round_leads(company);
    const rounds = Object.keys(company_to_leads).sort();
    d3.select("#company-industry").text(company + " Industries:");
    d3.select("#industries")
        .selectAll("li")
        .data(Array.from(company_to_categories[company]))
        .join("li")
        .text(function (industry) {
            return industry
        });
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
            // Highlight Selected
            d3.select("#round-selector").selectAll("tr").style("background-color","white");
            d3.select(this).style("background-color","lightgray");
            loadLeadSearch(round, company_to_leads[round], company);
        });
}

function loadLeadSearch(round, suggested_lead, company) {
    // Dynamically set lead search top attribute
    if (!(company in company_to_round_bottom)) {
        company_to_round_bottom[company] = d3.select("#round-container").node().getBoundingClientRect().bottom;
    }
    const round_bottom = company_to_round_bottom[company];
    d3.select("#lead-container")
        .style("visibility", "visible")
        .style("top", round_bottom + 30 + "px");
    d3.select("#lead-search").property("value", "");
    // Hide everything below Leads
    d3.select("#filter-container").style("visibility", "hidden");
    d3.select("#actual-investors-container").style("visibility", "hidden");
    var search_results = [];
    if (suggested_lead) {
        search_results = [suggested_lead + " (Suggested Lead)"];
    }
    populateLeadSelector(suggested_lead, search_results, round, company);
    const leads = Object.keys(investor_to_categories).sort();
    d3.select("#lead-search").on("input", function () {
        // Hide everything below Leads
        d3.select("#filter-container").style("visibility", "hidden");
        d3.select("#actual-investors-container").style("visibility", "hidden");
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
        populateLeadSelector(suggested_lead, search_results, round, company);
    });
}

function populateLeadSelector(suggested_lead, search_results, round, company) {
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
            if (suggested_lead && lead.includes(" (Suggested Lead)")) {
                lead = suggested_lead;
            }
            loadInvestorRecs(round, lead, company);
        });
}

function loadInvestorRecs(round, lead, company) {
    const response = find_co_investors_before_date(lead, company, round, filter_cousins, filter_investors);
    // const response2 = find_co_investors_for_multiple_investors(["Y Combinator", "Intel Capital", "BEV Capital"], company, round, filter_cousins, filter_investors);
    investor_graph = response.co_investors;
    // Load actual investors in round
    d3.select("#company-round").text(company + " Investors on " + round + ":");
    actual_investors = company_to_round_investors[company][round];
    loadActualInvestors(actual_investors, lead);
    arrangeLayout(response, company);
    generateLeadGraph(lead, investor_graph);
    // Update graph when category filter checkboxes modified
    d3.selectAll(".filter_category").on("input", function () {
        const type = this.value;
        const checked = d3.select(this).property("checked");
        if (type == "filter_cousins") {
            filter_cousins = checked;
        } else {
            filter_investors = checked;
        }
        const response = find_co_investors_before_date(lead, company, round, filter_cousins, filter_investors);
        investor_graph = response.co_investors;
        loadActualInvestors(actual_investors, lead);
        generateLeadGraph(lead, investor_graph);
    });
    // Update graph when slider is modified
    d3.select("#investors-shown")
        .on("input", function() {
            generateLeadGraph(lead, investor_graph);
        });
}

function loadActualInvestors(actual_investors, lead) {
    const investor_recs = new Set(investor_graph.map(obj => obj.investor));
    d3.select("#actual-investors")
        .selectAll("li")
        .data(actual_investors)
        .join("li")
        .text(function (investor) {
            return investor
        })
        .style("color", function(investor) {
            if (investor == lead) {
                return "green";
            } else {
                if (investor_recs.has(investor)) {
                    return "green";
                }
            }
        });
}

function arrangeLayout(response, company){
    // Move container to left
    d3.selectAll(".center").classed("center", false);
    // Compute height for checkbox and unhide
    if (!(company in company_to_lead_bottom)) {
        company_to_lead_bottom[company] = d3.select("#lead-container").node().getBoundingClientRect().bottom;
    }
    const lead_bottom = company_to_lead_bottom[company];
    d3.select("#filter-container")
        .style("visibility", "visible")
        .style("top", lead_bottom + 30 + "px");
    // Set filtered numbers
    d3.select("#filter_title").text("Matching Industry Filter (" + response.no_filter.size + ")");
    d3.select("#filter_cousins").text(" Filter Cousins (" + response.filtered_cousins.size + ")");
    d3.select("#filter_investors").text(" Filter Investors (" + response.filtered_investors.size + ")");
    // Display actual investors in round
    if (!(company in company_to_filter_bottom)) {
        company_to_filter_bottom[company] = d3.select("#filter-container").node().getBoundingClientRect().bottom;
    }
    const filter_bottom = company_to_filter_bottom[company];
    d3.select("#actual-investors-container")
        .style("visibility", "visible")
        .style("top", filter_bottom + "px");
    // Compute size and position of svg
    const container_right = d3.select(".container").node().getBoundingClientRect().right;
    width = window.innerWidth - container_right;
    height = window.innerHeight;
    d3.select("svg")
        .attr("width", width - 30)
        .attr("height", height - 30)
        .style("left", container_right + 30 + "px")
}

function generateLeadGraph(lead, investor_graph_input) {
    is_cousin_graph = false;
    nodes = [];
    nodes.push({ name: lead, type: "lead", count: hover_count, is_hover: false });
    links = [];

    // Splice array based on num_investors_to_show
    let num_investors_to_show = d3.select("#investors-shown").property("value");
    if (num_investors_to_show == '' || num_investors_to_show < 0) {
        num_investors_to_show = 0;
    }
    let investor_graph = [...investor_graph_input];
    investor_graph.splice(num_investors_to_show, investor_graph.length - num_investors_to_show);

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
        nodes.push({ name: related_investor, type: "investor", count, is_hover: false });
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
    is_cousin_graph = true;
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
            { name: investor, type: "investor", count: investor_obj.num_co_investments, x: width / 2, y: height / 2, is_hover: true },
        ];
    }
    links = [];

    // Generate nodes and links
    var i = 0;
    portfolio_cousins.forEach(function (portfolio_cousin) {
        nodes.push({ name: portfolio_cousin, type: "cousin", count: 2, x: width / 2, y: height / 2 });
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
                    let count = node.count;
                    if (node.is_hover) {
                        count = hover_count;
                    }
                    return min_radius + (delta_radius * (count-1));
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
        .attr("fill", function (node) {
            if (node.type == "lead") return lead_main;
            else if (node.type == "investor") {
                if (actual_investors.has(node.name)) {
                    return investor_match_main;
                } else {
                    return investor_no_match_main;
                }
            }
            else return cousin_main;
        })
        .attr("stroke", function (node) {
            if (node.type == "lead") return lead_outline;
            else if (node.type == "investor") {
                if (actual_investors.has(node.name)) {
                    return investor_match_outline;
                } else {
                    return investor_no_match_outline;
                }
            }
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
                    if (investor_candidate.investor == node.name) {
                        generateCousinsGraph(lead, investor_candidate);
                        break;
                    }
                }
            }
        }).on("mouseover", function(e, node) {
            if (node.type == "investor") {
                console.log(simulation.alpha());
                console.log(simulation.alphaTarget());
                node.is_hover = true;
                if (!is_cousin_graph) {
                    simulation.alpha(0.05).restart();
                    simulation.force("collision").initialize(nodes);
                }
            }
        }).on("mouseout", function(e, node) {
            if (node.type == "investor") {
                node.is_hover = false;
                if (!is_cousin_graph) {
                    simulation.alpha(0.05).restart();
                    simulation.force("collision").initialize(nodes);
                }
            }
        })
        ;

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

    function updateRadius(node, radius) {
        if (node.type == "lead" || node.type == "investor") {
            let count = node.count;
            if (is_cousin_graph || node.is_hover) {
                count = Math.max(count, hover_count);
            }
            return (min_radius + (delta_radius * (count-1)));
        }
        return radius;
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
            })
            .transition().duration('40')
            .attr("rx", function (node) {
                return updateRadius(node, radius_x);
            })
            .attr("ry", function (node) {
                return updateRadius(node, radius_y);
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
                return d.y+3;
            })
            .attr("pointer-events", "none")
            .text(function (d) {
                var count = d.count;
                if (d.is_hover) {
                    count = Math.max(hover_count + 2, count);
                }
                let sub_length = 5 + (2 * (count - 1));
                const str_length = d.name.length;
                if (d.type == "cousin") {
                    sub_length = 12;
                } else if (is_cousin_graph) {
                    sub_length = str_length;
                }
                if (str_length > sub_length) {
                    return d.name.substring(0,sub_length) + "...";
                }
                return d.name;
            });
    }

    function ticked() {
        updateLinks();
        updateNodes();
        updateText();
    }
}
