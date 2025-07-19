// childcare_calculator.js
// rough web calculator for evaluating if SAHP returning to work is net positive

function calculateTaxesNYC(income, childTaxCredit = 0) {
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
  
    const fica = 0.0765 * Math.min(income, 168600);
    const federal = calculateBracketTax(income, federalBrackets) - childTaxCredit;
    const state = calculateBracketTax(income, nyBrackets);
    const city = calculateBracketTax(income, nycBrackets);
  
    return Math.max(0, federal + state + city + fica);
  }
  
  function runCalculator({ workingIncome, sahpIncome, childcareCosts, useFSA = false }) {
    const numKids = childcareCosts.length;
    const childTaxCredit = Math.min(numKids * 2000, 4000); // conservative simplification
  
    let adjustedChildcareCosts = [...childcareCosts];
    let fsaUsed = 0;
    if (useFSA) {
      let fsaRemaining = 5000;
      adjustedChildcareCosts = adjustedChildcareCosts.map(cost => {
        const applied = Math.min(cost, fsaRemaining);
        fsaRemaining -= applied;
        fsaUsed += applied;
        return cost - applied;
      });
    }
  
    const currentTax = calculateTaxesNYC(workingIncome, childTaxCredit);
    const currentTakeHome = workingIncome - currentTax;
  
    const combinedIncome = workingIncome + sahpIncome;
    const newTax = calculateTaxesNYC(combinedIncome, childTaxCredit);
    const newTakeHome = combinedIncome - newTax;
  
    const childcareCost = adjustedChildcareCosts.reduce((sum, amt) => sum + amt, 0);
  
    const delta = newTakeHome - (currentTakeHome + childcareCost);
  
    const breakEvenIncome = (() => {
      let low = 0, high = 300000;
      for (let i = 0; i < 20; i++) {
        const mid = (low + high) / 2;
        const midCombined = workingIncome + mid;
        const midTax = calculateTaxesNYC(midCombined, childTaxCredit);
        const midTakeHome = midCombined - midTax;
        const netDelta = midTakeHome - (currentTakeHome + childcareCost);
        if (Math.abs(netDelta) < 1) return mid;
        if (netDelta > 0) high = mid;
        else low = mid;
      }
      return (low + high) / 2;
    })();
  
    return {
      currentTakeHome,
      newTakeHome,
      childcareCost,
      delta,
      breakEvenIncome,
      childTaxCredit,
      fsaUsed
    };
  }
  
  // attach to form
  window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("calc-form");
    const result = document.getElementById("calc-result");
    const childcareList = document.getElementById("childcare-list");
    const addKidBtn = document.getElementById("add-kid");
  
    addKidBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const wrapper = document.createElement("div");
      wrapper.className = "childcare-wrapper";
  
      const input = document.createElement("input");
      input.type = "number";
      input.placeholder = "Childcare Cost (annual)";
      input.classList.add("childcare-entry");
  
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.type = "button";
      removeBtn.addEventListener("click", () => {
        childcareList.removeChild(wrapper);
      });
  
      wrapper.appendChild(input);
      wrapper.appendChild(removeBtn);
      childcareList.appendChild(wrapper);
    });
  
    form.addEventListener("submit", (e) => {
      e.preventDefault();
  
      const workingIncome = parseFloat(form.workingIncome.value);
      const sahpIncome = parseFloat(form.sahpIncome.value);
      const childcareInputs = form.querySelectorAll(".childcare-entry");
      const childcareCosts = Array.from(childcareInputs).map(inp => parseFloat(inp.value) || 0);
      const useFSA = form.useFSA?.checked || false;
  
      const output = runCalculator({ workingIncome, sahpIncome, childcareCosts, useFSA });
  
      result.style.display = "block";
      result.innerHTML = `
        <p>Current Take-Home: $${output.currentTakeHome.toFixed(2)}</p>
        <p>New Take-Home (with both incomes): $${output.newTakeHome.toFixed(2)}</p>
        <p>Childcare Cost: $${output.childcareCost.toFixed(2)}</p>
        <p><strong>${output.delta >= 0 ? "Surplus" : "Deficit"} from SAHP Working: $${output.delta.toFixed(2)}</strong></p>
        ${output.delta < 0 ? `<p><em>Break-even SAHP salary to cover childcare: $${output.breakEvenIncome.toFixed(2)}</em></p>` : ""}
        <p>Child Tax Credit Applied: $${output.childTaxCredit.toFixed(2)}</p>
        ${output.fsaUsed > 0 ? `<p>Pre-tax FSA Savings Applied: $${output.fsaUsed.toFixed(2)}</p>` : ""}
      `;
    });
  });
  
  // export for testing or web integration
  window.ChildcareCalc = { runCalculator };
  