// company -> 2d list of investors per round (key'd by date)
// company_a: { 2008-03-19: [investor_a, investor_b], 2010-4-20: [investor_a, investor_c] }
export let company_to_round_investors = {};

// investor -> list of round_dates along with companies invested in at each of those dates (possibility of investing in two rounds on same day)
// investor_a: { 2008-03-19: [company_a, company_b], 2010-4-20: [company_c] }
let investor_to_rounds = {};

// company -> all investors
// company_a: [investor_a, investor_b]
let company_to_investors = {};

// investor -> all companies
// investor_a: [company_a, company_b]
let investor_to_companies = {};

// company -> company categories
// company_a: [category_a, category_b]
export let company_to_categories = {};

// company -> company categories
// company_a: [category_a, category_b]
export let investor_to_categories = {};

export function initialize_investments(data) {
    for (var i = 0; i < data.length; i++) {
        const company = data[i].company_name;
        const investor = data[i].investor_name;
        const round_date = data[i].funded_at;
        const categories = data[i].company_category_list.split('|').filter(c => c != '');

        if (!(company in company_to_round_investors)) {
            company_to_round_investors[company] = {};
            company_to_investors[company] = new Set();
            company_to_categories[company] = new Set();
        }
        if (!(round_date in company_to_round_investors[company])) {
            company_to_round_investors[company][round_date] = new Set();
        }
        if (!(investor in investor_to_rounds)) {
            investor_to_rounds[investor] = {};
            investor_to_companies[investor] = new Set();
            investor_to_categories[investor] = new Set();
        }
        if (!(round_date in investor_to_rounds[investor])) {
            investor_to_rounds[investor][round_date] = new Set();
        }

        company_to_round_investors[company][round_date].add(investor);
        investor_to_rounds[investor][round_date].add(company);
        company_to_investors[company].add(investor);
        investor_to_companies[investor].add(company);
        categories.forEach((category) => {
            company_to_categories[company].add(category)
            investor_to_categories[investor].add(category)
        });
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

/*
    Compute lead investor for each company, round by looking at which investor has the most co-investments prior to that round
    round_leads: {
        company_a: {
            2008-03-19: investor_a
            2010-05-11: investor_b,
            ...
        },
        company_b: {...}
    }
*/
export function generate_round_leads(company) {
    // company: {2008-03-19: investor_a, 2010-4-20: investor_b}
    let company_to_leads = {};
    const rounds = Object.keys(company_to_round_investors[company]);
    for (var j = 0; j < rounds.length; j++) {
        const round_date = rounds[j];
        const investors = company_to_round_investors[company][round_date];
        var lead_investor;
        var max_investments = -1;
        investors.forEach(investor => {
            // Compute num investments up until round_date
            const investor_round_dates = Object.keys(investor_to_rounds[investor]);
            var num_investments = 0;
            for (var k = 0; k < investor_round_dates.length; k++) {
                const investor_round_date = investor_round_dates[k];
                if (investor_round_date < round_date) {
                    num_investments += investor_to_rounds[investor][investor_round_date].size;
                }
            }
            if (num_investments > max_investments) {
                max_investments = num_investments;
                lead_investor = investor;
            }
        });
        company_to_leads[round_date] = lead_investor;
    }
    return company_to_leads;
}

function has_overlapping_categories(categories_a, categories_b) {
    var has_overlap = false;
    if (categories_a && categories_b) {
        categories_a.forEach(category_a => {
            if (categories_b.has(category_a)) {
                has_overlap = true;
            }
        });
    }
    return has_overlap;
}

/*
    Returns all investors that co-invested with lead up to the provided round_date
    If filter_cousins is true, will only select rounds lead has invested in where company has at least one matching category with my company
    If filter_investors is true, will only select investors who have invested at least once in one of my company's categories

    Returns: Array of co_investors with lead, containing all portfolio cousins they've co_invested in
    [
        {
            investor: investor_dest,
            num_co_investments: n,
            portfolio_cousins: Set([portfolio_cousin_1, portfolio_cousin_2, ...])
        },
        {...}
    ]
*/
export function find_co_investors_before_date(lead, company, company_round_date, filter_cousins, filter_investors) {
    // Find rounds lead has invested in prior to company_round_date
    const lead_rounds = investor_to_rounds[lead];
    const round_dates = Object.keys(lead_rounds).filter((round) => round < company_round_date);

    // Keep track of all co_investors in three scenarios
    var co_investors_no_filter = new Set();
    var co_investors_cousin_filter = new Set();
    var co_investors_investor_filter = new Set();

    // Gather investors
    var co_investors_temp = {};
    for (var i = 0; i < round_dates.length; i++) {
        const round_date = round_dates[i];
        const cousins = lead_rounds[round_date];
        cousins.forEach(cousin => {
            const has_overlapping_categories_cousins = has_overlapping_categories(company_to_categories[company], company_to_categories[cousin]);
            // Get all investors who co-invested with lead in cousin, round_date and remove lead
            let cousin_investors = new Set(company_to_round_investors[cousin][round_date]);
            cousin_investors.delete(lead);
            co_investors_no_filter = new Set([...co_investors_no_filter, ...cousin_investors]);
            if (has_overlapping_categories_cousins) {
                co_investors_cousin_filter = new Set([...co_investors_cousin_filter, ...cousin_investors]);
            }
            cousin_investors.forEach(cousin_investor => {
                const has_overlapping_categories_investors = has_overlapping_categories(company_to_categories[company], investor_to_categories[cousin_investor]);
                if (has_overlapping_categories_investors) {
                    co_investors_investor_filter.add(cousin_investor);
                }
                const cousin_check = !filter_cousins || (filter_cousins && has_overlapping_categories_cousins);
                const investor_check = !filter_investors || (filter_investors && has_overlapping_categories_investors);
                if (cousin_check && investor_check) {
                    if (!(cousin_investor in co_investors_temp)) {
                        co_investors_temp[cousin_investor] = {
                            num_co_investments: 0,
                            portfolio_cousins: new Set()
                        };
                    }
                    co_investors_temp[cousin_investor].portfolio_cousins.add(cousin);
                    co_investors_temp[cousin_investor].num_co_investments += 1;
                }
            });
        });
    }

    // Sort by num_co_investments
    const co_investors = Object.keys(co_investors_temp).map(function(co_investor) {
        return {
            investor: co_investor,
            ...co_investors_temp[co_investor]
        };
    });
    co_investors.sort(function(first, second) {
        return second.num_co_investments - first.num_co_investments;
    });
    return {
        co_investors,
        no_filter: co_investors_no_filter,
        filtered_cousins: co_investors_cousin_filter,
        filtered_investors: co_investors_investor_filter
    };
}

/*
    Returns all investors that co-invested with any input up to the provided round_date

    Returns: Array of co_investors with lead, containing all portfolio cousins they've co_invested in
    {
        co_investors: [
            {
                investor: co_investor,
                num_co_investments: <sum of num_co_investments across all input investors and all rounds>,
                input_investors: [input_investor_1, input_investor_2]
                portfolio_cousins: {
                    portfolio_cousin_1: Set([input_investor_1, input_investor_2, ...])
                    portfolio_cousin_2: Set([input_investor_2, input_investor_2, ...])
                }
            },
            {...}
        ]
        no_filter: set(no_filter1, no_filter2, ...)),
        filtered_cousins: y,
        filtered_investors: z
    }
*/
export function find_co_investors_for_multiple_investors(input_investors, company, company_round_date, filter_cousins, filter_investors) {
    // Keep track of all co_investors in three scenarios
    var co_investors_no_filter = new Set();
    var co_investors_cousin_filter = new Set();
    var co_investors_investor_filter = new Set();

    let co_investors_temp = {};
    for (var i = 0; i < input_investors.length; i++) {
        const input_investor = input_investors[i];
        const single_input_co_investors = find_co_investors_before_date(input_investor, company, company_round_date, filter_cousins, filter_investors);
        for (var j = 0; j < single_input_co_investors.co_investors.length; j++) {
            const single_co_investor = single_input_co_investors.co_investors[j];
            const co_investor = single_co_investor.investor;
            if (!(input_investors.includes(co_investor))) {
                if (!(co_investor in co_investors_temp)) {
                    co_investors_temp[co_investor] = {
                        num_co_investments: 0,
                        portfolio_cousins: {},
                        input_investors: []
                    };
                }
                co_investors_temp[co_investor].num_co_investments += single_co_investor.num_co_investments;
                co_investors_temp[co_investor].input_investors.push(input_investor);
                single_co_investor.portfolio_cousins.forEach(portfolio_cousin => {
                    if (!(portfolio_cousin in co_investors_temp[co_investor].portfolio_cousins)) {
                        co_investors_temp[co_investor].portfolio_cousins[portfolio_cousin] = new Set();
                    }
                    co_investors_temp[co_investor].portfolio_cousins[portfolio_cousin].add(input_investor);
                })
            }
        }
        co_investors_no_filter = new Set([...co_investors_no_filter, ...single_input_co_investors.no_filter]);
        co_investors_cousin_filter = new Set([...co_investors_cousin_filter, ...single_input_co_investors.filtered_cousins]);
        co_investors_investor_filter = new Set([...co_investors_investor_filter, ...single_input_co_investors.filtered_investors]);
    }

    // Sort by num_co_investments
    const co_investors = Object.keys(co_investors_temp).map(function(co_investor) {
        return {
            investor: co_investor,
            ...co_investors_temp[co_investor]
        };
    });
    co_investors.sort(function(first, second) {
        return second.num_co_investments - first.num_co_investments;
    });

    return {
        co_investors,
        no_filter: co_investors_no_filter,
        filtered_cousins: co_investors_cousin_filter,
        filtered_investors: co_investors_investor_filter
    };
}