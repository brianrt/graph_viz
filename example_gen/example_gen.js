const radius_x = 50;
const radius_y = 50;
const min_radius = 25;
const max_radius = 60;
const hover_radius = 70;
const delta_radius = 3;
const min_distance = 220;
const step_size = 100;
const hover_count = 6;

// Colors
const lead_main = "#B4C6E4";
const lead_outline = "#87A3D4";
const investor_no_match_main = "#A6FEEC";
const investor_no_match_outline = "#02CAA2";
const cousin_main = "#F17EA4";
const cousin_outline = "#CA1652";

var simulation;
var investor_graph;
var nodes = [];
var links = [];
var width;
var height;
var filter_cousins = false;
var filter_investors = false;
var is_cousin_graph = false;
var selected_investors = [];
var selected_categories = [];
var filters = new Set();
var prev_months = 48;

import {
    company_to_categories,
    company_to_investors,
    investor_to_companies,
    organization_to_cb_url,
    find_co_investors_for_multiple_investors,
    initialize_investments,
    all_categories,
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
d3.csv("/data/bulk_export/investments.csv").then(function (investments_data) {
    d3.csv("/data/bulk_export/funding_rounds.csv").then(function (funding_rounds_data) {
        d3.csv("/data/bulk_export/organizations_cleaned.csv").then(function (organizations_data) {
            d3.csv("/data/bulk_export/investors.csv").then(function (investors_data) {
                console.log("loading...");
                initialize_investments(investments_data, funding_rounds_data, organizations_data, investors_data);
                console.log("Finished loading");
                intialize();
            });
        });
    });
});

function intialize() {
    const companies = Object.keys(company_to_investors).sort();
    // const companies = ["OneThree BioTech"];
    d3.select("#company-search").on("input", function () {
        d3.select("#not-company-search").style("visibility", "hidden");
        const company_prefix = this.value;
        var search_results = searchResults(company_prefix, companies);
        d3.select("#company-selector")
            .selectAll("tr")
            .data(search_results)
            .join("tr")
            .classed("dropdown", true)
            .attr("id", "company-tr")
            .text(function (company) {
                return company;
            })
            .on("click", function (e, company) {
                // Set clicked company and clear results
                search_results = [];
                d3.select(".center").classed("center", false);
                d3.select("#not-company-search").style("visibility", "visible");
                d3.select("#company-search").property("value", company);
                d3.select("#company-selector").selectAll("tr").data(search_results).join("tr");
                loadInvestorSelector(company);
                loadCategorySelector(company);
                initializeFilters();
                loadInvestorRecs();
                initializeExportToCSV();
            });
    });

    // Drag / Zoom handler
    let zoom = d3.zoom().on("zoom", handleZoom);
    function handleZoom(e) {
        d3.selectAll("svg g").attr("transform", e.transform);
    }
    d3.select("svg").call(zoom);
}

function initializeExportToCSV() {
    d3.select("#export-to-csv").on("click", function () {
        let num_investors_to_show = d3.select("#investors-shown").property("value");
        if (num_investors_to_show == "" || num_investors_to_show < 0) {
            num_investors_to_show = 0;
        }
        let csv_string = "investor,input_investors\n";
        for (var i = 0; i < Math.min(investor_graph.length, num_investors_to_show); i++) {
            const row = investor_graph[i];
            const investor = row.investor;
            const input_investors = row.input_investors.join("|");
            csv_string += investor + "," + input_investors + "\n";
        }
        navigator.clipboard.writeText(csv_string);
    });
}

function computeSVGBounds() {
    // Compute size and position of svg
    const container_right = d3.select("#bounding-container").node().getBoundingClientRect().right;
    width = window.innerWidth - container_right;
    height = window.innerHeight;
    d3.select("svg")
        .attr("width", width - 30)
        .attr("height", height - 30)
        .style("left", container_right + 30 + "px");
}

function searchResults(prefix, search_array) {
    var search_results = [];
    if (prefix.length > 0) {
        const MAX_SEARCH_RESULTS = 100;
        for (var i = 0; i < search_array.length; i++) {
            const curr_elem = search_array[i];
            if (curr_elem.toLowerCase().startsWith(prefix.toLowerCase())) {
                search_results.push(curr_elem);
                if (search_results.length > MAX_SEARCH_RESULTS) {
                    break;
                }
            }
        }
    }
    return search_results;
}

function loadTableData(id, data, css_class) {
    return d3
        .select("#" + id)
        .selectAll("tr")
        .data(data)
        .join("tr")
        .classed(css_class, true)
        .attr("id", id + "-tr")
        .text(function (element) {
            return element;
        });
}

// ######### Investor Selector #########
function loadSelectedInvestorsTable() {
    loadTableData("selected-investors", selected_investors, "selections").on("click", function (e, investor_to_remove) {
        selected_investors = selected_investors.filter(function (value) {
            return value != investor_to_remove;
        });
        loadInvestorRecs();
    });
}

function loadInvestorSelector(company) {
    selected_investors = Array.from(company_to_investors[company]);
    const investors = Object.keys(investor_to_companies).sort();
    // Populate investors
    loadSelectedInvestorsTable();

    // Search investors
    d3.select("#investors-search").on("input", function () {
        const investor_prefix = this.value;
        if (investor_prefix == "") {
            search_results = [];
            d3.select("#selected-investors").style("display", null);
            d3.select("#investors-selector").selectAll("tr").data(search_results).join("tr");
        } else {
            // Hide selected results
            d3.select("#selected-investors").style("display", "none");
            var search_results = searchResults(investor_prefix, investors);
            loadTableData("investors-selector", search_results, "dropdown").on("click", function (e, investor) {
                // Set clicked company and clear results
                search_results = [];
                d3.select("#selected-investors").style("display", null);
                d3.select("#investors-search").property("value", "");
                d3.select("#investors-selector").selectAll("tr").data(search_results).join("tr");
                // Append to selected-investors
                if (!selected_investors.includes(investor)) {
                    selected_investors.push(investor);
                    loadSelectedInvestorsTable();
                    loadInvestorRecs();
                }
            });
        }
    });
}

// ######### Category Selector #########
function loadSelectedCategoryTable() {
    loadTableData("selected-categories", selected_categories, "selections").on(
        "click",
        function (e, category_to_remove) {
            selected_categories = selected_categories.filter(function (value) {
                return value != category_to_remove;
            });
            loadInvestorRecs();
            loadTableData("selected-categories", selected_categories, "selections");
        }
    );
}

function loadCategorySelector(company) {
    selected_categories = company_to_categories[company];
    const categories = Array.from(all_categories).sort();
    // Populate categories
    loadSelectedCategoryTable();

    // Search categories
    d3.select("#categories-search").on("input", function () {
        const category_prefix = this.value;
        if (category_prefix == "") {
            search_results = [];
            d3.select("#selected-categories").style("display", null);
            d3.select("#categories-selector").selectAll("tr").data(search_results).join("tr");
        } else {
            // Hide selected results
            d3.select("#selected-categories").style("display", "none");
            var search_results = searchResults(category_prefix, categories);
            loadTableData("categories-selector", search_results, "dropdown").on("click", function (e, category) {
                // Set clicked company and clear results
                search_results = [];
                d3.select("#selected-categories").style("display", null);
                d3.select("#categories-search").property("value", "");
                d3.select("#categories-selector").selectAll("tr").data(search_results).join("tr");
                // Append to selected-categories
                if (!selected_categories.includes(category)) {
                    selected_categories.push(category);
                    loadInvestorRecs();
                }
                loadSelectedCategoryTable();
            });
        }
    });
}

function loadInvestorRecs() {
    const response = find_co_investors_for_multiple_investors(
        selected_investors,
        selected_categories,
        prev_months,
        filter_cousins,
        filter_investors,
        filters
    );
    investor_graph = response.co_investors;
    setCategoryFilterCounts(response);
    setSelectedInvestorCounts(response.input_investor_counts);
    generateLeadGraph(investor_graph);
    // Update graph when num investors is modified
    d3.select("#investors-shown").on("input", function () {
        generateLeadGraph(investor_graph);
    });
    // Update graph when prev months is modified
    d3.select("#prev-months").on("input", function () {
        prev_months = d3.select("#prev-months").property("value");
        if (prev_months == "" || prev_months < 0) {
            prev_months = 0;
        }
        const response = find_co_investors_for_multiple_investors(
            selected_investors,
            selected_categories,
            prev_months,
            filter_cousins,
            filter_investors,
            filters
        );
        investor_graph = response.co_investors;
        setCategoryFilterCounts(response);
        setSelectedInvestorCounts(response.input_investor_counts);
        generateLeadGraph(investor_graph);
    });
}

function setCategoryFilterCounts(response) {
    // Set filtered numbers
    d3.select("#category-title").text("Matching Industry Filter (" + response.no_filter.size + ")");
    d3.select("#filter_cousins").text(" Filter Cousins (" + response.filtered_cousins.size + ")");
    d3.select("#filter_investors").text(" Filter Investors (" + response.filtered_investors.size + ")");
}

function setSelectedInvestorCounts(input_investor_counts) {
    d3.select("#selected-investors")
        .selectAll("tr")
        .data(selected_investors)
        .join("tr")
        .text(function (investor) {
            return investor + " (" + input_investor_counts[investor] + ")";
        });
}

function initializeFilters() {
    // Update graph when category filter checkboxes modified
    d3.selectAll(".filter_investor").on("input", function () {
        filters = new Set();
        filter_cousins = false;
        filter_investors = false;
        // Loop through all checked boxes / radio buttons and set filters and booleans
        d3.selectAll(".filter_investor:checked").each(function () {
            const type = this.value;
            if (type == "filter_cousins") {
                filter_cousins = true;
            } else if (type == "filter_investors") {
                filter_investors = true;
            } else {
                filters.add(type);
            }
        });
        const response = find_co_investors_for_multiple_investors(
            selected_investors,
            selected_categories,
            prev_months,
            filter_cousins,
            filter_investors,
            filters
        );
        investor_graph = response.co_investors;
        setCategoryFilterCounts(response);
        setSelectedInvestorCounts(response.input_investor_counts);
        generateLeadGraph(investor_graph);
    });
}

function computeLeadPos(i) {
    let rad = Math.min(width, height) / 3;
    const n = selected_investors.length;
    if (n == 1) {
        rad = 0;
    }
    const x_pos = rad * Math.cos(((2 * Math.PI) / n) * i) + width / 2;
    const y_pos = rad * Math.sin(((2 * Math.PI) / n) * i) + height / 2;
    return [x_pos, y_pos];
}

function generateLeadGraph(investor_graph_input) {
    computeSVGBounds();
    is_cousin_graph = false;
    nodes = [];
    const lead_name_to_index = {};
    // Add input nodes as leads and compute initial positions
    for (var i = 0; i < selected_investors.length; i++) {
        const lead = selected_investors[i];
        const [x_pos, y_pos] = computeLeadPos(i);
        nodes.push({ name: lead, type: "lead", count: hover_count, is_hover: false, x: x_pos, y: y_pos });
        lead_name_to_index[lead] = i;
    }

    // Splice array based on num_investors_to_show
    let num_investors_to_show = d3.select("#investors-shown").property("value");
    if (num_investors_to_show == "" || num_investors_to_show < 0) {
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
    links = [];
    for (var i = 0; i < investor_graph.length; i++) {
        const investor_obj = investor_graph[i];
        const related_investor = investor_obj.investor;
        const input_investors = investor_obj.input_investors;
        const count = investor_obj.num_co_investments;
        const input_investor_nodes = input_investors.map((investor) => nodes[lead_name_to_index[investor]]);
        // Compute initial position
        let x_pos = 0;
        let y_pos = 0;
        if (input_investor_nodes.length == 1) {
            // Compute coordinate based on line from center to input node
            const i_x = input_investor_nodes[0].x;
            const i_y = input_investor_nodes[0].y;
            const c_x = width / 2;
            const c_y = height / 2;
            x_pos = 2 * (i_x - c_x) + c_x;
            y_pos = 2 * (i_y - c_y) + c_y;
        } else {
            let center_x = 0;
            let center_y = 0;
            let n = 0;
            for (var j = 0; j < input_investor_nodes.length; j++) {
                const input_investor_node = input_investor_nodes[j];
                center_x += input_investor_node.x;
                center_y += input_investor_node.y;
                n += 1;
            }
            x_pos = center_x / n;
            y_pos = center_y / n;
        }
        // Connect each investor to it's target lead
        const connected_leads = investor_obj.input_investors;
        const node_links = [];
        for (var j = 0; j < connected_leads.length; j++) {
            const connected_lead = connected_leads[j];
            const connected_lead_index = lead_name_to_index[connected_lead];
            const link = {
                source: i + selected_investors.length,
                target: connected_lead_index,
                distance: max_count - countMap[count],
                is_hover: false,
            };
            links.push(link);
            node_links.push(link);
        }
        nodes.push({
            name: related_investor,
            x: x_pos,
            y: y_pos,
            type: "investor",
            count,
            is_hover: false,
            input_investor_nodes,
            node_links,
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
        index: node.index,
    };
}

function generateCousinsGraph(investor_obj, investor_node_input) {
    is_cousin_graph = true;

    // Empty all nodes but lead and investor
    var connected_selected_investors = new Set();
    for (const cousin in investor_obj.portfolio_cousins) {
        connected_selected_investors = new Set([
            ...connected_selected_investors,
            ...investor_obj.portfolio_cousins[cousin],
        ]);
    }
    var selected_investor_nodes = [];
    for (var i = 0; i < nodes.length; i++) {
        if (connected_selected_investors.has(nodes[i].name)) {
            selected_investor_nodes.push(copyNode(nodes[i]));
        }
    }

    var investor_node = copyNode(investor_node_input);
    nodes = [...selected_investor_nodes, investor_node];
    const investor_index = nodes.length - 1;
    const lead_name_to_index = {};
    for (var i = 0; i < nodes.length; i++) {
        lead_name_to_index[nodes[i].name] = i;
    }

    // Generate nodes and links
    links = [];
    const portfolio_cousins = Object.keys(investor_obj.portfolio_cousins);
    for (var i = 0; i < portfolio_cousins.length; i++) {
        const portfolio_cousin = portfolio_cousins[i];
        const cousin_root_investors = investor_obj.portfolio_cousins[portfolio_cousin];
        const cousin_index = i + connected_selected_investors.size + 1;
        nodes.push({ name: portfolio_cousin, type: "cousin", count: 2, x: width / 2, y: height / 2 });
        links.push({
            source: investor_index,
            target: cousin_index,
        });
        cousin_root_investors.forEach(function (cousin_root_investor) {
            if (cousin_root_investor in lead_name_to_index) {
                links.push({
                    source: lead_name_to_index[cousin_root_investor],
                    target: cousin_index,
                });
            }
        });
    }
    runSimulation(false);
}

function runSimulation(isLeadGraph) {
    if (isLeadGraph) {
        simulation = d3
            .forceSimulation(nodes)
            .force("lead-position", () => {
                if (!is_cousin_graph && selected_investors.length > 0) {
                    nodes.forEach((node) => {
                        if (node.type == "lead") {
                            [node.x, node.y] = computeLeadPos(node.index);
                        }
                    });
                }
            })
            .force(
                "charge",
                d3.forceManyBody().strength(function (node) {
                    if (node.type == "investor" && selected_investors.length == 1) {
                        return -5;
                    } else {
                        return 0;
                    }
                })
            )
            .force(
                "center",
                d3
                    .forceCenter(width / 2, height / 2)
                    .strength(selected_investors.length == 1 && nodes.length > 2 ? 1 : 0)
            )
            .force(
                "link",
                d3
                    .forceLink()
                    .links(links)
                    .distance(function (link) {
                        if (selected_investors.length == 1 || link.source.input_investor_nodes.length == 1) {
                            return Math.max(link.distance * step_size, min_distance);
                        } else {
                            return min_distance;
                        }
                    })
                    .strength(function () {
                        if (selected_investors.length == 1) {
                            return 1;
                        } else {
                            return 0.1;
                        }
                    })
            )
            .force(
                "collision",
                d3
                    .forceCollide()
                    .radius(function (node) {
                        return updateRadius(node);
                    })
                    .strength(0.5)
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
                            return width / 4;
                        } else if (node.type == "investor") {
                            return (3 / 4) * width;
                        } else {
                            return width / 2;
                        }
                    })
                    .strength(0.075)
            )
            .force(
                "y",
                d3.forceY().y(function (node) {
                    var num_cousins = 0;
                    var num_investors = 0;
                    var height_c = (2 / 3) * height;
                    var height_min = height / 6;
                    for (var i in nodes) {
                        if (nodes[i].type == "cousin") {
                            num_cousins += 1;
                        } else {
                            num_investors += 1;
                        }
                    }
                    if (node.type == "lead" && num_investors > 2) {
                        return height_c * (node.index / (num_investors - 2)) + height_min;
                    } else if (node.type == "cousin" && num_cousins > 1) {
                        return height_c * ((node.index - num_investors) / (num_cousins - 1)) + height_min;
                    } else {
                        return height_c / 2 + height_min;
                    }
                })
            )
            .force("link", d3.forceLink().links(links).strength(0))
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
                return investor_no_match_main;
            } else return cousin_main;
        })
        .attr("stroke", function (node) {
            if (node.type == "lead") return lead_outline;
            else if (node.type == "investor") {
                return investor_no_match_outline;
            } else return cousin_outline;
        })
        .on("click", function (e, node) {
            if (is_cousin_graph) {
                if (node.type == "lead") {
                    generateLeadGraph(investor_graph);
                } else {
                    // Open profile of investor or cousin on crunchbase in new tab
                    const cb_url = organization_to_cb_url[node.name];
                    window.open(cb_url, "_blank");
                }
            } else if (node.type == "lead") {
                // Open lead crunchbase url
                const cb_url = organization_to_cb_url[node.name];
                window.open(cb_url, "_blank");
            } else if (node.type == "investor") {
                // Generate Cousin Graph
                // TODO: Make lookup of investors faster than iteration through whole list
                const lead_investors = investor_graph;
                for (var i = 0; i < lead_investors.length; i++) {
                    const investor_candidate = lead_investors[i];
                    if (investor_candidate.investor == node.name) {
                        generateCousinsGraph(investor_candidate, node);
                        break;
                    }
                }
            }
        })
        .on("mouseover", function (e, node) {
            if (node.type == "investor") {
                node.is_hover = true;
                if (!is_cousin_graph) {
                    if (simulation.alpha() <= simulation.alphaMin()) {
                        simulation.alpha(0.01).restart();
                    }
                    simulation.force("collision").initialize(nodes);
                    // Darken links connected to node
                    for (var i = 0; i < node.node_links.length; i++) {
                        const node_link = node.node_links[i];
                        node_link.is_hover = true;
                    }
                }
            }
        })
        .on("mouseout", function (e, node) {
            if (node.type == "investor") {
                node.is_hover = false;
                if (!is_cousin_graph) {
                    if (simulation.alpha() <= simulation.alphaMin()) {
                        simulation.alpha(0.01).restart();
                    }
                    simulation.force("collision").initialize(nodes);
                    // Remove darkened links connected to node
                    for (var i = 0; i < node.node_links.length; i++) {
                        const node_link = node.node_links[i];
                        node_link.is_hover = false;
                    }
                }
            }
        });

    function updateLinks() {
        d3.select(".links")
            .selectAll("line")
            .data(links)
            .join("line")
            .classed("darkline", function (d) {
                return d.is_hover;
            })
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
        const node_radius = Math.min(max_radius, min_radius + delta_radius * (node.count - 1));
        if (node.type == "investor") {
            if (node.is_hover || is_cousin_graph) {
                return Math.max(hover_radius, node_radius);
            }
            return node_radius;
        } else if (node.type == "lead") {
            return hover_radius;
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
            .transition()
            .duration("40")
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
                return d.y + 3;
            })
            .attr("pointer-events", "none")
            .text(function (d) {
                var count = d.count;
                if (d.is_hover) {
                    count = Math.max(hover_count + 8, count);
                }
                let sub_length = 5 + 1 * (count - 1);
                const str_length = d.name.length;
                if (d.type == "cousin") {
                    sub_length = 12;
                } else if (d.type == "lead") {
                    sub_length = 18;
                } else if (is_cousin_graph) {
                    sub_length = str_length;
                }
                if (str_length > sub_length) {
                    return d.name.substring(0, sub_length) + "...";
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
