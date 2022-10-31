// company -> 2d list of investors per round (key'd by date)
// company_a: { 2008-03-19: [investor_a, investor_b], 2010-4-20: [investor_a, investor_c] }
let company_to_round_investors = {};

// company -> all investors
// company_a: [investor_a, investor_b]
let company_to_investors = {};

// investor -> all companies
// investor_a: [company_a, company_b]
let investor_to_companies = {};

export function initialize_investments(data) {
    for (var i = 0; i < data.length; i++) {
        const company = data[i].company_name;
        const investor = data[i].investor_name;
        const round_date = data[i].funded_at;

        if (!(company in company_to_round_investors)) {
            company_to_round_investors[company] = {};
            company_to_investors[company] = new Set();
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
    }
}

/*  
    Generate Local graph for every company / round
    local_graphs: {
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
            const num_investors = 10;
            portfolio_cousins.forEach(function (portfolio_cousin) {
                let investors_sample = Array.from(company_to_investors[portfolio_cousin])
                    .slice(0, num_investors)
                    .filter(function (investor) {
                        return investor != lead_investor;
                    });
                if (investors_sample.length > 0)
                    portfolio_cousins_investors[portfolio_cousin] = investors_sample;
            });

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
