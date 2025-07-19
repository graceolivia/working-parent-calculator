// childcare_calculator.js
// rough web calculator for evaluating if SAHP returning to work is net positive

function calculateTaxesNYC(income) {
    // simplified, assumes all income is wages and no deductions/credits
  
    // federal tax brackets for 2024 (married filing jointly)
    const federalBrackets = [
      { cap: 23200, rate: 0.1 },
      { cap: 94300, rate: 0.12 },
      { cap: 201050, rate: 0.22 },
      { cap: 383900, rate: 0.24 },
      { cap: 487450, rate: 0.32 },
      { cap: 731200, rate: 0.35 },
      { cap: Infinity, rate: 0.37 }
    ];
  
    const nyBrackets = [
      { cap: 17150, rate: 0.04 },
      { cap: 23600, rate: 0.045 },
      { cap: 27900, rate: 0.0525 },
      { cap: 43000, rate: 0.059 },
      { cap: 161550, rate: 0.0621 },
      { cap: 323200, rate: 0.0649 },
      { cap: 2155350, rate: 0.0685 },
      { cap: Infinity, rate: 0.109 }
    ];
  
    const nycBrackets = [
      { cap: 21600, rate: 0.03078 },
      { cap: 45000, rate: 0.03762 },
      { cap: 90000, rate: 0.03819 },
      { cap: Infinity, rate: 0.03876 }
    ];
  
    const calculateBracketTax = (income, brackets) => {
      let tax = 0;
      let prevCap = 0;
      for (let { cap, rate } of brackets) {
        if (income > cap) {
          tax += (cap - prevCap) * rate;
          prevCap = cap;
        } else {
          tax += (income - prevCap) * rate;
          break;
        }
      }
      return tax;
    };
  
    const fica = 0.0765 * Math.min(income, 168600); // SS + Medicare up to wage cap
  
    const federal = calculateBracketTax(income, federalBrackets);
    const state = calculateBracketTax(income, nyBrackets);
    const city = calculateBracketTax(income, nycBrackets);
  
    return federal + state + city + fica;
  }
  
  function runCalculator({ workingIncome, sahpIncome, kids, childcarePerKid }) {
    const currentTax = calculateTaxesNYC(workingIncome);
    const currentTakeHome = workingIncome - currentTax;
  
    const combinedIncome = workingIncome + sahpIncome;
    const newTax = calculateTaxesNYC(combinedIncome);
    const newTakeHome = combinedIncome - newTax;
  
    const childcareCost = kids * childcarePerKid;
  
    const delta = newTakeHome - (currentTakeHome + childcareCost);
  
    return {
      currentTakeHome,
      newTakeHome,
      childcareCost,
      delta,
    };
  }
  
  // attach to form
  window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("calc-form");
    const result = document.getElementById("calc-result");
  
    form.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const workingIncome = parseFloat(form.workingIncome.value);
      const sahpIncome = parseFloat(form.sahpIncome.value);
      const kids = parseInt(form.kids.value);
      const childcarePerKid = parseFloat(form.childcarePerKid.value);
  
      const output = runCalculator({ workingIncome, sahpIncome, kids, childcarePerKid });
  
      result.innerHTML = `
        <p>Current Take-Home: $${output.currentTakeHome.toFixed(2)}</p>
        <p>New Take-Home (with both incomes): $${output.newTakeHome.toFixed(2)}</p>
        <p>Childcare Cost: $${output.childcareCost.toFixed(2)}</p>
        <p><strong>${output.delta >= 0 ? "Surplus" : "Deficit"} from SAHP Working: $${output.delta.toFixed(2)}</strong></p>
      `;
    });
  });
  
  // export for testing or web integration
  window.ChildcareCalc = { runCalculator };
  