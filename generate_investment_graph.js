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

// organization (company or investor) name -> crunchbase cb_url
// company_a: https://www.crunchbase.com/person/matt-cohler
export let organization_to_cb_url = {};

// #################### Filter objects ####################

// investor -> type
// investor_a: person / organization
let investor_to_type = {};

// investor -> {round_type: is_lead}
// investor_a: {series_a: true, series_b: false, ...}
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
export const filter_to_filter_type = {
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
            organization_to_cb_url[company] = organizations_data[i].cb_url;
        }
    }
    for (var i = 0; i < investors_data.length; i++) {
        const name = investors_data[i].name;
        const type = investors_data[i].type;
        investor_to_type[name] = type;
        organization_to_cb_url[name] = investors_data[i].cb_url;
    }
    for (var i = 0; i < investments_data.length; i++) {
        const fr_uuid = investments_data[i].funding_round_uuid;
        const company = funding_uuid_to_company_name[fr_uuid];
        const investor = investments_data[i].investor_name;
        const is_lead = investments_data[i].is_lead_investor === "True";
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
            investor_to_round_types[investor][round_type] = false;
        }

        company_to_round_investors[company][round_date].add(investor);
        investor_to_rounds[investor][round_date].add(company);
        company_to_investors[company].add(investor);
        investor_to_companies[investor].add(company);
        investor_to_round_types[investor][round_type] ||= is_lead;
        categories.forEach((category) => {
            investor_to_categories[investor].add(category);
        });
    }
    /*
    write company_to_categories investor_to_categories to separate files
    */
}

// Helper functions
function has_overlapping_sets(selected_sets, actual_sets, match_all_sets) {
    var has_one_overlap = false;
    var has_entire_overlap = true;
    if (selected_sets && actual_sets) {
        selected_sets.forEach((selected_category) => {
            if (actual_sets.has(selected_category)) {
                has_one_overlap = true;
            } else {
                has_entire_overlap = false;
            }
        });
    }
    return match_all_sets ? has_entire_overlap : has_one_overlap;
}

function apply_filters(filters, investors, lead_filter, selected_competitors) {
    if (filters.size == 0 && selected_competitors.length == 0) {
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
        // Filter out if invested in any competitors
        const is_competitor = has_overlapping_sets(
            new Set(selected_competitors),
            investor_to_companies[investor],
            false
        );
        if (!is_competitor) {
            var shouldAddInvestor = true;
            for (const filter_type in filter_type_to_filter) {
                var didPassFilterType = false;
                const filters_for_type = filter_type_to_filter[filter_type];
                for (var i = 0; i < filters_for_type.length; i++) {
                    const filter_for_type = filters_for_type[i];
                    const filter_object = filter_to_objects[filter_for_type];
                    const actual_value = filter_object[investor];
                    if (filter_type == "investor_to_round_types") {
                        if (lead_filter == "only_leads") {
                            didPassFilterType = filter_for_type in actual_value ? actual_value[filter_for_type] : false;
                        } else if (lead_filter == "only_non_leads") {
                            didPassFilterType =
                                filter_for_type in actual_value ? !actual_value[filter_for_type] : false;
                        } else {
                            didPassFilterType = filter_for_type in actual_value;
                        }
                    } else {
                        didPassFilterType = actual_value == filter_for_type;
                    }
                    if (didPassFilterType) {
                        // Only needs to pass one per filter type
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
        }
    });
    return filtered_investors;
}

/*
    Returns all investors that co-invested with lead up to the provided round_date
    If filter_cousins is true, will only select rounds lead has invested in where company has at least one matching category with my company
    If filter_investors is true, will only select investors who have invested at least once in one of my company's categories

    Returns: Array of co_investors with lead, containing all portfolio cousins they've co_invested in, with other info
    {
        co_investors:  [
            {
                investor: investor_dest,
                num_co_investments: n,
                portfolio_cousins: Set([portfolio_cousin_1, portfolio_cousin_2, ...])
            },
            {...}
        ],
        no_filter: set(investor_1, ...),
        filtered_cousins: set(investor_1, ...),
        filtered_investors: set(investor_1, ...),
    }
*/
export function find_co_investors_before_date(
    lead,
    selected_categories,
    selected_competitors,
    after_date,
    filter_cousins,
    filter_investors,
    filters,
    lead_filter,
    match_all_categories
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
            const has_overlapping_categories_cousins = has_overlapping_sets(
                new Set(selected_categories),
                new Set(company_to_categories[cousin]),
                match_all_categories
            );
            // Get all investors who co-invested with lead in cousin, round_date and remove lead
            let cousin_investors = new Set(company_to_round_investors[cousin][round_date]);
            cousin_investors.delete(lead);
            // Apply all other non-category filters
            cousin_investors = apply_filters(filters, cousin_investors, lead_filter, selected_competitors);
            co_investors_no_filter = new Set([...co_investors_no_filter, ...cousin_investors]);
            if (has_overlapping_categories_cousins) {
                co_investors_cousin_filter = new Set([...co_investors_cousin_filter, ...cousin_investors]);
            }
            cousin_investors.forEach((cousin_investor) => {
                const has_overlapping_categories_investors = has_overlapping_sets(
                    new Set(selected_categories),
                    investor_to_categories[cousin_investor],
                    match_all_categories
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

function removeInputInvestors(co_investors, to_be_removed) {
    for (var i = 0; i < to_be_removed.length; i++) {
        const investor_to_be_removed = to_be_removed[i];
        co_investors.delete(investor_to_be_removed);
    }
    return co_investors;
}

/*
    Returns all investors that co-invested with any input up to the provided round_date

    Returns: Array of co_investors with lead, containing all portfolio cousins they've co_invested in
    {
        co_investors: [
            {
                investor: co_investor,
                num_co_investments: <sum of num_co_investments across all input investors and all rounds>,
                input_investors: [input_investor_1, input_investor_2],
                portfolio_cousins: {
                    portfolio_cousin_1: Set([input_investor_1, input_investor_2, ...])
                    portfolio_cousin_2: Set([input_investor_2, input_investor_2, ...])
                }
            },
            {...}
        ]
        no_filter: set(no_filter1, no_filter2, ...)),
        filtered_cousins: set(...),
        filtered_investors: set(...),
        input_investor_counts: {
            investor_a: 10,
            investor_b: 23,
            ...
        }
    }
*/
export function find_co_investors_for_multiple_investors(
    input_investors,
    selected_categories,
    selected_competitors,
    prev_months,
    filter_cousins,
    filter_investors,
    filters,
    lead_filter,
    match_all_categories
) {
    // Keep track of all co_investors in three scenarios
    var co_investors_no_filter = new Set();
    var co_investors_cousin_filter = new Set();
    var co_investors_investor_filter = new Set();
    var input_investor_counts = {};

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
            selected_competitors,
            after_date,
            filter_cousins,
            filter_investors,
            filters,
            lead_filter,
            match_all_categories
        );
        // Count num co-investors per input investors, filtering all existing input investors
        input_investor_counts[input_investor] = removeInputInvestors(
            new Set(single_input_co_investors.co_investors.map((entry) => entry.investor)),
            input_investors
        ).size;
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
        no_filter: removeInputInvestors(co_investors_no_filter, input_investors),
        filtered_cousins: removeInputInvestors(co_investors_cousin_filter, input_investors),
        filtered_investors: removeInputInvestors(co_investors_investor_filter, input_investors),
        input_investor_counts,
    };
}
