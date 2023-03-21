// company -> 2d list of investors per round (key'd by date)
// company_a: { 2008-03-19: [investor_a, investor_b], 2010-4-20: [investor_a, investor_c] }
export let company_to_round_investors = {};

// funding round uuid -> company name
// d950d7a5-79ff-fb93-ca87-13386b0e2feb: Meta
let funding_uuid_to_company_name = {};

// funding round uuid -> round date
// d950d7a5-79ff-fb93-ca87-13386b0e2feb: 2004-09-01
let funding_uuid_to_round_date = {};

// funding round uuid -> investment type
// d950d7a5-79ff-fb93-ca87-13386b0e2feb: series_a
let funding_uuid_to_round_type = {};

// company uuid -> org_name
// d950d7a5-79ff-fb93-ca87-13386b0e2feb: Meta
let company_uuid_to_org_name = {};

// investor -> list of round_dates along with companies invested in at each of those dates (possibility of investing in two rounds on same day)
// investor_a: { 2008-03-19: [company_a, company_b], 2010-4-20: [company_c] }
let investor_to_rounds = {};

// company -> all investors
// company_a: [investor_a, investor_b]
export let company_to_investors = {};

// investor -> all companies
// investor_a: [company_a, company_b]
export let investor_to_companies = {};

// company -> company categories
// company_a: [category_a, category_b]
export let company_to_categories = {};

// company -> company categories
// company_a: [category_a, category_b]
export let investor_to_categories = {};

export let all_categories = new Set();

// ##### Filter objects #####

// investor -> type
// investor_a: person / organization
let investor_to_type = {};

// investor -> round_type
// investor_a: series_a
let investor_to_round_types = {};

// Maps filter values to their objects
const filter_to_objects = {
    person: investor_to_type,
    organization: investor_to_type,
    angel: investor_to_round_types,
    pre_seed: investor_to_round_types,
    seed: investor_to_round_types,
    series_a: investor_to_round_types,
    series_b: investor_to_round_types,
    series_c: investor_to_round_types,
    series_d: investor_to_round_types,
    series_e: investor_to_round_types,
    series_f: investor_to_round_types,
};

// Used for grouping common filter types together
const filter_to_filter_type = {
    person: "investor_to_type",
    organization: "investor_to_type",
    angel: "investor_to_round_types",
    pre_seed: "investor_to_round_types",
    seed: "investor_to_round_types",
    series_a: "investor_to_round_types",
    series_b: "investor_to_round_types",
    series_c: "investor_to_round_types",
    series_d: "investor_to_round_types",
    series_e: "investor_to_round_types",
    series_f: "investor_to_round_types",
};

export function initialize_investments(investments_data, funding_rounds_data, organizations_data, investors_data) {
    /*
    if the files for company_to_categories already exists, pull from that
    if investor_to_categories exists, pull from that
    otherwise run this whole fuckin stupid thing
    */
    for (var i = 0; i < funding_rounds_data.length; i++) {
        const fr_uuid = funding_rounds_data[i].uuid;
        const org_uuid = funding_rounds_data[i].org_uuid;
        funding_uuid_to_company_name[fr_uuid] = funding_rounds_data[i].org_name;
        funding_uuid_to_round_date[fr_uuid] = funding_rounds_data[i].announced_on;
        company_uuid_to_org_name[org_uuid] = funding_rounds_data[i].org_name;
        funding_uuid_to_round_type[fr_uuid] = funding_rounds_data[i].investment_type;
    }
    for (var i = 0; i < organizations_data.length; i++) {
        const org_uuid = organizations_data[i].uuid;
        if (org_uuid in company_uuid_to_org_name) {
            const company = company_uuid_to_org_name[org_uuid];
            const category_list = organizations_data[i].category_list.split(",").filter((c) => c != "");
            company_to_categories[company] = category_list;
            category_list.forEach((category) => all_categories.add(category));
        }
    }
    for (var i = 0; i < investors_data.length; i++) {
        const name = investors_data[i].name;
        const type = investors_data[i].type;
        investor_to_type[name] = type;
    }
    for (var i = 0; i < investments_data.length; i++) {
        const fr_uuid = investments_data[i].funding_round_uuid;
        const company = funding_uuid_to_company_name[fr_uuid];
        const investor = investments_data[i].investor_name;
        const round_date = funding_uuid_to_round_date[fr_uuid];
        const round_type = funding_uuid_to_round_type[fr_uuid];
        const categories = company_to_categories[company] || new Set("");

        if (!(company in company_to_round_investors)) {
            company_to_round_investors[company] = {};
            company_to_investors[company] = new Set();
        }
        if (!(round_date in company_to_round_investors[company])) {
            company_to_round_investors[company][round_date] = new Set();
        }
        if (!(investor in investor_to_rounds)) {
            investor_to_rounds[investor] = {};
            investor_to_round_types[investor] = {};
            investor_to_companies[investor] = new Set();
            investor_to_categories[investor] = new Set();
        }
        if (!(round_date in investor_to_rounds[investor])) {
            investor_to_rounds[investor][round_date] = new Set();
        }
        if (!(round_type in investor_to_round_types[investor])) {
            investor_to_round_types[investor][round_type] = 0;
        }

        company_to_round_investors[company][round_date].add(investor);
        investor_to_rounds[investor][round_date].add(company);
        company_to_investors[company].add(investor);
        investor_to_companies[investor].add(company);
        investor_to_round_types[investor][round_type] += 1;
        categories.forEach((category) => {
            investor_to_categories[investor].add(category);
        });
    }
    // Choose top round types per investor
    for (const investor in investor_to_round_types) {
        var max = -1;
        var max_round = "";
        const round_types = investor_to_round_types[investor];
        for (const round in round_types) {
            const count = round_types[round];
            if (count > max) {
                max_round = round;
                max = count;
            }
        }
        investor_to_round_types[investor] = max_round;
    }
    /*
    write company_to_categories investor_to_categories to separate files
    */
}

// Helper functions
function has_overlapping_categories(categories_a, categories_b) {
    var has_overlap = false;
    if (categories_a && categories_b) {
        categories_a.forEach((category_a) => {
            if (categories_b.has(category_a)) {
                has_overlap = true;
            }
        });
    }
    return has_overlap;
}

function apply_filters(filters, investors) {
    if (filters.size == 0) {
        return investors;
    }

    // Group filter types
    const filter_type_to_filter = {};
    filters.forEach((filter) => {
        const filter_type = filter_to_filter_type[filter];
        if (!(filter_type in filter_type_to_filter)) {
            filter_type_to_filter[filter_type] = [];
        }
        filter_type_to_filter[filter_type].push(filter);
    });

    // Needs one match per selected filter type to be included
    const filtered_investors = new Set();
    investors.forEach((investor) => {
        var shouldAddInvestor = true;
        for (const filter_type in filter_type_to_filter) {
            var didPassFilterType = false;
            const filters_for_type = filter_type_to_filter[filter_type];
            for (var i = 0; i < filters_for_type.length; i++) {
                const filter_for_type = filters_for_type[i];
                const filter_object = filter_to_objects[filter_for_type];
                const actual_value = filter_object[investor];
                if (actual_value == filter_for_type) {
                    // Only needs to pass one per filter type
                    didPassFilterType = true;
                    break;
                }
            }
            if (!didPassFilterType) {
                shouldAddInvestor = false;
                break;
            }
        }
        if (shouldAddInvestor) {
            filtered_investors.add(investor);
        }
    });
    return filtered_investors;
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
export function find_co_investors_before_date(
    lead,
    selected_categories,
    after_date,
    filter_cousins,
    filter_investors,
    filters
) {
    // Find rounds lead has invested in after after_date
    const lead_rounds = investor_to_rounds[lead];
    const round_dates = Object.keys(lead_rounds).filter((round) => round >= after_date);

    // Keep track of all co_investors in three scenarios
    var co_investors_no_filter = new Set();
    var co_investors_cousin_filter = new Set();
    var co_investors_investor_filter = new Set();

    // Gather investors
    var co_investors_temp = {};
    for (var i = 0; i < round_dates.length; i++) {
        const round_date = round_dates[i];
        const cousins = lead_rounds[round_date];
        cousins.forEach((cousin) => {
            const has_overlapping_categories_cousins = has_overlapping_categories(
                new Set(selected_categories),
                new Set(company_to_categories[cousin])
            );
            // Get all investors who co-invested with lead in cousin, round_date and remove lead
            let cousin_investors = new Set(company_to_round_investors[cousin][round_date]);
            cousin_investors.delete(lead);
            // Apply all other non-category filters
            cousin_investors = apply_filters(filters, cousin_investors);
            co_investors_no_filter = new Set([...co_investors_no_filter, ...cousin_investors]);
            if (has_overlapping_categories_cousins) {
                co_investors_cousin_filter = new Set([...co_investors_cousin_filter, ...cousin_investors]);
            }
            cousin_investors.forEach((cousin_investor) => {
                const has_overlapping_categories_investors = has_overlapping_categories(
                    new Set(selected_categories),
                    investor_to_categories[cousin_investor]
                );
                if (has_overlapping_categories_investors) {
                    co_investors_investor_filter.add(cousin_investor);
                }
                const cousin_check = !filter_cousins || (filter_cousins && has_overlapping_categories_cousins);
                const investor_check = !filter_investors || (filter_investors && has_overlapping_categories_investors);
                if (cousin_check && investor_check) {
                    if (!(cousin_investor in co_investors_temp)) {
                        co_investors_temp[cousin_investor] = {
                            num_co_investments: 0,
                            portfolio_cousins: new Set(),
                        };
                    }
                    co_investors_temp[cousin_investor].portfolio_cousins.add(cousin);
                    co_investors_temp[cousin_investor].num_co_investments += 1;
                }
            });
        });
    }

    // Sort by num_co_investments
    const co_investors = Object.keys(co_investors_temp).map(function (co_investor) {
        return {
            investor: co_investor,
            ...co_investors_temp[co_investor],
        };
    });
    co_investors.sort(function (first, second) {
        return second.num_co_investments - first.num_co_investments;
    });
    return {
        co_investors,
        no_filter: co_investors_no_filter,
        filtered_cousins: co_investors_cousin_filter,
        filtered_investors: co_investors_investor_filter,
    };
}

function dateToYMD(date) {
    var d = date.getDate();
    var m = date.getMonth() + 1;
    var y = date.getFullYear();
    return "" + y + "-" + (m <= 9 ? "0" + m : m) + "-" + (d <= 9 ? "0" + d : d);
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
export function find_co_investors_for_multiple_investors(
    input_investors,
    selected_categories,
    prev_months,
    filter_cousins,
    filter_investors,
    filters
) {
    // Keep track of all co_investors in three scenarios
    var co_investors_no_filter = new Set();
    var co_investors_cousin_filter = new Set();
    var co_investors_investor_filter = new Set();

    // Compute date from prev_months
    var d = new Date();
    d.setMonth(d.getMonth() - prev_months);
    const after_date = dateToYMD(d);

    let co_investors_temp = {};
    for (var i = 0; i < input_investors.length; i++) {
        const input_investor = input_investors[i];
        const single_input_co_investors = find_co_investors_before_date(
            input_investor,
            selected_categories,
            after_date,
            filter_cousins,
            filter_investors,
            filters
        );
        for (var j = 0; j < single_input_co_investors.co_investors.length; j++) {
            const single_co_investor = single_input_co_investors.co_investors[j];
            const co_investor = single_co_investor.investor;
            if (!input_investors.includes(co_investor)) {
                if (!(co_investor in co_investors_temp)) {
                    co_investors_temp[co_investor] = {
                        num_co_investments: 0,
                        portfolio_cousins: {},
                        input_investors: [],
                    };
                }
                co_investors_temp[co_investor].num_co_investments += single_co_investor.num_co_investments;
                co_investors_temp[co_investor].input_investors.push(input_investor);
                single_co_investor.portfolio_cousins.forEach((portfolio_cousin) => {
                    if (!(portfolio_cousin in co_investors_temp[co_investor].portfolio_cousins)) {
                        co_investors_temp[co_investor].portfolio_cousins[portfolio_cousin] = new Set();
                    }
                    co_investors_temp[co_investor].portfolio_cousins[portfolio_cousin].add(input_investor);
                });
            }
        }
        co_investors_no_filter = new Set([...co_investors_no_filter, ...single_input_co_investors.no_filter]);
        co_investors_cousin_filter = new Set([
            ...co_investors_cousin_filter,
            ...single_input_co_investors.filtered_cousins,
        ]);
        co_investors_investor_filter = new Set([
            ...co_investors_investor_filter,
            ...single_input_co_investors.filtered_investors,
        ]);
    }

    // Sort by num_co_investments
    const co_investors = Object.keys(co_investors_temp).map(function (co_investor) {
        return {
            investor: co_investor,
            ...co_investors_temp[co_investor],
        };
    });
    co_investors.sort(function (first, second) {
        return second.num_co_investments - first.num_co_investments;
    });

    return {
        co_investors,
        no_filter: co_investors_no_filter,
        filtered_cousins: co_investors_cousin_filter,
        filtered_investors: co_investors_investor_filter,
    };
}
