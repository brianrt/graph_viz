// company -> 2d list of investors per round (key'd by date)
// company_a: { 2008-03-19: [investor_a, investor_b], 2010-4-20: [investor_a, investor_c] }
let company_to_round_investors = {};

// company -> all investors
// company_a: [investor_a, investor_b]
let company_to_investors = {};

// investor -> all companies
// investor_a: [company_a, company_b]
let investor_to_companies = {};

// company -> company categories
// company_a: [category_a, category_b]
let company_to_categories = {};

export function initialize_investments(data) {
    for (var i = 0; i < data.length; i++) {
        const company = data[i].company_name;
        const investor = data[i].investor_name;
        const round_date = data[i].funded_at;
        const categories = data[i].company_category_list.split('|');

        if (!(company in company_to_round_investors)) {
            company_to_round_investors[company] = {};
            company_to_investors[company] = new Set();
            company_to_categories[company] = new Set();
        }
        if (!(round_date in company_to_round_investors[company])) {
            company_to_round_investors[company][round_date] = new Set();
        }
        if (!(investor in investor_to_companies)) {
            investor_to_companies[investor] = new Set();
        }

        company_to_round_investors[company][round_date].add(investor);
        company_to_investors[company].add(investor);
        investor_to_companies[investor].add(company);
        categories.forEach((category) => company_to_categories[company].add(category));
    }
}

/*  
    Generate Local graph for every company / round
    local_graphs: {
        company_a: {
            2008-03-19: {
                lead_investor: investor_a,
                portfolio_cousins_investors: {
                    portfolio_cousin_1: set([ investor_b, investor_c, ... ]),
                    portfolio_cousin_2: set([ investor_d, investor_e, ... ])
                }
            },
            2010-05-11: {...},
            ...
        },
        company_b: {...}
    }
*/
export function generate_local_graphs() {
    let local_graphs = {};
    var i = 0.0;
    var n = Object.keys(company_to_round_investors).length;
    for (const company in company_to_round_investors) {
        for (const round_date in company_to_round_investors[company]) {
            const round_investors = company_to_round_investors[company][round_date];

            // Choose a 'lead' investor by selecting the one with the max investments
            var max_investments = 0;
            var lead_investor = "";
            round_investors.forEach(function (round_investor) {
                var num_investments = investor_to_companies[round_investor].size;
                if (num_investments > max_investments) {
                    lead_investor = round_investor;
                    max_investments = num_investments;
                }
            });

            // Gather portfolio cousins of lead investor
            let portfolio_cousins = new Set(investor_to_companies[lead_investor]);

            // Remove company from portfolio cousins
            portfolio_cousins.delete(company);

            // Grab first 10 investors for each portfolio cousin, remove lead investor if necessary
            let portfolio_cousins_investors = {};
            const max_investors = 10;
            var num_investors = 0;
            portfolio_cousins.forEach(function (portfolio_cousin) {
                let investors_sample = Array.from(company_to_investors[portfolio_cousin])
                    .slice(0, max_investors)
                    .filter(function (investor) {
                        return investor != lead_investor;
                    });
                if (investors_sample.length > 0)
                    portfolio_cousins_investors[portfolio_cousin] = investors_sample;
                    num_investors += investors_sample.length
            });

            if (num_investors == 0) {
                continue;
            }

            if (!(company in local_graphs)) {
                local_graphs[company] = {};
            }
            local_graphs[company][round_date] = {
                lead_investor,
                portfolio_cousins_investors
            };
        }
        if (i == 10000 )
            break;
        i+=1;
    }
    return local_graphs;
}

/*
    Generate entire investor graph
    investors sorted by most to least num_co_investments
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
export function generate_investor_graph() {
    let investor_graph_temp = {};
    for (const company in company_to_round_investors) {
        for (const round_date in company_to_round_investors[company]) {
            const round_investors = company_to_round_investors[company][round_date];
            if (round_investors.size == 1) {
                continue;
            }
            round_investors.forEach(function (round_investor_source) {
                if (!(round_investor_source in investor_graph_temp)) {
                    investor_graph_temp[round_investor_source] = {};
                }
                round_investors.forEach(function (round_investor_dest) {
                    if (round_investor_source != round_investor_dest) {
                        if (!(round_investor_dest in investor_graph_temp[round_investor_source])) {
                            investor_graph_temp[round_investor_source][round_investor_dest] = {
                                num_co_investments: 0,
                                portfolio_cousins: new Set()
                            };
                        }
                        investor_graph_temp[round_investor_source][round_investor_dest].portfolio_cousins.add(company);
                        investor_graph_temp[round_investor_source][round_investor_dest].num_co_investments =
                            investor_graph_temp[round_investor_source][round_investor_dest].portfolio_cousins.size;
                    }
                });
            });
        }
    }

    let investor_graph = {}
    // Sort by # co-invested rounds
    for (const investor_source in investor_graph_temp) {
        const related_investors_dict = investor_graph_temp[investor_source];
        const related_investors = Object.keys(related_investors_dict).map(function(investor_dest) {
            return {
                investor: investor_dest,
                ...related_investors_dict[investor_dest]
            };
        });
        related_investors.sort(function(first, second) {
            return second.num_co_investments - first.num_co_investments;
        });
        investor_graph[investor_source] = related_investors;
    }

    return investor_graph;
}

export function generate_company_categories() {
    return company_to_categories;
}
